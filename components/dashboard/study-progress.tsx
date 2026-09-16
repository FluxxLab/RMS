import { Meter } from "@/components/fluent";

/*
 * Recruitment against capacity, one row per study.
 *
 * It replaces a donut of booking share, which answered the wrong question. A
 * share chart tells you how the lab's bookings divide between studies — useful
 * across a whole lab, useless to someone responsible for one, where it reads
 * "1 · 100%" and says nothing. What a researcher needs is how full each of
 * their own studies is, which is a ratio against a limit, and a ratio against a
 * limit is a meter rather than a slice of a pie.
 *
 * One hue, not a palette: every bar measures the same quantity, so colour would
 * be decoration. Rows carry their own labels, so there is no legend to read
 * against — identity is never left to colour alone.
 */

export interface StudyProgressRow {
  studyId: string;
  irbCode: string;
  title: string;
  status: string;
  seatsBooked: number;
  seatsTotal: number;
  openSlots: number;
}

function pct(booked: number, total: number): number {
  return total === 0 ? 0 : Math.round((booked / total) * 100);
}

export function StudyProgress({
  studies,
  emptyHint,
}: {
  studies: StudyProgressRow[];
  emptyHint: string;
}) {
  // Fullest first: the study closest to its target is the one to stop
  // recruiting for, and the emptiest is the one needing attention.
  const ranked = [...studies].sort(
    (a, b) => pct(b.seatsBooked, b.seatsTotal) - pct(a.seatsBooked, a.seatsTotal),
  );

  return (
    <section
      aria-label="Recruitment by study"
      className="rounded-2xl bg-bg-1 p-6 shadow-[6px_6px_54px_rgba(0,0,0,0.05)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[24px] font-semibold leading-[32px] text-[#202224]">Recruitment by study</h2>
        <p className="rounded-[4px] border-[0.6px] border-[#d5d5d5] bg-[#fcfdfd] px-3 py-1.5 text-[12px] leading-[16px] text-[rgba(43,48,52,0.72)]">
          {ranked.length} {ranked.length === 1 ? "study" : "studies"}
        </p>
      </div>

      {ranked.length === 0 ? (
        <p className="mt-5 text-[16px] leading-[22px] text-fg-2">{emptyHint}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-5">
          {ranked.map((study) => {
            const filled = pct(study.seatsBooked, study.seatsTotal);
            return (
              <li key={study.studyId} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] leading-[22px] text-fg-1">{study.title}</span>
                    <span className="type-caption text-fg-3">
                      {study.irbCode} · {study.status}
                    </span>
                  </span>

                  {/* Direct-labelled, so the bar never has to be measured by eye. */}
                  <span className="shrink-0 text-right">
                    <span className="block text-[16px] leading-[22px] tabular-nums text-fg-1">
                      {study.seatsBooked} of {study.seatsTotal} seats
                    </span>
                    <span className="type-caption tabular-nums text-fg-3">
                      {filled}% · {study.openSlots} {study.openSlots === 1 ? "slot" : "slots"} open
                    </span>
                  </span>
                </div>

                <Meter
                  value={filled}
                  label={`${study.title}: ${study.seatsBooked} of ${study.seatsTotal} seats booked`}
                  className="h-1.5"
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

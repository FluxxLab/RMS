export interface StudyPerformance {
  studyId: string;
  title: string;
  irbCode: string;
  attended: number;
  noShows: number;
}

/*
 * How each study is performing, as one comparable number: of the bookings that
 * resolved, how many turned up.
 *
 * Deliberately one measure in one hue rather than a stack of outcome colours.
 * Attended-green beside no-show-red separates by ΔE 6.6 under deuteranopia —
 * inside the band that is only legal with a second encoding — so the honest
 * form is a single magnitude per study, direct-labelled with the counts it came
 * from. Nothing here is carried by colour alone.
 *
 * Bookings still ahead are excluded on purpose. A study whose sessions have not
 * happened yet has not performed badly; it has not performed at all, and
 * counting its empty seats as failures would punish it for being new.
 */
export function PerformanceChart({ studies }: { studies: StudyPerformance[] }) {
  const measured = studies
    .map((study) => {
      const resolved = study.attended + study.noShows;
      return { ...study, resolved, rate: resolved === 0 ? null : study.attended / resolved };
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));

  const withData = measured.filter((s) => s.rate !== null);

  return (
    <section
      aria-label="Study performance"
      className="rounded-2xl bg-bg-1 p-6 shadow-[6px_6px_54px_rgba(0,0,0,0.05)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="type-caption text-fg-3">Of the bookings that have resolved</p>
          <h2 className="text-[24px] font-semibold leading-[32px] text-[#202224]">Attendance by study</h2>
        </div>
        <p className="rounded-[4px] border-[0.6px] border-[#d5d5d5] bg-[#fcfdfd] px-3 py-1.5 text-[12px] leading-[16px] text-[rgba(43,48,52,0.72)]">
          {withData.length} of {measured.length} measured
        </p>
      </div>

      {measured.length === 0 ? (
        <p className="mt-5 text-[16px] leading-[22px] text-fg-2">No studies yet.</p>
      ) : withData.length === 0 ? (
        <p className="mt-5 text-[16px] leading-[22px] text-fg-2">
          No session has finished yet. A study appears here once someone has either attended or missed one.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {measured.map((study) => {
            const pct = study.rate === null ? 0 : Math.round(study.rate * 100);
            return (
              <li key={study.studyId} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <span className="min-w-0 flex-1 truncate text-[14px] leading-[20px] text-fg-1">
                    {study.title}
                  </span>
                  {/* Direct-labelled, so no bar has to be measured against an axis. */}
                  <span className="shrink-0 tabular-nums text-[14px] leading-[20px] text-fg-1">
                    {study.rate === null ? "—" : `${pct}%`}
                    <span className="ml-2 type-caption text-fg-3">
                      {study.resolved === 0
                        ? "nothing elapsed"
                        : `${study.attended} of ${study.resolved}`}
                    </span>
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-brand-tint" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="sr-only">
                  {study.irbCode}: {study.rate === null ? "no sessions elapsed" : `${pct} per cent attendance`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

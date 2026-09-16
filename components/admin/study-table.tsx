import { Badge, Card, CardHeader, Meter, type BadgeTone } from "@/components/fluent";
import type { Study, StudyLogRow } from "@/lib/api/schemas";
import type { StudyStatus } from "@/lib/types";

const STATUS: Record<StudyStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  ethics_review: { label: "Ethics review", tone: "warning" },
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  completed: { label: "Completed", tone: "brand" },
};

/*
 * Every study in the lab, one row each.
 *
 * The charts above say how the lab is doing; they cannot say which study is
 * doing it. A superadmin is the only person who sees across all of them, so
 * this is the view that belongs to that role — the per-study breakdown a
 * scoped researcher is deliberately not shown.
 *
 * Recruitment is a ratio against a target, so it is a meter rather than a
 * number to compare by eye.
 */
export function StudyTable({ studies, log }: { studies: Study[]; log: StudyLogRow[] }) {
  const byId = new Map(log.map((row) => [row.studyId, row]));

  const rows = studies
    .map((study) => {
      const counts = byId.get(study.id);
      const booked = counts?.seatsBooked ?? 0;
      const offered = counts?.seatsTotal ?? 0;
      return {
        study,
        sessions: counts?.totalSlots ?? 0,
        open: counts?.openSlots ?? 0,
        booked,
        offered,
        filled: offered === 0 ? 0 : Math.round((booked / offered) * 100),
      };
    })
    // Busiest first: the study with people in it is the one being run.
    .sort((a, b) => b.booked - a.booked);

  return (
    <Card padding="none">
      <CardHeader
        title="Studies"
        description="Every study in the lab, with its own sessions and recruitment"
        className="px-4 pb-4 pt-5"
      />

      {rows.length === 0 ? (
        <p className="border-t border-stroke-2 px-4 py-8 text-[16px] leading-[22px] text-fg-2">
          No studies yet.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-stroke-2">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-stroke-2 text-[12px] leading-[16px] text-field-label">
                <th className="px-4 py-3 font-normal">Study</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal tabular-nums">Sessions</th>
                <th className="px-4 py-3 font-normal tabular-nums">Open</th>
                <th className="w-[220px] px-4 py-3 font-normal">Recruitment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ study, sessions, open, booked, offered, filled }) => (
                <tr key={study.id} className="border-b border-stroke-3 last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="block text-[14px] leading-[20px] text-fg-1">{study.title}</span>
                    <span className="type-caption text-fg-3">{study.irbCode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS[study.status].tone} size="sm">
                      {STATUS[study.status].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[14px] leading-[20px] text-fg-1">{sessions}</td>
                  <td className="px-4 py-3 tabular-nums text-[14px] leading-[20px] text-field-label">{open}</td>
                  <td className="px-4 py-3">
                    <span className="block text-[14px] leading-[20px] tabular-nums text-fg-1">
                      {booked} of {offered} places
                    </span>
                    <Meter value={filled} label={`${study.title}: ${filled}% recruited`} className="mt-1.5 h-1.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

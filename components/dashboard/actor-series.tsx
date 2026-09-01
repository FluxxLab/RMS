import type { StackSeries } from "@/components/dashboard/stacked-bar-chart";
import type { ActorRole, AuditDayBucket } from "@/lib/dashboard";

/**
 * The audit log's roles, each with a fixed place on the ramp.
 *
 * The fill belongs to the role, not to its position in the chart, so a role
 * with nothing to show can be left out without repainting the others.
 */
export const ACTOR_SERIES: (StackSeries & { key: ActorRole })[] = [
  { key: "participant", label: "Participant", fill: "bg-series-1" },
  { key: "research_assistant", label: "Research assistant", fill: "bg-series-2" },
  { key: "principal_investigator", label: "Principal investigator", fill: "bg-series-3" },
  { key: "super_admin", label: "Superadmin", fill: "bg-series-4" },
  { key: "other", label: "Other", fill: "bg-series-5" },
];

/** Only the roles that actually appear, so the legend has no permanent zeroes. */
export function activeSeries(days: AuditDayBucket[]): StackSeries[] {
  return ACTOR_SERIES.filter((s) => days.some((d) => d.counts[s.key] > 0));
}

import { ACTOR_ROLES, actorRole, type ActorRole } from "./audit";
import { isSameDay } from "./format";
import { freePlaces, type SlotRow } from "./slots";

/* Operations dashboard figures.
 *
 * The engine reports the headline counts — open slots, pending check-ins,
 * attendance — and they are used as reported, never recomputed here. What this
 * file derives is only what a total cannot say: how a figure is distributed
 * across today, across a study, or across a day of the audit log. */

/** The headline counts, exactly as the operations endpoint reports them. */
export interface ReportedKpis {
  openSlots: number;
  totalSchedules: number;
  pendingCheckIns: number;
  /** 0–1, or null before any session has elapsed. */
  attendanceRate: number | null;
  attendedCount: number;
  interestLeads: number;
}

export interface Kpis extends ReportedKpis {
  /** Sessions scheduled for today, cancelled ones excluded. */
  sessionsToday: number;
  /** Places still free across the slots the engine counts as open. */
  openPlaces: number;
  upcomingSchedules: number;
  interestLeadsToday: number;
}

export function dashboardKpis(
  reported: ReportedKpis,
  slots: SlotRow[],
  leads: { updatedAt: string }[],
  now: string,
): Kpis {
  const live = slots.filter((s) => s.status !== "cancelled");

  return {
    ...reported,
    sessionsToday: live.filter((s) => isSameDay(s.start, now)).length,
    openPlaces: live.filter((s) => s.status === "available").reduce((sum, s) => sum + freePlaces(s), 0),
    upcomingSchedules: live.filter((s) => s.start > now).length,
    interestLeadsToday: leads.filter((lead) => isSameDay(lead.updatedAt, now)).length,
  };
}

/** Today's sessions in the order they run. */
export function todaySessions(slots: SlotRow[], now: string): SlotRow[] {
  return slots.filter((s) => isSameDay(s.start, now)).sort((a, b) => a.start.localeCompare(b.start));
}

/* ---------- audit activity ---------- */

export interface AuditDayBucket {
  /** ISO date the entries fall on. */
  date: string;
  counts: Record<ActorRole, number>;
  total: number;
}

/**
 * Audit entries grouped by day and by the role that acted, oldest first. The
 * split is read from the data — the log records who acted — never inferred
 * from what the action was.
 */
export function auditByDay(entries: { at: string; actorRole: string }[]): AuditDayBucket[] {
  const byDay = new Map<string, AuditDayBucket>();

  for (const entry of entries) {
    const date = entry.at.slice(0, 10);
    const bucket =
      byDay.get(date) ??
      { date, counts: { participant: 0, research_assistant: 0, principal_investigator: 0, super_admin: 0, other: 0 }, total: 0 };
    bucket.counts[actorRole(entry.actorRole)] += 1;
    bucket.total += 1;
    byDay.set(date, bucket);
  }

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export { ACTOR_ROLES, type ActorRole };

/* ---------- capacity ---------- */

export interface UtilisationPoint {
  /** Day the sessions fall on, as an ISO date. */
  date: string;
  taken: number;
  capacity: number;
  /** taken ÷ capacity, 0–100. */
  pct: number;
}

/**
 * Capacity utilisation per day: how full the lab's sessions were, or are set to
 * be. A cancelled session offers no places, so it is left out entirely.
 */
export function utilisationSeries(slots: SlotRow[]): UtilisationPoint[] {
  const byDay = new Map<string, { taken: number; capacity: number }>();

  for (const slot of slots) {
    if (slot.status === "cancelled") continue;
    const day = slot.start.slice(0, 10);
    const entry = byDay.get(day) ?? { taken: 0, capacity: 0 };
    entry.capacity += slot.maxCapacity;
    entry.taken += slot.taken;
    byDay.set(day, entry);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { taken, capacity }]) => ({
      date,
      taken,
      capacity,
      pct: capacity === 0 ? 0 : (taken / capacity) * 100,
    }));
}

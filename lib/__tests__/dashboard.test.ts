import { describe, expect, it } from "vitest";
import { auditByDay, dashboardKpis, todaySessions, utilisationSeries, type ReportedKpis } from "../dashboard";
import type { SlotRow } from "../slots";

const NOW = "2026-08-27T09:30:00";

function slot(over: Partial<SlotRow> & Pick<SlotRow, "id" | "start" | "end">): SlotRow {
  return {
    irbCode: "IRB-2026-001",
    title: "Test study",
    location: "Lab A1",
    maxCapacity: 2,
    taken: 0,
    status: "available",
    ...over,
  };
}

const REPORTED: ReportedKpis = {
  openSlots: 2,
  totalSchedules: 4,
  pendingCheckIns: 1,
  attendanceRate: 0.5,
  attendedCount: 1,
  interestLeads: 3,
};

describe("FR-OPS-010 operations KPIs", () => {
  const slots = [
    // Today, already under way.
    slot({ id: "s1", start: "2026-08-27T08:00:00", end: "2026-08-27T08:30:00", taken: 2, status: "full" }),
    // Today, still to come.
    slot({ id: "s2", start: "2026-08-27T14:00:00", end: "2026-08-27T14:30:00", taken: 1 }),
    // Tomorrow.
    slot({ id: "s3", start: "2026-08-28T10:00:00", end: "2026-08-28T10:30:00" }),
    // Cancelled sessions offer nothing and are counted nowhere.
    slot({ id: "s4", start: "2026-08-28T11:00:00", end: "2026-08-28T11:30:00", status: "cancelled" }),
  ];

  const leads = [{ updatedAt: "2026-08-27T07:00:00" }, { updatedAt: "2026-08-20T07:00:00" }];

  const kpis = dashboardKpis(REPORTED, slots, leads, NOW);

  it("passes the engine's headline counts through unchanged", () => {
    expect(kpis).toMatchObject({
      openSlots: 2,
      totalSchedules: 4,
      pendingCheckIns: 1,
      attendanceRate: 0.5,
      attendedCount: 1,
      interestLeads: 3,
    });
  });

  it("counts today's sessions, excluding cancelled ones", () => {
    expect(kpis.sessionsToday).toBe(2);
  });

  it("counts free places across the sessions the engine calls open", () => {
    // s2 has one of two taken; s3 has both free. s1 is full, s4 cancelled.
    // The date is deliberately not a factor: the engine's open-slot count is not
    // filtered by it either, and the two figures sit side by side on the tile.
    expect(kpis.openPlaces).toBe(3);
  });

  it("counts upcoming sessions, excluding cancelled ones", () => {
    expect(kpis.upcomingSchedules).toBe(2);
  });

  it("counts leads changed today", () => {
    expect(kpis.interestLeadsToday).toBe(1);
  });

  it("reports no attendance rate before a session has elapsed", () => {
    expect(dashboardKpis({ ...REPORTED, attendanceRate: null }, [], [], NOW).attendanceRate).toBeNull();
  });

  it("lists today's sessions in the order they run", () => {
    expect(todaySessions(slots, NOW).map((s) => s.id)).toEqual(["s1", "s2"]);
  });
});

describe("FR-AUD-050 audit activity by day", () => {
  it("groups entries by day and by the role that acted", () => {
    const entries = [
      { at: "2026-08-27T09:00:00Z", actorRole: "participant" },
      { at: "2026-08-27T10:00:00Z", actorRole: "participant" },
      { at: "2026-08-27T11:00:00Z", actorRole: "research_assistant" },
    ];
    expect(auditByDay(entries)).toEqual([
      {
        date: "2026-08-27",
        counts: { participant: 2, research_assistant: 1, principal_investigator: 0, super_admin: 0, other: 0 },
        total: 3,
      },
    ]);
  });

  it("files a role it does not recognise under other, rather than dropping the entry", () => {
    const [day] = auditByDay([{ at: "2026-08-27T09:00:00Z", actorRole: "system" }]);
    expect(day.counts.other).toBe(1);
    expect(day.total).toBe(1);
  });

  it("returns days oldest first and nothing at all for an empty log", () => {
    const entries = [
      { at: "2026-08-28T09:00:00Z", actorRole: "participant" },
      { at: "2026-08-26T09:00:00Z", actorRole: "participant" },
    ];
    expect(auditByDay(entries).map((d) => d.date)).toEqual(["2026-08-26", "2026-08-28"]);
    expect(auditByDay([])).toEqual([]);
  });
});

describe("FR-OPS-040 capacity utilisation", () => {
  it("sums places taken against capacity for each day", () => {
    const points = utilisationSeries([
      slot({ id: "a", start: "2026-08-27T10:00:00", end: "2026-08-27T10:30:00", maxCapacity: 2, taken: 2 }),
      slot({ id: "b", start: "2026-08-27T11:00:00", end: "2026-08-27T11:30:00", maxCapacity: 2, taken: 1 }),
    ]);
    expect(points).toEqual([{ date: "2026-08-27", taken: 3, capacity: 4, pct: 75 }]);
  });

  it("leaves a cancelled session out entirely — it offers no places", () => {
    const points = utilisationSeries([
      slot({ id: "live", start: "2026-08-27T10:00:00", end: "2026-08-27T10:30:00" }),
      slot({ id: "dead", start: "2026-08-29T10:00:00", end: "2026-08-29T10:30:00", status: "cancelled" }),
    ]);
    expect(points.map((p) => p.date)).toEqual(["2026-08-27"]);
  });

  it("returns days oldest first", () => {
    const points = utilisationSeries([
      slot({ id: "later", start: "2026-08-29T10:00:00", end: "2026-08-29T10:30:00" }),
      slot({ id: "earlier", start: "2026-08-27T10:00:00", end: "2026-08-27T10:30:00" }),
    ]);
    expect(points.map((p) => p.date)).toEqual(["2026-08-27", "2026-08-29"]);
  });

  it("reports zero rather than dividing by zero when a day has no capacity", () => {
    const points = utilisationSeries([
      slot({ id: "empty", start: "2026-08-27T10:00:00", end: "2026-08-27T10:30:00", maxCapacity: 0 }),
    ]);
    expect(points[0].pct).toBe(0);
  });
});

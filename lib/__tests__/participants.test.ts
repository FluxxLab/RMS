import { describe, expect, it } from "vitest";
import {
  buildRegistry,
  filterRegistry,
  registrySummary,
  sortRegistry,
  type RegistryBooking,
  type RegistryInterest,
  type RegistryProfile,
} from "../participants";

const NOW = "2026-08-27T09:30:00";

const PAST = "2026-08-26T10:00:00";
const FUTURE = "2026-08-28T10:00:00";

/** The registry endpoint's own tallies, which the join trusts over recounting. */
const participants: RegistryProfile[] = [
  { pid: "PIC/2026/LABS/A7K2M", bookingCount: 2, attendedCount: 1, noShowCount: 0, joinedAt: "2026-08-20T09:00:00" },
  { pid: "PIC/2026/LABS/B3QXP", bookingCount: 1, attendedCount: 0, noShowCount: 1, joinedAt: "2026-08-21T09:00:00" },
];

const bookings: RegistryBooking[] = [
  { pid: "PIC/2026/LABS/A7K2M", status: "attended", start: PAST, createdAt: "2026-08-22T09:00:00", checkedInAt: "2026-08-26T09:58:00" },
  { pid: "PIC/2026/LABS/A7K2M", status: "booked", start: FUTURE, createdAt: "2026-08-25T09:00:00" },
  { pid: "PIC/2026/LABS/B3QXP", status: "no_show", start: PAST, createdAt: "2026-08-23T09:00:00" },
  // A pseudonym the registry has never seen still belongs in the view.
  { pid: "PIC/2026/LABS/C9HRT", status: "cancelled", start: FUTURE, createdAt: "2026-08-24T09:00:00" },
];

const interests: RegistryInterest[] = [
  { pid: "PIC/2026/LABS/B3QXP", tags: ["energy", "defaults"], createdAt: "2026-08-26T12:00:00" },
  { pid: "PIC/2026/LABS/B3QXP", tags: ["energy"], createdAt: "2026-08-27T08:00:00" },
];

describe("FR-OPS-060 participants registry", () => {
  const registry = buildRegistry(participants, bookings, interests, NOW);
  const byPid = Object.fromEntries(registry.map((r) => [r.pid, r]));

  it("lists booking, attended, no-show and interest counts per pseudonym", () => {
    expect(byPid["PIC/2026/LABS/A7K2M"]).toMatchObject({ bookings: 2, attended: 1, noShows: 0, upcoming: 1, interests: [] });
    expect(byPid["PIC/2026/LABS/B3QXP"]).toMatchObject({ bookings: 1, attended: 0, noShows: 1, upcoming: 0 });
  });

  it("de-duplicates interest tags across submissions", () => {
    expect(byPid["PIC/2026/LABS/B3QXP"].interests).toEqual(["energy", "defaults"]);
  });

  it("includes pseudonyms seen only through bookings, using first activity as join date", () => {
    expect(byPid["PIC/2026/LABS/C9HRT"]).toMatchObject({ joinedAt: "2026-08-24T09:00:00", bookings: 1 });
  });

  it("counts a booking once for a pseudonym the registry already tallies", () => {
    // Two bookings arrive for A7K2M; the registry's own total of 2 must stand.
    expect(byPid["PIC/2026/LABS/A7K2M"].bookings).toBe(2);
  });

  it("tracks last activity from check-in, booking and interest timestamps", () => {
    expect(byPid["PIC/2026/LABS/A7K2M"].lastActivity).toBe("2026-08-26T09:58:00");
    expect(byPid["PIC/2026/LABS/B3QXP"].lastActivity).toBe("2026-08-27T08:00:00");
  });

  it("never carries a name or email field", () => {
    for (const r of registry) {
      expect(r).not.toHaveProperty("name");
      expect(r).not.toHaveProperty("email");
    }
  });

  it("filters by pseudonym fragment or interest tag, case-insensitively", () => {
    expect(filterRegistry(registry, "b3q").map((r) => r.pid)).toEqual(["PIC/2026/LABS/B3QXP"]);
    expect(filterRegistry(registry, "ENERGY").map((r) => r.pid)).toEqual(["PIC/2026/LABS/B3QXP"]);
    expect(filterRegistry(registry, "   ")).toHaveLength(3);
  });

  it("sorts numerically on counts and alphabetically on pseudonym, with a stable tie-break", () => {
    expect(sortRegistry(registry, "bookings", "desc").map((r) => r.pid)[0]).toBe("PIC/2026/LABS/A7K2M");
    expect(sortRegistry(registry, "noShows", "desc").map((r) => r.pid)[0]).toBe("PIC/2026/LABS/B3QXP");
    expect(sortRegistry(registry, "pid", "asc").map((r) => r.pid)).toEqual([
      "PIC/2026/LABS/A7K2M",
      "PIC/2026/LABS/B3QXP",
      "PIC/2026/LABS/C9HRT",
    ]);
  });

  it("FR-ATT-060 summarises registered, upcoming, interests and cumulative no-shows", () => {
    expect(registrySummary(registry)).toEqual({ registered: 3, withUpcoming: 1, withInterests: 1, noShowsTracked: 1 });
  });

  it("leaves a booking with no known session out of the upcoming count", () => {
    const orphan = buildRegistry([], [{ pid: "PIC/2026/LABS/D1ZZZ", status: "booked", createdAt: "2026-08-25T09:00:00" }], [], NOW);
    expect(orphan[0]).toMatchObject({ bookings: 1, upcoming: 0 });
  });
});

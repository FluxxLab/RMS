import type { BookingStatus } from "./types";

/* Participants registry: one line per pseudonym with booking, attendance,
 * no-show and interest counts. Nothing here can carry a name or email — the
 * inputs are pseudonym-keyed by construction. */

/** A participant as the registry endpoint reports them: counts, no profile. */
export interface RegistryProfile {
  pid: string;
  bookingCount: number;
  attendedCount: number;
  noShowCount: number;
  joinedAt: string;
}

/** One reservation, as much of it as the registry needs. */
export interface RegistryBooking {
  pid: string;
  status: BookingStatus;
  createdAt: string;
  checkedInAt?: string | null;
  /** The session's start, where the schedule behind the booking is still known. */
  start?: string;
}

export interface RegistryInterest {
  pid: string;
  tags: string[];
  createdAt: string;
}

export interface RegistryRow {
  pid: string;
  joinedAt: string;
  bookings: number;
  attended: number;
  noShows: number;
  /** Bookings still `booked` for a session that has not started yet. */
  upcoming: number;
  interests: string[];
  /** Most recent booking or interest activity, or null when there is none. */
  lastActivity: string | null;
}

/**
 * Joins the three pseudonym-keyed feeds into one line per participant.
 *
 * Booking, attendance and no-show totals are the counts the registry reports —
 * they are the engine's tally, not something re-derived here. The bookings feed
 * is used only for what a total cannot say: whether a slot is still to come,
 * and when the pseudonym was last active.
 */
export function buildRegistry(
  participants: RegistryProfile[],
  bookings: RegistryBooking[],
  interests: RegistryInterest[],
  now: string,
): RegistryRow[] {
  const byPid = new Map<string, RegistryRow>();

  const ensure = (pid: string, seenAt: string): RegistryRow => {
    let row = byPid.get(pid);
    if (!row) {
      row = { pid, joinedAt: seenAt, bookings: 0, attended: 0, noShows: 0, upcoming: 0, interests: [], lastActivity: null };
      byPid.set(pid, row);
    }
    return row;
  };

  const touch = (row: RegistryRow, at: string) => {
    if (row.lastActivity === null || at > row.lastActivity) row.lastActivity = at;
  };

  for (const p of participants) {
    const row = ensure(p.pid, p.joinedAt);
    row.bookings = p.bookingCount;
    row.attended = p.attendedCount;
    row.noShows = p.noShowCount;
  }

  const profiled = new Set(participants.map((p) => p.pid));

  for (const booking of bookings) {
    // A booking for a pseudonym the registry has not seen is still a participant;
    // its earliest activity stands in for the join date, and it has no totals of
    // its own, so they are counted from what is here.
    const row = ensure(booking.pid, booking.createdAt);
    if (!profiled.has(booking.pid)) {
      row.bookings += 1;
      if (booking.status === "attended") row.attended += 1;
      if (booking.status === "no_show") row.noShows += 1;
    }
    if (booking.status === "booked" && (booking.start ?? "") > now) row.upcoming += 1;
    touch(row, booking.checkedInAt ?? booking.createdAt);
  }

  for (const interest of interests) {
    const row = ensure(interest.pid, interest.createdAt);
    for (const tag of interest.tags) if (!row.interests.includes(tag)) row.interests.push(tag);
    touch(row, interest.createdAt);
  }

  return [...byPid.values()];
}

/* ---------- search ---------- */

export function filterRegistry(rows: RegistryRow[], query: string): RegistryRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) => r.pid.toLowerCase().includes(q) || r.interests.some((t) => t.toLowerCase().includes(q)),
  );
}

/* ---------- sorting ---------- */

export const REGISTRY_SORT_KEYS = [
  "pid",
  "joined",
  "bookings",
  "attended",
  "noShows",
  "interests",
  "lastActivity",
] as const;

export type RegistrySort = (typeof REGISTRY_SORT_KEYS)[number];
export type SortDir = "asc" | "desc";

export function isRegistrySort(value: unknown): value is RegistrySort {
  return typeof value === "string" && (REGISTRY_SORT_KEYS as readonly string[]).includes(value);
}

export function sortRegistry(rows: RegistryRow[], key: RegistrySort, dir: SortDir): RegistryRow[] {
  const sign = dir === "asc" ? 1 : -1;
  const value = (r: RegistryRow): string | number => {
    switch (key) {
      case "pid":
        return r.pid;
      case "joined":
        return r.joinedAt;
      case "bookings":
        return r.bookings;
      case "attended":
        return r.attended;
      case "noShows":
        return r.noShows;
      case "interests":
        return r.interests.length;
      case "lastActivity":
        return r.lastActivity ?? "";
    }
  };
  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    // Stable secondary order so equal values do not shuffle between renders.
    return cmp !== 0 ? cmp * sign : a.pid.localeCompare(b.pid);
  });
}

/* ---------- summary tiles ---------- */

export interface RegistrySummary {
  registered: number;
  withUpcoming: number;
  withInterests: number;
  noShowsTracked: number;
}

export function registrySummary(rows: RegistryRow[]): RegistrySummary {
  return {
    registered: rows.length,
    withUpcoming: rows.filter((r) => r.upcoming > 0).length,
    withInterests: rows.filter((r) => r.interests.length > 0).length,
    noShowsTracked: rows.reduce((sum, r) => sum + r.noShows, 0),
  };
}

/** Rows per page across the console. */
export const PAGE_SIZE = 5;

export interface Page<T> {
  rows: T[];
  /** 1-based, clamped into range. */
  page: number;
  pageCount: number;
  /** 1-based inclusive range being shown; both 0 when there is nothing. */
  from: number;
  to: number;
  total: number;
}

/** Slices rows for a page, clamping a page number that is out of range. */
export function paginate<T>(rows: T[], page: number, size: number = PAGE_SIZE): Page<T> {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  const start = (current - 1) * size;
  return {
    rows: rows.slice(start, start + size),
    page: current,
    pageCount,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + size, total),
    total,
  };
}

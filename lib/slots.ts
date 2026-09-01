import type { ScheduleStatus } from "./types";

/**
 * When a session runs and how full it is.
 *
 * The API reports `bookedCount`; everything here calls it `taken`, because
 * that is what it means on screen: places consumed, a cancelled booking having
 * already released its own.
 */
export interface SessionRow {
  id: string;
  start: string;
  end: string;
  location: string;
  maxCapacity: number;
  taken: number;
  status: ScheduleStatus;
}

/**
 * A session in a view that mixes studies, so it has to say which one it is.
 * A study's own page already knows, and its feed leaves these out.
 */
export interface SlotRow extends SessionRow {
  irbCode: string;
  title: string;
}

/** A session as the API sends it, before `bookedCount` is renamed. */
export type ApiSession = Omit<SessionRow, "taken"> & { bookedCount: number };
export type ApiSlot = Omit<SlotRow, "taken"> & { bookedCount: number };

export function toSessionRow({ bookedCount, ...session }: ApiSession): SessionRow {
  return { ...session, taken: bookedCount };
}

export function toSlotRow({ bookedCount, ...slot }: ApiSlot): SlotRow {
  return { ...slot, taken: bookedCount };
}

/** Places still free on a session; a cancelled one offers none. */
export function freePlaces(session: SessionRow): number {
  return session.status === "cancelled" ? 0 : Math.max(0, session.maxCapacity - session.taken);
}

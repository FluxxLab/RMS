import type { ApiFailure, EngineCode } from "./api/client";

/*
 * The booking engine's result codes, in the wording participants read.
 *
 * One map, so a rejection reads the same wherever it is shown. The engine
 * decides which code applies; this file only decides how that code is spoken.
 */

export const ENGINE_MESSAGES: Record<EngineCode, string> = {
  not_found: "That session is no longer listed.",
  cancelled: "That session has been cancelled.",
  full: "That slot just filled: please choose another time.",
  duplicate: "You already hold a booking for this session.",
  criteria_not_confirmed: "You must confirm each eligibility statement before booking.",
  ineligible: "You are not eligible for this session.",
  locked: "Someone is booking this slot right now: try again in a moment.",
};

export interface Rejection {
  message: string;
  /** The specific failing rules, where the engine named them. */
  reasons: string[];
}

/**
 * What to show a participant when a booking is refused.
 *
 * A code the engine named wins over the raw message, so the copy stays the
 * approved wording rather than whatever an error body happened to contain.
 * Where the engine listed the failing rules, they are carried through
 * untouched — they are the reason, and paraphrasing them would change it.
 */
export function rejectionFor(error: ApiFailure): Rejection {
  if (error.kind === "conflict" || error.kind === "invalid") {
    return {
      message: error.code ? ENGINE_MESSAGES[error.code] : error.message,
      reasons: error.reasons ?? [],
    };
  }

  if (error.kind === "unauthorised") return { message: "Sign in to book a session.", reasons: [] };
  if (error.kind === "forbidden") return { message: "This account cannot book sessions.", reasons: [] };
  if (error.kind === "not_found") return { message: ENGINE_MESSAGES.not_found, reasons: [] };
  if (error.kind === "server") return { message: "The booking system could not complete that. Check your bookings before trying again.", reasons: [] };
  if (error.kind === "unreachable") return { message: "We could not reach the booking system. Try again in a moment.", reasons: [] };

  return { message: "Something went wrong with that booking. Try again in a moment.", reasons: [] };
}

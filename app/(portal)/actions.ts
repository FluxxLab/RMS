"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import * as api from "@/lib/api";
import { SESSION_COOKIE, apiMessage, isParticipant, readSession, type ApiResult } from "@/lib/api";
import { rejectionFor, type Rejection } from "@/lib/engine-messages";
import { profileSubmissionSchema, screeningSubmissionSchema, toProfile } from "@/lib/screening-schema";

/*
 * Portal mutations. Every one calls the engine with the caller's session; none
 * of them decides whether an action is allowed. Contact details appear in one
 * place only — registration — and are forwarded straight to the vault write
 * without being kept, logged or returned.
 */

/** Surfaces a booking changes. The staff console reads the same records. */
const BOOKING_SURFACES = ["/", "/bookings", "/staff/slots", "/staff/bookings", "/staff/dashboard"];

export interface BookingOutcome extends Rejection {
  ok: boolean;
}

function outcome(result: ApiResult<unknown>, done: string, surfaces: string[]): BookingOutcome {
  if (!result.ok) return { ok: false, ...rejectionFor(result.error) };
  for (const path of surfaces) revalidatePath(path);
  return { ok: true, message: done, reasons: [] };
}

export async function reserveSlot(
  scheduleId: string,
  confirmedCriteria: string[],
  idempotencyKey: string,
): Promise<BookingOutcome> {
  return outcome(
    await api.reserveSlot(scheduleId, confirmedCriteria, idempotencyKey),
    "Slot booked. See you soon.",
    BOOKING_SURFACES,
  );
}

/**
 * Moves an existing booking to another session of the same study.
 *
 * The engine takes the new seat before it releases the old one, so a refusal
 * leaves the original booking untouched — which is why this can be offered
 * without a "you may lose your place" warning.
 */
export async function rescheduleBooking(bookingId: string, scheduleId: string): Promise<BookingOutcome> {
  return outcome(
    await api.rescheduleBooking(bookingId, scheduleId),
    "Booking moved. Your previous place has been released.",
    BOOKING_SURFACES,
  );
}

export async function cancelBooking(bookingId: string): Promise<BookingOutcome> {
  return outcome(
    await api.cancelBooking(bookingId),
    "Booking cancelled. The place has been released.",
    BOOKING_SURFACES,
  );
}


export type RegistrationOutcome = { ok: true; pid: string } | { ok: false; message: string };

const INVALID = "Some answers are missing or invalid. Please check each step and try again.";

/** Writes the screening answers and the interests behind the current session. */
async function storeAnswers(profile: Record<string, unknown>): Promise<string | null> {
  const saved = await api.saveProfile(profile);
  if (!saved.ok) return apiMessage(saved.error);

  return null;
}

/**
 * Screening answers, for someone who is already registered.
 *
 * There is no contact step here: an update changes what the study rules are
 * checked against, and never reopens the vault.
 */
export async function updateScreening(input: unknown): Promise<RegistrationOutcome> {
  const session = await readSession();
  if (!isParticipant(session)) return { ok: false, message: "Sign in to update your profile." };

  const parsed = profileSubmissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: INVALID };

  const failure = await storeAnswers(toProfile(parsed.data));
  if (failure !== null) return { ok: false, message: failure };

  revalidatePath("/", "layout");
  return { ok: true, pid: session!.subject };
}

/**
 * Registration and screening in one step, as the wizard presents it.
 *
 * The three identifying fields go to the vault through the registration call
 * and are not touched again. The session that call earns is what carries the
 * screening answers, so the profile is written against the pseudonym only.
 */
export async function saveScreening(input: unknown): Promise<RegistrationOutcome> {
  const parsed = screeningSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: INVALID };
  }

  const { fullName, email, password, phone, nin, addressLine, ...rest } = parsed.data;

  /*
   * The vault write. `rest` carries the screening answers and deliberately no
   * longer holds these: a NIN, a phone number or an address beside the
   * pseudonymous profile is exactly what the database validators refuse.
   */
  const registration = await api.registerParticipant({
    fullName,
    email,
    password,
    phone: phone || undefined,
    nin: nin || undefined,
    addressLine: addressLine || undefined,
  });
  if (!registration.ok) return { ok: false, message: apiMessage(registration.error) };

  const session = await api.participantLogin(email, password);
  if (!session.ok) return { ok: false, message: apiMessage(session.error) };

  const store = await cookies();
  store.set(SESSION_COOKIE, session.data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.data.maxAge,
  });

  // The contact fields stop here: they went to the vault above and have no
  // place in the profile the pseudonym carries.
  const failure = await storeAnswers(toProfile(rest));
  if (failure !== null) return { ok: false, message: failure };

  revalidatePath("/", "layout");
  return { ok: true, pid: registration.data.pid };
}

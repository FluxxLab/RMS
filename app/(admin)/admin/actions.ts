"use server";

import { revalidatePath } from "next/cache";
import * as api from "@/lib/api";
import { apiMessage, type ApiResult } from "@/lib/api";
import { createStudySchema } from "@/lib/study-schema";
import type { BookingStatus, StaffRole, StudyStatus } from "@/lib/types";

/*
 * Superadmin writes. The engine decides whether each one is allowed; these
 * only carry the request and report the verdict, then refresh the surfaces the
 * change is actually visible on — refreshing more than that makes every write
 * wait on pages nothing has changed.
 */

export interface AdminResult {
  ok: boolean;
  message: string;
}

/**
 * Turns an API answer into the sentence the panel shows.
 *
 * A refusal keeps the engine's own wording — it is the authority on why an
 * operation was not allowed, and paraphrasing it here would be a second,
 * competing account of the rules.
 */
function settle(result: ApiResult<unknown>, done: string, affected: string[]): AdminResult {
  if (!result.ok) return { ok: false, message: apiMessage(result.error) };
  for (const path of affected) revalidatePath(path);
  return { ok: true, message: done };
}

export interface CreateStudyResult extends AdminResult {
  /** Field-level messages, keyed by the input that produced them. */
  errors?: Record<string, string>;
}

/**
 * Authors a study. It is created in draft: the lifecycle is a separate
 * decision, and the engine refuses a transition it does not allow.
 */
export async function createStudy(input: unknown): Promise<CreateStudyResult> {
  const parsed = createStudySchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { ok: false, message: "Check the fields below.", errors };
  }

  return settle(await api.createStudy(parsed.data), `${parsed.data.irbCode} created as a draft.`, [
    "/admin/studies",
    "/admin",
    "/admin/schedules",
    "/staff/studies",
  ]);
}

export async function changeStudyStatus(studyId: string, next: StudyStatus): Promise<AdminResult> {
  return settle(await api.setStudyStatus(studyId, next), "Study status updated.", [
    "/admin/studies",
    "/admin",
    "/staff/studies",
    "/staff/dashboard",
    "/",
  ]);
}

/** Everything that shows a session, so a change to one is not stale anywhere. */
const SCHEDULE_VIEWS = [
  "/admin/schedules",
  "/admin",
  "/staff/slots",
  "/staff/bookings",
  "/staff/dashboard",
  "/",
];

export async function createSession(input: api.SessionInput): Promise<AdminResult> {
  return settle(await api.createSchedule(input), "Session added.", SCHEDULE_VIEWS);
}

/**
 * Only what changed is sent, and the caller decides what that is: a start on
 * its own means "move it and keep its length", which is not the same request
 * as a start and an unchanged end.
 */
export async function editSession(
  scheduleId: string,
  changes: Partial<Omit<api.SessionInput, "studyId">>,
): Promise<AdminResult> {
  if (Object.keys(changes).length === 0) return { ok: true, message: "Nothing changed." };

  return settle(await api.updateSchedule(scheduleId, changes), "Session updated.", SCHEDULE_VIEWS);
}

/**
 * The API refuses this for any session someone has ever booked, and says to
 * cancel instead. That refusal is the message the operator sees — it is more
 * use than anything this layer could substitute for it.
 */
export async function deleteSession(scheduleId: string): Promise<AdminResult> {
  return settle(await api.deleteSchedule(scheduleId), "Session deleted.", SCHEDULE_VIEWS);
}

export async function cancelSession(scheduleId: string): Promise<AdminResult> {
  return settle(await api.cancelSchedule(scheduleId), "Session cancelled and its places released.", [
    "/admin/schedules",
    "/admin",
    "/staff/slots",
    "/staff/bookings",
    "/staff/dashboard",
    "/",
  ]);
}

export async function setBookingStatus(bookingId: string, next: BookingStatus): Promise<AdminResult> {
  const result =
    next === "attended"
      ? await api.checkInBooking(bookingId)
      : next === "no_show"
        ? await api.markNoShow(bookingId)
        : await api.overrideBooking(bookingId, next);

  return settle(result, "Booking updated.", ["/staff/bookings", "/staff/dashboard", "/staff/participants", "/admin"]);
}


export async function invite(
  fullName: string,
  email: string,
  password: string,
  role: StaffRole,
): Promise<AdminResult> {
  return settle(await api.inviteStaff({ fullName, email, password, role }), `${fullName} can now sign in.`, [
    "/admin/staff",
    "/admin",
  ]);
}

export async function changeRole(userId: string, role: StaffRole): Promise<AdminResult> {
  return settle(await api.setStaffRole(userId, role), "Role updated.", ["/admin/staff"]);
}

export async function revoke(userId: string): Promise<AdminResult> {
  return settle(await api.revokeStaff(userId), "Access revoked. The account is kept so the audit trail resolves.", [
    "/admin/staff",
    "/admin",
  ]);
}

export async function createSessions(input: api.BulkScheduleInput): Promise<AdminResult> {
  const result = await api.bulkCreateSchedules(input);
  if (!result.ok) return { ok: false, message: apiMessage(result.error) };

  const { created, skipped } = result.data;
  const sessions = (n: number) => `${n} ${n === 1 ? "session" : "sessions"}`;

  // A skipped slot is not a failure: one was already on the calendar at that
  // time, and saying so is more use than a bare count of what went in.
  const message =
    created === 0
      ? `Nothing to add — ${sessions(skipped)} already on the calendar at those times.`
      : skipped === 0
        ? `${sessions(created)} generated.`
        : `${sessions(created)} generated. ${skipped} skipped, already on the calendar.`;

  return settle(result, message, ["/admin/schedules", "/admin", "/staff/slots", "/staff/dashboard", "/"]);
}

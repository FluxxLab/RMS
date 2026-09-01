import "server-only";

import { z } from "zod";

import { apiRequest, authenticate, type ApiResult } from "./client";
import * as S from "./schemas";

/*
 * One function per endpoint this app uses. Components depend on these, never
 * on a URL, so a route change is a one-line edit here.
 */

/* ---------- Researcher console ---------- */

export function getDashboard(): Promise<ApiResult<S.DashboardKpis>> {
  return apiRequest("/ops/dashboard", S.DashboardKpis);
}

export function getStudyLog(): Promise<ApiResult<S.StudyLogRow[]>> {
  return apiRequest("/ops/study-log", S.StudyLog);
}

export async function getSlots(): Promise<ApiResult<S.Slot[]>> {
  const result = await apiRequest("/ops/slots", S.SlotLedger);
  return result.ok ? { ok: true, data: result.data.slots } : result;
}

export async function getBookings(params: { status?: string; studyId?: string } = {}): Promise<ApiResult<S.LedgerBooking[]>> {
  const result = await apiRequest("/ops/bookings", S.BookingsLedger, { query: params });
  return result.ok ? { ok: true, data: result.data.bookings } : result;
}

export async function getParticipants(): Promise<ApiResult<S.RegistryParticipant[]>> {
  const result = await apiRequest("/ops/participants", S.ParticipantRegistry);
  return result.ok ? { ok: true, data: result.data.participants } : result;
}

/* ---------- Studies ---------- */

/**
 * The studies a participant may see: the ones recruiting now. Public, and the
 * portal's only source — a draft is not something to offer anybody.
 */
export function getStudies(): Promise<ApiResult<S.Study[]>> {
  return apiRequest("/studies", S.Studies);
}

/**
 * Every study in the pipeline, whatever its status. Staff-only, and what the
 * console and superadmin read: a draft has to be visible to be moved on.
 */
export function getPipelineStudies(): Promise<ApiResult<S.Study[]>> {
  return apiRequest("/ops/studies", S.Studies);
}

/* ---------- Interests ---------- */

export async function getTaxonomy(): Promise<ApiResult<S.TaxonomyTag[]>> {
  const result = await apiRequest("/taxonomy", S.Taxonomy);
  return result.ok ? { ok: true, data: result.data.tags } : result;
}

export async function getInterestLeads(tag?: string): Promise<ApiResult<S.InterestLead[]>> {
  const result = await apiRequest("/interests/leads", S.InterestLeads, { query: { tag } });
  return result.ok ? { ok: true, data: result.data.leads } : result;
}

/* ---------- Staff and audit ---------- */

export async function getStaff(): Promise<ApiResult<S.StaffUser[]>> {
  const result = await apiRequest("/users", S.StaffDirectory);
  return result.ok ? { ok: true, data: result.data.users } : result;
}

export function getAudit(params: { offset?: number; limit?: number; action?: string } = {}) {
  return apiRequest("/audit", S.AuditPage, { query: params });
}

/** Recent engine calls, newest first. The poll behind the live log. */
export async function getTxLog(): Promise<ApiResult<S.TxLogEntry[]>> {
  const result = await apiRequest("/ops/tx-log", S.TxLog);
  return result.ok ? { ok: true, data: result.data.entries } : result;
}

export function getAdminOverview(): Promise<ApiResult<S.AdminOverview>> {
  return apiRequest("/admin/overview", S.AdminOverview);
}

/* ---------- Participant portal ---------- */

export async function getMyBookings(): Promise<ApiResult<S.MyBooking[]>> {
  const result = await apiRequest("/participants/me/bookings", S.MyBookings);
  return result.ok ? { ok: true, data: result.data.bookings } : result;
}

/**
 * One study in full: protocol, inclusion statements and the engine's own
 * description of who it is for. Answers 404 for a study that is not
 * recruiting, so a caller that may hold a draft has to cope with that.
 */
export function getStudy(studyId: string): Promise<ApiResult<S.StudyDetail>> {
  return apiRequest(`/studies/${studyId}`, S.StudyDetail);
}

export function getMyProfile(): Promise<ApiResult<S.MyProfile>> {
  return apiRequest("/participants/me/profile", S.MyProfile);
}

export async function getMyInterests(): Promise<ApiResult<string[]>> {
  const result = await apiRequest("/participants/me/interests", z.object({ tags: z.array(z.string()) }));
  return result.ok ? { ok: true, data: result.data.tags } : result;
}

export function getScorecard(studyId: string): Promise<ApiResult<S.Scorecard>> {
  return apiRequest(`/studies/${studyId}/eligibility`, S.Scorecard);
}

export async function getBookableSessions(studyId: string): Promise<ApiResult<S.BookableSession[]>> {
  const result = await apiRequest(`/studies/${studyId}/schedules`, S.BookableSessions);
  return result.ok ? { ok: true, data: result.data.schedules } : result;
}

export function registerParticipant(input: { fullName: string; email: string; password: string }) {
  return apiRequest("/participants", S.Registration, { method: "POST", body: input });
}

export function saveProfile(profile: Record<string, unknown>) {
  return apiRequest("/participants/me/profile", z.unknown(), { method: "PUT", body: profile });
}

export function saveInterests(tags: string[]) {
  return apiRequest("/participants/me/interests", z.unknown(), { method: "PUT", body: { tags } });
}

/**
 * Reserves a slot. The statements the participant actually ticked are sent, not
 * a blanket acknowledgement: the engine checks them against the study and
 * answers `criteria_not_confirmed` if any is missing.
 */
export function reserveSlot(scheduleId: string, confirmedCriteria: string[], idempotencyKey: string) {
  return apiRequest("/bookings", z.unknown(), {
    method: "POST",
    body: { scheduleId, confirmedCriteria, idempotencyKey },
  });
}

/**
 * Moves a booking to another session. The engine claims the new seat before
 * it releases the old one, so a refused move leaves the original booking
 * exactly as it was.
 */
export function rescheduleBooking(bookingId: string, scheduleId: string) {
  return apiRequest(`/bookings/${bookingId}/reschedule`, z.unknown(), { method: "POST", body: { scheduleId } });
}

export function cancelBooking(bookingId: string) {
  return apiRequest(`/bookings/${bookingId}/cancel`, z.unknown(), { method: "PATCH" });
}

/* ---------- Writes ----------
 *
 * Every one of these is a decision the engine makes: this app carries the
 * request and reports the answer, and never predicts it. The response body is
 * not validated because nothing here renders it — only whether it succeeded,
 * and the sentence to show if it did not.
 */

const Acknowledged = z.unknown();

export function overrideBooking(bookingId: string, status: string) {
  return apiRequest(`/bookings/${bookingId}/override`, Acknowledged, { method: "PATCH", body: { status } });
}

export function checkInBooking(bookingId: string) {
  return apiRequest(`/bookings/${bookingId}/check-in`, Acknowledged, { method: "PATCH" });
}

export function markNoShow(bookingId: string) {
  return apiRequest(`/bookings/${bookingId}/no-show`, Acknowledged, { method: "PATCH" });
}

export function createStudy(study: unknown) {
  return apiRequest("/studies", Acknowledged, { method: "POST", body: study });
}

export function setStudyStatus(studyId: string, status: string) {
  return apiRequest(`/studies/${studyId}/status`, Acknowledged, { method: "PATCH", body: { status } });
}

export interface BulkScheduleInput {
  studyId: string;
  location: string;
  capacityPerSlot: number;
  daysAhead: number;
  startHour: number;
  slotsPerDay: number;
  slotLengthMinutes: number;
}

/**
 * Generates the grid. The response is validated here, unlike the other writes,
 * because the panel reports what was created and what already existed.
 */
export function bulkCreateSchedules(input: BulkScheduleInput, preview = false): Promise<ApiResult<S.BulkScheduleOutcome>> {
  return apiRequest("/schedules/bulk", S.BulkScheduleOutcome, { method: "POST", body: { ...input, preview } });
}

export function cancelSchedule(scheduleId: string) {
  return apiRequest(`/schedules/${scheduleId}/cancel`, Acknowledged, { method: "POST" });
}

/**
 * Fires six concurrent reservations at one session and reports what the engine
 * did. Anything it books is released again, so the test can be run on a live
 * schedule without eating the lab's capacity.
 */
export function stressTestSlot(scheduleId: string): Promise<ApiResult<S.StressTestResult>> {
  return apiRequest(`/bookings/${scheduleId}/stress-test`, S.StressTestResult, { method: "POST", body: {} });
}

export function addTaxonomyTag(label: string) {
  return apiRequest("/taxonomy", Acknowledged, { method: "POST", body: { label } });
}

/** Retiring hides a term from the portal; leads that already carry it keep it. */
export function retireTaxonomyTag(tagId: string) {
  return apiRequest(`/taxonomy/${tagId}/retire`, Acknowledged, { method: "PATCH" });
}

export interface StaffInvite {
  fullName: string;
  email: string;
  password: string;
  role: string;
}

export function inviteStaff(invite: StaffInvite) {
  return apiRequest("/users", Acknowledged, { method: "POST", body: invite });
}

export function setStaffRole(userId: string, role: string) {
  return apiRequest(`/users/${userId}`, Acknowledged, { method: "PATCH", body: { role } });
}

export function revokeStaff(userId: string) {
  return apiRequest(`/users/${userId}/revoke`, Acknowledged, { method: "PATCH" });
}

/* ---------- Authentication ---------- */

export function adminLogin(email: string, password: string) {
  return authenticate("/auth/admin/login", { email, password });
}

export function participantLogin(email: string, password: string) {
  return authenticate("/auth/participant/login", { email, password });
}

export { pageData } from "./page";
export { isParticipant, readSession, type Session, type SessionRole } from "./session";
export { apiMessage, fetchRaw, openStream, SESSION_COOKIE, type ApiFailure, type ApiResult } from "./client";

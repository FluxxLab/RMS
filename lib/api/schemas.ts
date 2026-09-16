import { z } from "zod";

/*
 * The API's contract, as this app relies on it. Written from the live
 * responses rather than the OpenAPI document, which carries no schemas.
 *
 * Every object is `.strip()`ed by default in zod, so a field the API adds
 * later — an identity field above all — cannot reach a component by accident.
 */

export const StudyStatus = z.enum(["draft", "ethics_review", "active", "paused", "completed"]);
export const BookingStatus = z.enum(["booked", "cancelled", "attended", "no_show"]);
export const ScheduleStatus = z.enum(["available", "full", "cancelled"]);
export const StaffRole = z.enum(["research_assistant", "principal_investigator", "super_admin"]);

/** A timestamp the API transports as UTC ISO-8601. */
const Timestamp = z.string().min(1);

export const DashboardKpis = z.object({
  openSlots: z.number(),
  totalSchedules: z.number(),
  pendingCheckIns: z.number(),
  /** 0–1, or null before any session has elapsed. */
  attendanceRate: z.number().nullable(),
  attendedCount: z.number(),
});
export type DashboardKpis = z.infer<typeof DashboardKpis>;

export const StudyLogRow = z.object({
  studyId: z.string(),
  irbCode: z.string(),
  title: z.string(),
  status: StudyStatus,
  totalSlots: z.number(),
  openSlots: z.number(),
  seatsTotal: z.number(),
  seatsBooked: z.number(),
  maxCap: z.number(),
});
export type StudyLogRow = z.infer<typeof StudyLogRow>;

export const StudyLog = z.array(StudyLogRow);

export const Study = z.object({
  id: z.string(),
  irbCode: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  compensation: z.string(),
  durationMinutes: z.number(),
  location: z.string(),
  tags: z.array(z.string()),
  status: StudyStatus,
  /** Absent on studies created before recruitment existed. */
  sector: z.string().nullish(),
  minExperience: z.string().nullish(),
});
export type Study = z.infer<typeof Study>;

export const Studies = z.array(Study);

export const Slot = z.object({
  id: z.string(),
  irbCode: z.string(),
  title: z.string(),
  start: Timestamp,
  end: Timestamp,
  location: z.string(),
  maxCapacity: z.number(),
  bookedCount: z.number(),
  status: ScheduleStatus,
});
export type Slot = z.infer<typeof Slot>;

export const SlotLedger = z.object({ slots: z.array(Slot) });

/**
 * A reservation as the console sees it. The participant is a pseudonym; the
 * schema has no place for a name or an email, so one cannot arrive.
 *
 * The API returns the ids only — the session and study behind a booking are
 * joined from the slot ledger, not repeated here.
 */
export const LedgerBooking = z.object({
  id: z.string(),
  scheduleId: z.string(),
  studyId: z.string(),
  participantPid: z.string(),
  status: BookingStatus,
  createdAt: Timestamp,
  checkedInAt: Timestamp.nullable().optional(),
});
export type LedgerBooking = z.infer<typeof LedgerBooking>;

export const BookingsLedger = z.object({ bookings: z.array(LedgerBooking) });

export const RegistryParticipant = z.object({
  pid: z.string(),
  bookingCount: z.number(),
  attendedCount: z.number(),
  noShowCount: z.number(),
  joinedAt: Timestamp,
});
export type RegistryParticipant = z.infer<typeof RegistryParticipant>;

export const ParticipantRegistry = z.object({ participants: z.array(RegistryParticipant) });

/**
 * A term participants can register against. The id is what a retirement is
 * addressed to; the label is what anyone reads.
 */
/** The endpoint serves the active terms only: a retired one is simply gone. */

/** A recruitment lead: a pseudonym, the topics it registered, and when. */
/** Where screening for one study has got to. */
export const ScreeningProgress = z.object({
  matching: z.number(),
  invited: z.number(),
  passed: z.number(),
  failed: z.number(),
  recruits: z.array(z.string()),
});
export type ScreeningProgress = z.infer<typeof ScreeningProgress>;

/*
 * A screener as the participant sees it. The disqualifying flag is deliberately
 * absent: which answers rule someone out is the study's business, and showing
 * it would turn the questionnaire into a form with the answers printed on it.
 */
export const PendingScreening = z.object({
  studyId: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  compensation: z.string(),
  questions: z.array(
    z.object({
      id: z.string(),
      prompt: z.string(),
      options: z.array(z.object({ id: z.string(), label: z.string() })),
    }),
  ),
});
export type PendingScreening = z.infer<typeof PendingScreening>;
export const PendingScreenings = z.object({ screenings: z.array(PendingScreening) });

/* The study itself: what a participant answers during their session. */
export const TaskQuestion = z.object({
  id: z.string(),
  prompt: z.string(),
  type: z.enum(["single", "text"]),
  options: z.array(z.object({ id: z.string(), label: z.string() })),
});

export const OpenTask = z.object({
  bookingId: z.string(),
  studyId: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  questions: z.array(TaskQuestion),
});
export type OpenTask = z.infer<typeof OpenTask>;
export const OpenTasks = z.object({ tasks: z.array(OpenTask) });

export const StudyResponses = z.object({
  questions: z.array(TaskQuestion),
  responses: z.array(
    z.object({
      pid: z.string(),
      submittedAt: Timestamp,
      answers: z.array(
        z.object({
          questionId: z.string(),
          optionId: z.string().nullable(),
          text: z.string().nullable(),
        }),
      ),
    }),
  ),
});
export type StudyResponses = z.infer<typeof StudyResponses>;

export const StaffUser = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: StaffRole,
  isActive: z.boolean(),
  mfaEnabled: z.boolean(),
});
export type StaffUser = z.infer<typeof StaffUser>;

export const StaffDirectory = z.object({ users: z.array(StaffUser) });

export const AuditEntry = z.object({
  _id: z.string(),
  actorRole: z.string(),
  actorLabel: z.string(),
  action: z.string(),
  target: z.string().optional(),
  at: Timestamp,
  oldValue: z.string().nullable().optional(),
  newValue: z.string().nullable().optional(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;

export const AuditPage = z.object({ entries: z.array(AuditEntry), total: z.number() });

export const AdminOverview = z.object({
  activeStudies: z.number(),
  totalStudies: z.number(),
  openSlots: z.number(),
  bookingsRecorded: z.number(),
  staffAccounts: z.number(),
  staffWithMfa: z.number(),
});
export type AdminOverview = z.infer<typeof AdminOverview>;

/** Login answers with an acknowledgement; the session rides in an httpOnly cookie. */
export const AuthAck = z.object({ success: z.boolean(), message: z.string().optional() });

/* ---------- Participant portal ---------- */

/** A booking as the participant sees their own: the study named, no pseudonym needed. */
export const MyBooking = z.object({
  id: z.string(),
  status: BookingStatus,
  start: Timestamp,
  end: Timestamp,
  location: z.string(),
  /** Already formatted by the API as "IRB code — title". */
  title: z.string(),
  compensation: z.string(),
  /** The study behind it, so a booking can be acted on without guesswork. */
  studyId: z.string(),
  irbCode: z.string(),
});
export type MyBooking = z.infer<typeof MyBooking>;

export const MyBookings = z.object({ bookings: z.array(MyBooking) });

/** One rule, evaluated against the calling participant's own profile. */
export const RuleResult = z.object({
  key: z.string(),
  section: z.string(),
  requirement: z.string(),
  answer: z.string(),
  verdict: z.enum(["pass", "fail", "missing"]),
  reason: z.string().optional(),
});
export type RuleResult = z.infer<typeof RuleResult>;

/**
 * The eligibility scorecard. Computed by the engine against the participant's
 * own answers — this app renders the verdict and never re-derives it.
 */
export const Scorecard = z.object({
  ok: z.boolean(),
  profileComplete: z.boolean(),
  missingProfileFields: z.array(z.string()),
  results: z.array(RuleResult),
  failures: z.array(z.string()),
  passCount: z.number(),
});
export type Scorecard = z.infer<typeof Scorecard>;

/** Registration answers with the pseudonym the vault issued. */
export const Registration = z.object({
  message: z.string(),
  pid: z.string(),
});
export type Registration = z.infer<typeof Registration>;


/**
 * Sessions a participant can still book. The study is not repeated on each
 * one — this feed is reached through the study, so the caller already has it.
 */
export const BookableSession = z.object({
  id: z.string(),
  start: Timestamp,
  end: Timestamp,
  location: z.string(),
  maxCapacity: z.number(),
  bookedCount: z.number(),
  status: ScheduleStatus,
});
export type BookableSession = z.infer<typeof BookableSession>;

export const BookableSessions = z.object({ schedules: z.array(BookableSession) });

/**
 * What the bulk generator did. `skipped` is the useful half: a slot that would
 * clash with one already on the calendar is left alone rather than duplicated.
 */
export const BulkScheduleOutcome = z.object({
  preview: z.boolean(),
  total: z.number(),
  created: z.number(),
  skipped: z.number(),
});
export type BulkScheduleOutcome = z.infer<typeof BulkScheduleOutcome>;

/**
 * A study in full, as its own endpoint serves it.
 *
 * `whoThisIsFor` is the engine's own prose rendering of the rules — the
 * browser shows those sentences rather than reading a rule set and writing
 * them itself, which is what keeps rule logic out of this app entirely.
 */
export const StudyDetail = Study.extend({
  protocol: z.string(),
  inclusionCriteria: z.array(z.string()),
  whoThisIsFor: z.array(z.string()),
});
export type StudyDetail = z.infer<typeof StudyDetail>;

/** The calling participant's screening answers, and whether they are complete. */
export const MyProfile = z.object({
  profile: z.record(z.string(), z.unknown()).nullable(),
  complete: z.boolean(),
  missing: z.array(z.string()),
});
export type MyProfile = z.infer<typeof MyProfile>;

/** One booking-engine call, as the operational log records it. */
export const TxLogEntry = z.object({
  kind: z.enum(["ok", "info", "err"]),
  message: z.string(),
  scheduleId: z.string().optional(),
  at: Timestamp,
});
export type TxLogEntry = z.infer<typeof TxLogEntry>;

export const TxLog = z.object({ entries: z.array(TxLogEntry) });

/**
 * What a stress test found. `rejectionsByReason` is the useful half: it says
 * why the engine refused, not merely how many it refused.
 */
export const StressTestResult = z.object({
  attempts: z.number(),
  seatsFree: z.number(),
  succeeded: z.number(),
  rejected: z.number(),
  rejectionsByReason: z.record(z.string(), z.number()),
  overbooked: z.boolean(),
  summary: z.string(),
});
export type StressTestResult = z.infer<typeof StressTestResult>;

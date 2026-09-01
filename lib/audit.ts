import type { StudyStatus } from "./types";

/* The audit log's vocabulary, defined once: who acted, and how that reads on
 * screen. The log itself is written and served by the backend — nothing here
 * assembles or interprets an entry beyond naming its actor. */

/** One entry in the append-only audit log. */
export interface AuditRow {
  id: string;
  /** UTC timestamp the action was recorded at. */
  at: string;
  /** A value from the audit action catalogue, e.g. `booking.reserve`. */
  action: string;
  actorRole: string;
  /** The actor's pseudonym or staff label — never a participant's name. */
  actorLabel: string;
  /** What the action was performed on, where the log records one. */
  target?: string;
}

export const ACTOR_ROLES = [
  "participant",
  "research_assistant",
  "principal_investigator",
  "super_admin",
  "other",
] as const;

export type ActorRole = (typeof ACTOR_ROLES)[number];

export const ACTOR_ROLE_LABEL: Record<ActorRole, string> = {
  participant: "Participant",
  research_assistant: "Research assistant",
  principal_investigator: "Principal investigator",
  super_admin: "Superadmin",
  other: "Other",
};

/**
 * The role an entry was written by, as one of the roles this app knows.
 *
 * A role it does not recognise is filed under `other` rather than dropped: the
 * log is the compliance record, and an entry missing from a view is worse than
 * one shown under a general heading.
 */
export function actorRole(value: string): ActorRole {
  return value !== "other" && (ACTOR_ROLES as readonly string[]).includes(value) ? (value as ActorRole) : "other";
}

/** The family an action belongs to — the part before the first dot. */
export function actionFamily(action: string): string {
  return action.split(".")[0] ?? action;
}

/** How many studies sit in each lifecycle state. */
export function studiesByStatus(statuses: StudyStatus[]): Record<StudyStatus, number> {
  const counts: Record<StudyStatus, number> = {
    draft: 0,
    ethics_review: 0,
    active: 0,
    paused: 0,
    completed: 0,
  };
  for (const status of statuses) counts[status] += 1;
  return counts;
}

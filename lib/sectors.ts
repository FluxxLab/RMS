/*
 * Sector experience, asked at the end of registration.
 *
 * The question is what someone has *done*, not what they would enjoy reading
 * about. A study recruiting AI experts needs people who have worked in the
 * field; "I find AI interesting" is not a qualification, and matching on it
 * fills a session with the wrong room.
 *
 * Experience therefore carries a level as well as a sector, so a study can ask
 * for a floor — working knowledge and above — and the people who would fail at
 * the first screening question are never invited to one.
 *
 * The sector list is deliberately broad and Nigeria-facing. "Other" is last and
 * is the escape hatch, not a dumping ground.
 */

export const SECTORS = [
  "Agriculture",
  "Banking and finance",
  "Construction and real estate",
  "Education",
  "Energy and power",
  "Consumer goods",
  "Government and public sector",
  "Health and pharmaceuticals",
  "Hospitality and tourism",
  "ICT and telecommunications",
  "Insurance",
  "Legal and professional services",
  "Logistics and transport",
  "Manufacturing",
  "Media and entertainment",
  "Mining and extractives",
  "Non-profit and development",
  "Oil and gas",
  "Retail and trade",
  "Security",
  "Sports and recreation",
  "Other",
] as const;

export type Sector = (typeof SECTORS)[number];

export const EMPLOYMENT_STATUSES = [
  "employed_full_time",
  "employed_part_time",
  "self_employed",
  "student",
  "not_working",
  "retired",
] as const;

export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const EMPLOYMENT_LABELS: Record<EmploymentStatus, string> = {
  employed_full_time: "Employed full-time",
  employed_part_time: "Employed part-time",
  self_employed: "Self-employed",
  student: "Student",
  not_working: "Not currently working",
  retired: "Retired",
};

/**
 * The statuses that imply a sector to name. A student or a retired participant
 * has no current sector, and asking them for one would force a false answer.
 */
export const WORKING_STATUSES = [
  "employed_full_time",
  "employed_part_time",
  "self_employed",
] as const satisfies readonly EmploymentStatus[];

export function worksForPay(status: string | undefined): boolean {
  return (WORKING_STATUSES as readonly string[]).includes(status ?? "");
}

export function isSector(value: string): value is Sector {
  return (SECTORS as readonly string[]).includes(value);
}

/*
 * Ordered weakest to strongest. The order is the whole point: a study asks for
 * a minimum and everything at or above it qualifies, so these must never be
 * rearranged without moving the stored values with them.
 */
export const EXPERIENCE_LEVELS = ["some", "working", "expert"] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  some: "Some exposure",
  working: "Working knowledge",
  expert: "Expert",
};

export const EXPERIENCE_HINTS: Record<ExperienceLevel, string> = {
  some: "I have encountered it",
  working: "I work with it regularly",
  expert: "I am asked for my expertise in it",
};

/** True when `held` is at least `required`. Absent experience never qualifies. */
export function meetsExperience(
  held: ExperienceLevel | undefined,
  required: ExperienceLevel,
): boolean {
  if (held === undefined) return false;
  return EXPERIENCE_LEVELS.indexOf(held) >= EXPERIENCE_LEVELS.indexOf(required);
}

export function isExperienceLevel(value: string): value is ExperienceLevel {
  return (EXPERIENCE_LEVELS as readonly string[]).includes(value);
}

/*
 * The domain's vocabulary, as this app uses it.
 *
 * These are the status unions and the screening attribute catalogue — the
 * values the BRD fixes and the UI switches over exhaustively. Record shapes
 * belong to `lib/api/schemas.ts`, which validates them at the boundary; a type
 * here would only be a second, drifting copy of the same contract.
 */

import type { CountryCode } from "./countries";
import type { EmploymentStatus, ExperienceLevel, Sector } from "./sectors";

export type StudyStatus = "draft" | "ethics_review" | "active" | "paused" | "completed";

export type ScheduleStatus = "available" | "full" | "cancelled";

export type BookingStatus = "booked" | "cancelled" | "attended" | "no_show";

export type StaffRole = "research_assistant" | "principal_investigator" | "super_admin";

/* ---------- Master screening attribute catalogue (BRD §10.2) ---------- */

/*
 * Country of residence, drawn from the ISO 3166-1 catalogue in `lib/countries`.
 * It was a six-way region split (US/CA/UK/EU/AU/Other), which put every
 * participant of this Nigeria-based lab into `Other`. Compensation legality is
 * a separate question (`legalCompensationEligible`), so this need not be coarse.
 */
export type Country = CountryCode;
export type Gender = "female" | "male" | "nonbinary" | "prefer not to say";
export type Education = "none" | "highschool" | "somecollege" | "bachelors" | "masters" | "doctorate";
export type Handedness = "right" | "left" | "ambidextrous";
export type DeclaredCondition =
  | "severe food allergy"
  | "eating disorder"
  | "heart condition"
  | "pregnancy"
  | "anxiety disorder"
  | "depression";

/**
 * The one-time screening profile, stored against the pseudonym only. This is
 * special-category data: it is evaluated server-side and shown back to the
 * participant alone. It never appears on a staff surface.
 */
export interface ScreeningProfile {
  age: number;
  gender: Gender;
  education: Education;
  country: Country;
  /* Nigerian administrative divisions, so present only for participants who
     live in Nigeria and absent for everyone else. */
  state?: string;
  lga?: string;
  /* Where they are from, as distinct from where they live. Demographic rather
     than identifying: a state of origin describes millions of people. */
  stateOfOrigin?: string;
  lgaOfOrigin?: string;
  normalVisionHearing: boolean;
  handedness: Handedness;
  englishFluent: boolean;
  webcamHighSpeed: boolean;
  neuroHistory: boolean;
  mentalHealthCondition: boolean;
  alteringMedication: boolean;
  lowSleepSubstancesToday: boolean;
  declaredConditions: DeclaredCondition[];
  /* What they have done, not what interests them: a study recruiting experts
     matches on this. `workSector` is present only for those who work. */
  sectorExperience?: { sector: Sector; level: ExperienceLevel }[];
  employmentStatus?: EmploymentStatus;
  workSector?: Sector;
  canTravelToLab: boolean;
  legalCompensationEligible: boolean;
  clinicalRole: boolean;
  mobileBankingWeekly: boolean;
  deptAffiliation: boolean;
  psychNeuroExpertise: boolean;
  updatedAt: string;
}

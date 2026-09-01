/*
 * The domain's vocabulary, as this app uses it.
 *
 * These are the status unions and the screening attribute catalogue — the
 * values the BRD fixes and the UI switches over exhaustively. Record shapes
 * belong to `lib/api/schemas.ts`, which validates them at the boundary; a type
 * here would only be a second, drifting copy of the same contract.
 */

export type StudyStatus = "draft" | "ethics_review" | "active" | "paused" | "completed";

export type ScheduleStatus = "available" | "full" | "cancelled";

export type BookingStatus = "booked" | "cancelled" | "attended" | "no_show";

export type StaffRole = "research_assistant" | "principal_investigator" | "super_admin";

/* ---------- Master screening attribute catalogue (BRD §10.2) ---------- */

export type Region = "US" | "CA" | "UK" | "EU" | "AU" | "Other";
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
  region: Region;
  normalVisionHearing: boolean;
  handedness: Handedness;
  englishFluent: boolean;
  webcamHighSpeed: boolean;
  neuroHistory: boolean;
  mentalHealthCondition: boolean;
  alteringMedication: boolean;
  lowSleepSubstancesToday: boolean;
  declaredConditions: DeclaredCondition[];
  canTravelToLab: boolean;
  legalCompensationEligible: boolean;
  clinicalRole: boolean;
  mobileBankingWeekly: boolean;
  deptAffiliation: boolean;
  psychNeuroExpertise: boolean;
  updatedAt: string;
}

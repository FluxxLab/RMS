import { z } from "zod";
import type { DeclaredCondition, Education, Gender, Handedness, Region, ScreeningProfile } from "./types";

/* Boundary validation for the seven-step screening wizard (FR-SCR-010/020).
 * Every message states what went wrong and what to do about it. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const yesNo = (what: string) => z.enum(["yes", "no"], { message: `Tell us ${what}.` });

export const GENDERS = ["female", "male", "nonbinary", "prefer not to say"] as const satisfies readonly Gender[];
export const EDUCATIONS = ["none", "highschool", "somecollege", "bachelors", "masters", "doctorate"] as const satisfies readonly Education[];
export const REGIONS = ["US", "CA", "UK", "EU", "AU", "Other"] as const satisfies readonly Region[];
export const HANDEDNESS = ["right", "left", "ambidextrous"] as const satisfies readonly Handedness[];
export const CONDITIONS = [
  "severe food allergy",
  "eating disorder",
  "heart condition",
  "pregnancy",
  "anxiety disorder",
  "depression",
] as const satisfies readonly DeclaredCondition[];

/** The shortest password the API accepts. */
export const MIN_PASSWORD = 12;

export const contactSchema = z.object({
  fullName: z.string().trim().min(3, "Enter your full name."),
  email: z.string().trim().regex(EMAIL, "Enter a valid email address, for example name@example.com."),
  password: z.string().min(MIN_PASSWORD, `Choose a password of at least ${MIN_PASSWORD} characters.`),
});

export const demographicsSchema = z.object({
  age: z.coerce
    .number({ message: "Enter your age as a number." })
    .int("Enter your age in whole years.")
    .min(13, "Age must be between 13 and 120.")
    .max(120, "Age must be between 13 and 120."),
  gender: z.enum(GENDERS, { message: "Choose the option that fits best." }),
  education: z.enum(EDUCATIONS, { message: "Choose your highest level of education." }),
  region: z.enum(REGIONS, { message: "Choose where you live." }),
});

export const physicalSchema = z.object({
  normalVisionHearing: yesNo("whether your vision and hearing are normal or corrected to normal"),
  handedness: z.enum(HANDEDNESS, { message: "Choose your handedness." }),
  englishFluent: yesNo("whether you are fluent in English"),
  webcamHighSpeed: yesNo("whether you have a webcam and high-speed internet"),
});

export const healthSchema = z.object({
  neuroHistory: yesNo("whether you have a history of brain injury, stroke or epilepsy"),
  mentalHealthCondition: yesNo("whether you are currently managing a diagnosed psychological condition"),
  alteringMedication: yesNo("whether you take focus-altering or sedating medication"),
  lowSleepSubstancesToday: yesNo("about your sleep and substance use today"),
  declaredConditions: z.array(z.enum(CONDITIONS)),
});

export const logisticsSchema = z.object({
  canTravelToLab: yesNo("whether you can travel to the lab independently"),
  legalCompensationEligible: yesNo("whether you are legally eligible to receive compensation"),
  clinicalRole: yesNo("whether you work in a clinical healthcare role"),
  mobileBankingWeekly: yesNo("whether you use mobile banking at least weekly"),
});

export const biasSchema = z.object({
  deptAffiliation: yesNo("whether you are employed by or studying in this department"),
  psychNeuroExpertise: yesNo("whether you have formal training in psychology or neuroscience"),
});

export const interestsSchema = z.object({
  interests: z.array(z.string()),
});

export const STEP_SCHEMAS = [
  contactSchema,
  demographicsSchema,
  physicalSchema,
  healthSchema,
  logisticsSchema,
  biasSchema,
  interestsSchema,
] as const;

/**
 * The whole registration, contact details included.
 *
 * The three identifying fields travel with the submission because they are
 * what the vault write needs; they are handed to that one call and never
 * stored, logged or returned alongside the screening answers.
 */
export const screeningSubmissionSchema = contactSchema
  .merge(demographicsSchema)
  .merge(physicalSchema)
  .merge(healthSchema)
  .merge(logisticsSchema)
  .merge(biasSchema)
  .merge(interestsSchema);

export type ScreeningSubmission = z.infer<typeof screeningSubmissionSchema>;

/**
 * The same answers without the contact step, for someone already registered.
 * An update changes the screening profile; it never revisits the vault.
 */
export const profileSubmissionSchema = demographicsSchema
  .merge(physicalSchema)
  .merge(healthSchema)
  .merge(logisticsSchema)
  .merge(biasSchema)
  .merge(interestsSchema);

export type ProfileSubmission = z.infer<typeof profileSubmissionSchema>;

const bool = (v: "yes" | "no") => v === "yes";

/** The answers the profile endpoint accepts — no timestamp, that is the API's. */
export type ScreeningAnswers = Omit<ScreeningProfile, "updatedAt">;

/**
 * The screening answers in the shape the profile endpoint accepts. Contact
 * details are deliberately absent: they belong to the vault write, not here.
 */
export function toProfile(s: ProfileSubmission): ScreeningAnswers {
  return {
    age: s.age,
    gender: s.gender,
    education: s.education,
    region: s.region,
    normalVisionHearing: bool(s.normalVisionHearing),
    handedness: s.handedness,
    englishFluent: bool(s.englishFluent),
    webcamHighSpeed: bool(s.webcamHighSpeed),
    neuroHistory: bool(s.neuroHistory),
    mentalHealthCondition: bool(s.mentalHealthCondition),
    alteringMedication: bool(s.alteringMedication),
    lowSleepSubstancesToday: bool(s.lowSleepSubstancesToday),
    declaredConditions: s.declaredConditions,
    canTravelToLab: bool(s.canTravelToLab),
    legalCompensationEligible: bool(s.legalCompensationEligible),
    clinicalRole: bool(s.clinicalRole),
    mobileBankingWeekly: bool(s.mobileBankingWeekly),
    deptAffiliation: bool(s.deptAffiliation),
    psychNeuroExpertise: bool(s.psychNeuroExpertise),
  };
}

/** Wizard answers, held as strings while the form is being filled in. */
export type WizardAnswers = Record<string, string>;

/**
 * The stored profile, as the wizard holds its answers.
 *
 * Everything is read defensively: this comes from the API, and a field it has
 * not got is a step the participant has still to answer, not a crash.
 */
export function fromProfile(profile: Record<string, unknown> | null): {
  answers: WizardAnswers;
  declaredConditions: string[];
} {
  if (profile === null) return { answers: {}, declaredConditions: [] };

  const answers: WizardAnswers = {};

  // Age is the one numeric answer. The rest are enums, where a number is not a
  // value the wizard could offer — so it is left out rather than stringified
  // into something that fails validation later with a confusing message.
  const numeric = (key: string) => {
    const value = profile[key];
    if (typeof value === "number" && Number.isFinite(value)) answers[key] = String(value);
  };
  const text = (key: string) => {
    const value = profile[key];
    if (typeof value === "string" && value !== "") answers[key] = value;
  };
  const yesNo = (key: string) => {
    const value = profile[key];
    if (typeof value === "boolean") answers[key] = value ? "yes" : "no";
  };

  numeric("age");
  for (const key of ["gender", "education", "region", "handedness"]) text(key);
  for (const key of [
    "normalVisionHearing",
    "englishFluent",
    "webcamHighSpeed",
    "neuroHistory",
    "mentalHealthCondition",
    "alteringMedication",
    "lowSleepSubstancesToday",
    "canTravelToLab",
    "legalCompensationEligible",
    "clinicalRole",
    "mobileBankingWeekly",
    "deptAffiliation",
    "psychNeuroExpertise",
  ]) {
    yesNo(key);
  }

  const declared = profile.declaredConditions;
  const declaredConditions = Array.isArray(declared) ? declared.filter((c): c is string => typeof c === "string") : [];

  return { answers, declaredConditions };
}

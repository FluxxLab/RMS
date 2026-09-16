import { z } from "zod";
import { COUNTRY_CODES, HOME_COUNTRY } from "./countries";
import { isLgaOf, isState } from "./nigeria";
import { EMPLOYMENT_STATUSES, EXPERIENCE_LEVELS, SECTORS, worksForPay } from "./sectors";
import type { DeclaredCondition, Education, Gender, Handedness, ScreeningProfile } from "./types";

/* Boundary validation for the seven-step screening wizard (FR-SCR-010/020).
 * Every message states what went wrong and what to do about it. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Eleven digits, as issued by NIMC. */
const NIN = /^\d{11}$/;

/** 0801… or +234801…, the two forms people actually type. */
const NIGERIAN_PHONE = /^(?:0\d{10}|\+234\d{10})$/;
const yesNo = (what: string) => z.enum(["yes", "no"], { message: `Tell us ${what}.` });

export const GENDERS = ["female", "male", "nonbinary", "prefer not to say"] as const satisfies readonly Gender[];
export const EDUCATIONS = ["none", "highschool", "somecollege", "bachelors", "masters", "doctorate"] as const satisfies readonly Education[];
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

/*
 * The type-level message matters as much as the rule's. A field the visitor has
 * not touched yet is absent rather than empty, so it reaches Zod as `undefined`
 * and fails the string check before `.min()` or `.regex()` is ever consulted —
 * which is how "expected string, received undefined" reaches a participant.
 */
export const contactSchema = z.object({
  fullName: z.string({ message: "Enter your full name." }).trim().min(3, "Enter your full name."),
  email: z
    .string({ message: "Enter a valid email address, for example name@example.com." })
    .trim()
    .regex(EMAIL, "Enter a valid email address, for example name@example.com."),
  password: z
    .string({ message: `Choose a password of at least ${MIN_PASSWORD} characters.` })
    .min(MIN_PASSWORD, `Choose a password of at least ${MIN_PASSWORD} characters.`),
});

/*
 * State and LGA are Nigerian administrative divisions, so they are asked only
 * of participants who live here and are absent for everyone else. The fields
 * are therefore optional in shape and required by `nigerianAddress` below,
 * which is the only place that knows the pairing rule.
 */
export const demographicsFields = z.object({
  age: z.coerce
    .number({ message: "Enter your age as a number." })
    .int("Enter your age in whole years.")
    .min(13, "Age must be between 13 and 120.")
    .max(120, "Age must be between 13 and 120."),
  gender: z.enum(GENDERS, { message: "Choose the option that fits best." }),
  education: z.enum(EDUCATIONS, { message: "Choose your highest level of education." }),
  country: z.enum(COUNTRY_CODES, { message: "Choose the country you live in." }),
  state: z.string().optional(),
  lga: z.string().optional(),
  stateOfOrigin: z.string().optional(),
  lgaOfOrigin: z.string().optional(),

  /*
   * Identity, and so vault-bound: these travel with the registration call and
   * are never stored beside the screening answers. They sit on this step rather
   * than the contact step because whether they are required depends on the
   * country, which is answered here — an error on step 2 about a field on step
   * 1 is an error the participant cannot see.
   */
  phone: z.string().trim().optional(),
  nin: z.string().trim().optional(),
  addressLine: z.string().trim().optional(),
});

/**
 * A Nigerian participant must name a state and an LGA that belongs to it. The
 * LGA is not reported as missing while the state is still unchosen: until a
 * state is picked there is no list to choose an LGA from, and two errors for
 * one unanswered question reads as two problems.
 */
function nigerianAddress(
  v: {
    country: string;
    state?: string;
    lga?: string;
    stateOfOrigin?: string;
    lgaOfOrigin?: string;
    phone?: string;
    nin?: string;
    addressLine?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (v.country !== HOME_COUNTRY) return;

  if (!v.state || !isState(v.state)) {
    ctx.addIssue({ code: "custom", path: ["state"], message: "Choose your state." });
    return;
  }
  if (!v.lga || !isLgaOf(v.state, v.lga)) {
    ctx.addIssue({ code: "custom", path: ["lga"], message: "Choose your local government area." });
  }

  // Where they are from, which is a different question from where they live.
  if (!v.stateOfOrigin || !isState(v.stateOfOrigin)) {
    ctx.addIssue({ code: "custom", path: ["stateOfOrigin"], message: "Choose your state of origin." });
    return;
  }
  if (!v.lgaOfOrigin || !isLgaOf(v.stateOfOrigin, v.lgaOfOrigin)) {
    ctx.addIssue({
      code: "custom",
      path: ["lgaOfOrigin"],
      message: "Choose the local government area you are from.",
    });
  }

}

/**
 * The vault-bound answers, required of a Nigerian participant at registration
 * and at no other time.
 *
 * The vault is written once and has no update path, so asking for a NIN during
 * an update would demand an answer with nowhere to go — and refuse to save the
 * profile until it was given.
 */
function nigerianIdentity(
  v: { country: string; phone?: string; nin?: string; addressLine?: string },
  ctx: z.RefinementCtx,
) {
  if (v.country !== HOME_COUNTRY) return;

  if (!v.phone || !NIGERIAN_PHONE.test(v.phone)) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a phone number like 08012345678." });
  }
  if (!v.nin || !NIN.test(v.nin)) {
    ctx.addIssue({ code: "custom", path: ["nin"], message: "A NIN is eleven digits." });
  }
  if (!v.addressLine || v.addressLine.trim().length < 5) {
    ctx.addIssue({ code: "custom", path: ["addressLine"], message: "Enter your address." });
  }
}

/** Step 2 during registration: the vault fields are asked for here. */
export const demographicsSchema = demographicsFields
  .superRefine(nigerianAddress)
  .superRefine(nigerianIdentity);

/** Step 2 during an update: same demographics, no vault fields. */
export const demographicsUpdateSchema = demographicsFields.superRefine(nigerianAddress);

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

/*
 * Step 7 asks two different things and keeps them apart. The topic tags say
 * what someone wants to hear about. The sector answers say what they do, and
 * which industries they will sit a study for — which is what lets a recruiter
 * find, say, people who actually work in banking rather than people who merely
 * find it interesting.
 */
/** One sector somebody has worked in, and how deeply. */
export const sectorExperienceSchema = z.object({
  sector: z.enum(SECTORS),
  level: z.enum(EXPERIENCE_LEVELS),
});

export const interestsFields = z.object({
  /*
   * Optional, and absent from the wizard: topics are chosen on the interests
   * page instead. The distinction matters because the API replaces the tag list
   * wholesale — sending `[]` from a form that no longer asks the question would
   * silently clear choices the participant made elsewhere.
   */
  interests: z.array(z.string()).optional(),
  sectorExperience: z.array(sectorExperienceSchema).default([]),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES, { message: "Choose the option that fits best." }),
  workSector: z.enum(SECTORS).optional(),
});

/**
 * A sector is asked for only of someone who works. A student or a retired
 * participant has none to give, and demanding one would force a false answer;
 * anything they did give is dropped rather than stored as a fact about them.
 */
function sectorWork(v: { employmentStatus: string; workSector?: string }, ctx: z.RefinementCtx) {
  if (!worksForPay(v.employmentStatus)) return;

  if (!v.workSector) {
    ctx.addIssue({ code: "custom", path: ["workSector"], message: "Choose the sector you work in." });
  }
}

export const interestsSchema = interestsFields.superRefine(sectorWork);

const STEPS_REGISTERING = [
  contactSchema,
  demographicsSchema,
  physicalSchema,
  healthSchema,
  logisticsSchema,
  biasSchema,
  interestsSchema,
] as const;

const STEPS_UPDATING = [
  contactSchema,
  demographicsUpdateSchema,
  physicalSchema,
  healthSchema,
  logisticsSchema,
  biasSchema,
  interestsSchema,
] as const;

/**
 * The schema for each step. An update skips the contact step and never revisits
 * the vault, so its demographics step does not ask for the vault-bound answers.
 */
export function stepSchemas(editing: boolean) {
  return editing ? STEPS_UPDATING : STEPS_REGISTERING;
}

/**
 * The whole registration, contact details included.
 *
 * The three identifying fields travel with the submission because they are
 * what the vault write needs; they are handed to that one call and never
 * stored, logged or returned alongside the screening answers.
 */
export const screeningSubmissionSchema = contactSchema
  .merge(demographicsFields)
  .merge(physicalSchema)
  .merge(healthSchema)
  .merge(logisticsSchema)
  .merge(biasSchema)
  .merge(interestsFields)
  .superRefine(nigerianAddress)
  .superRefine(nigerianIdentity)
  .superRefine(sectorWork);

export type ScreeningSubmission = z.infer<typeof screeningSubmissionSchema>;

/**
 * The same answers without the contact step, for someone already registered.
 * An update changes the screening profile; it never revisits the vault.
 */
export const profileSubmissionSchema = demographicsFields
  .merge(physicalSchema)
  .merge(healthSchema)
  .merge(logisticsSchema)
  .merge(biasSchema)
  .merge(interestsFields)
  .superRefine(nigerianAddress)
  .superRefine(sectorWork);

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
    country: s.country,
    state: s.state,
    lga: s.lga,
    stateOfOrigin: s.stateOfOrigin,
    lgaOfOrigin: s.lgaOfOrigin,
    sectorExperience: s.sectorExperience,
    employmentStatus: s.employmentStatus,
    // Dropped rather than stored for someone who does not work: it would be a
    // fact about them that they never asserted.
    workSector: worksForPay(s.employmentStatus) ? s.workSector : undefined,
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
  sectorExperience: { sector: string; level: string }[];
} {
  if (profile === null) return { answers: {}, declaredConditions: [], sectorExperience: [] };

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
  for (const key of [
    "gender",
    "education",
    "country",
    "state",
    "lga",
    "stateOfOrigin",
    "lgaOfOrigin",
    "handedness",
    "employmentStatus",
    "workSector",
  ])
    text(key);
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

  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

  /* Read defensively: an older profile may still hold the preference list this
     replaced, and a half-written entry is not an answer. */
  const experience = Array.isArray(profile.sectorExperience)
    ? (profile.sectorExperience as unknown[]).filter(
        (e): e is { sector: string; level: string } =>
          typeof e === "object" && e !== null && "sector" in e && "level" in e,
      )
    : [];

  return {
    answers,
    declaredConditions: strings(profile.declaredConditions),
    sectorExperience: experience.map((e) => ({ sector: String(e.sector), level: String(e.level) })),
  };
}

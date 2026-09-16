import { z } from "zod";
import { COUNTRY_CODES } from "./countries";
import { EXPERIENCE_LEVELS, SECTORS } from "./sectors";
import { CONDITIONS, EDUCATIONS, GENDERS, HANDEDNESS } from "./screening-schema";

/*
 * What the studies endpoint accepts when a study is authored.
 *
 * This mirrors the API's own contract so a study is rejected here, with the
 * field named, rather than after a round trip. The API validates it again and
 * remains the authority — this is the courtesy, not the rule.
 */

/** IRB codes read like IRB-2026-0142. */
const IRB = /^IRB-\d{4}-\d{4}$/;

export const studyRulesSchema = z
  .object({
    minAge: z.number().int().min(13).max(120).optional(),
    maxAge: z.number().int().min(13).max(120).optional(),
    allowedGenders: z.array(z.enum(GENDERS)).min(1).optional(),
    minEducation: z.enum(EDUCATIONS).optional(),
    allowedCountries: z.array(z.enum(COUNTRY_CODES)).min(1).optional(),
    requireNormalVisionHearing: z.boolean().optional(),
    requiredHandedness: z.enum(HANDEDNESS).optional(),
    requireEnglishFluent: z.boolean().optional(),
    requireWebcamHighSpeed: z.boolean().optional(),
    excludeNeuroHistory: z.boolean().optional(),
    excludeMentalHealthCondition: z.boolean().optional(),
    excludeAlteringMedication: z.boolean().optional(),
    excludeLowSleepSubstancesToday: z.boolean().optional(),
    disallowedConditions: z.array(z.enum(CONDITIONS)).min(1).optional(),
    requireCanTravelToLab: z.boolean().optional(),
    requireLegalCompensationEligible: z.boolean().optional(),
    disallowClinicalRole: z.boolean().optional(),
    requireMobileBankingWeekly: z.boolean().optional(),
    excludeDeptAffiliation: z.boolean().optional(),
    excludePsychNeuroExpertise: z.boolean().optional(),
    excludeRecent30dParticipation: z.boolean().optional(),
    cooldownDays: z.number().int().min(0).max(3650).optional(),
    maxLifetimeParticipations: z.number().int().min(1).optional(),
    conflictTags: z.array(z.string().min(1)).min(1).optional(),
    notes: z.string().max(500).optional(),
  })
  // A range that excludes everybody is a configuration error, not a filter.
  .refine((r) => r.minAge === undefined || r.maxAge === undefined || r.minAge <= r.maxAge, {
    message: "The youngest age must not be above the oldest.",
    path: ["minAge"],
  });

export type StudyRulesInput = z.infer<typeof studyRulesSchema>;

export const createStudySchema = z.object({
  irbCode: z.string().trim().regex(IRB, "An IRB code looks like IRB-2026-0142."),
  title: z.string().trim().min(3, "Give the study a title of at least three characters.").max(200),
  shortDescription: z
    .string()
    .trim()
    .min(20, "Describe the study in at least twenty characters — participants read this first.")
    .max(400),
  protocol: z.string().trim().min(50, "Participants must be told what the session involves."),
  compensation: z.string().trim().min(1, "State what a participant receives, or write “none”."),
  durationMinutes: z.number().int().min(5, "A session runs for at least five minutes.").max(480),
  maxCap: z.number().int().min(1, "Recruit at least one participant."),
  location: z.string().trim().min(1, "Name the room the session runs in."),
  tags: z.array(z.string().min(1)),
  inclusionCriteria: z.array(z.string().min(5, "An inclusion statement needs at least five characters.")),
  rules: studyRulesSchema,
  researcherId: z.string().length(24, "Choose the researcher responsible for this study."),
  /* Everyone else who may see and run the study. The responsible researcher is
     implied by researcherId and is not repeated here. */
  assignedStaff: z.array(z.string().length(24)).optional(),
  /* The sector this study recruits for, matched against the sectors
     participants said they would sit a study about. */
  sector: z.enum(SECTORS).optional(),
  minExperience: z.enum(EXPERIENCE_LEVELS).optional(),
  /* The screener the researchers write. A question with no disqualifying answer
     filters nobody, which is allowed — it is then simply a question. */
  screener: z
    .array(
      z.object({
        id: z.string().min(1),
        prompt: z.string().trim().min(3, "Write the question participants will read."),
        options: z
          .array(
            z.object({
              id: z.string().min(1),
              label: z.string().trim().min(1, "Give the answer a label."),
              disqualifies: z.boolean(),
            }),
          )
          .min(2, "A question needs at least two answers."),
      }),
    )
    .optional(),
});

export type CreateStudyInput = z.infer<typeof createStudySchema>;

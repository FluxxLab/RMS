import { describe, expect, it } from "vitest";

import {
  demographicsSchema,
  demographicsUpdateSchema,
  profileSubmissionSchema,
  stepSchemas,
  toProfile,
} from "@/lib/screening-schema";

const NIGERIAN = {
  age: 30,
  gender: "female",
  education: "bachelors",
  country: "NG",
  state: "Lagos",
  lga: "Ikeja",
  stateOfOrigin: "Enugu",
  lgaOfOrigin: "Nsukka",
} as const;

const IDENTITY = {
  phone: "08012345678",
  nin: "12345678901",
  addressLine: "12 Awolowo Road, Ikoyi",
} as const;

function errorOn(
  result: { error?: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
) {
  return result.error?.issues.find((i) => i.path[0] === field)?.message;
}

describe("state and LGA of origin", () => {
  it("accepts an origin LGA that belongs to its state", () => {
    expect(demographicsSchema.safeParse({ ...NIGERIAN, ...IDENTITY }).success).toBe(true);
  });

  it("asks a Nigerian participant where they are from", () => {
    const r = demographicsSchema.safeParse({
      ...NIGERIAN,
      ...IDENTITY,
      stateOfOrigin: undefined,
      lgaOfOrigin: undefined,
    });
    expect(errorOn(r, "stateOfOrigin")).toBe("Choose your state of origin.");
  });

  it("rejects an origin LGA from a different state", () => {
    const r = demographicsSchema.safeParse({ ...NIGERIAN, ...IDENTITY, lgaOfOrigin: "Ikeja" });
    expect(errorOn(r, "lgaOfOrigin")).toBe("Choose the local government area you are from.");
  });

  it("keeps origin separate from residence", () => {
    const parsed = demographicsSchema.parse({ ...NIGERIAN, ...IDENTITY });
    expect(parsed.state).toBe("Lagos");
    expect(parsed.stateOfOrigin).toBe("Enugu");
  });
});

describe("the vault-bound answers", () => {
  it.each(["phone", "nin", "addressLine"])("requires %s of a Nigerian registration", (field) => {
    const r = demographicsSchema.safeParse({ ...NIGERIAN, ...IDENTITY, [field]: undefined });
    expect(r.success).toBe(false);
    expect(errorOn(r, field)).toBeDefined();
  });

  it("rejects a NIN that is not eleven digits", () => {
    expect(errorOn(demographicsSchema.safeParse({ ...NIGERIAN, ...IDENTITY, nin: "12345" }), "nin")).toBe(
      "A NIN is eleven digits.",
    );
  });

  it.each(["08012345678", "+2348012345678"])("accepts %s as a phone number", (phone) => {
    expect(demographicsSchema.safeParse({ ...NIGERIAN, ...IDENTITY, phone }).success).toBe(true);
  });

  it("rejects a phone number that is not Nigerian", () => {
    expect(errorOn(demographicsSchema.safeParse({ ...NIGERIAN, ...IDENTITY, phone: "12345" }), "phone")).toBeDefined();
  });

  it("asks none of it of a participant living abroad", () => {
    const r = demographicsSchema.safeParse({ ...NIGERIAN, country: "GB", state: undefined, lga: undefined });
    expect(r.success).toBe(true);
  });

  /*
   * The vault is written once and has no update path, so an update must not
   * demand a NIN: it would block the save over an answer with nowhere to go.
   */
  it("is not required when updating a profile", () => {
    expect(demographicsUpdateSchema.safeParse(NIGERIAN).success).toBe(true);
  });

  it("gives the update flow a step 2 that does not ask for it", () => {
    expect(stepSchemas(true)[1].safeParse(NIGERIAN).success).toBe(true);
    expect(stepSchemas(false)[1].safeParse(NIGERIAN).success).toBe(false);
  });
});

describe("what reaches the profile endpoint", () => {
  const full = {
    ...NIGERIAN,
    ...IDENTITY,
    normalVisionHearing: "yes",
    handedness: "right",
    englishFluent: "yes",
    webcamHighSpeed: "yes",
    neuroHistory: "no",
    mentalHealthCondition: "no",
    alteringMedication: "no",
    lowSleepSubstancesToday: "no",
    declaredConditions: [],
    canTravelToLab: "yes",
    legalCompensationEligible: "yes",
    clinicalRole: "no",
    mobileBankingWeekly: "yes",
    deptAffiliation: "no",
    psychNeuroExpertise: "no",
    employmentStatus: "student",
    sectorExperience: [],
  };

  /*
   * The claim the whole vault design rests on. A NIN, a phone number or an
   * address stored beside the pseudonym is what the database validators refuse
   * outright — so the shape handed to the profile endpoint must never carry one.
   */
  it.each(["phone", "nin", "addressLine", "fullName", "email", "password"])(
    "never carries %s into the screening profile",
    (field) => {
      expect(Object.keys(toProfile(full as never))).not.toContain(field);
    },
  );

  it("does carry where they live and where they are from", () => {
    const profile = toProfile(full as never);
    expect(profile.state).toBe("Lagos");
    expect(profile.lga).toBe("Ikeja");
    expect(profile.stateOfOrigin).toBe("Enugu");
    expect(profile.lgaOfOrigin).toBe("Nsukka");
  });

  it("still requires the residence pair on a profile update", () => {
    const r = profileSubmissionSchema.safeParse({ ...full, state: undefined });
    expect(r.success).toBe(false);
  });
});

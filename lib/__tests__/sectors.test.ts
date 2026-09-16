import { describe, expect, it } from "vitest";

import { interestsSchema, toProfile } from "@/lib/screening-schema";
import { SECTORS, worksForPay } from "@/lib/sectors";

const BASE = { interests: [], sectorExperience: [] };

function errorOn(
  result: { error?: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
) {
  return result.error?.issues.find((i) => i.path[0] === field)?.message;
}

describe("step 7: sector profiling", () => {
  it("requires an employment status", () => {
    const r = interestsSchema.safeParse(BASE);
    expect(r.success).toBe(false);
    expect(errorOn(r, "employmentStatus")).toBe("Choose the option that fits best.");
  });

  it("asks a working participant which sector they work in", () => {
    const r = interestsSchema.safeParse({ ...BASE, employmentStatus: "employed_full_time" });
    expect(r.success).toBe(false);
    expect(errorOn(r, "workSector")).toBe("Choose the sector you work in.");
  });

  it("accepts a working participant who names one", () => {
    const r = interestsSchema.safeParse({
      ...BASE,
      employmentStatus: "employed_full_time",
      workSector: "Banking and finance",
    });
    expect(r.success).toBe(true);
  });

  it.each(["student", "not_working", "retired"])("asks no sector of someone who is %s", (status) => {
    expect(interestsSchema.safeParse({ ...BASE, employmentStatus: status }).success).toBe(true);
  });

  it("treats choosing no sector of interest as an answer", () => {
    const r = interestsSchema.safeParse({ ...BASE, employmentStatus: "student" });
    expect(r.success).toBe(true);
  });

  it("accepts several sectors of experience, each with a level", () => {
    const r = interestsSchema.safeParse({
      ...BASE,
      sectorExperience: [
        { sector: "Agriculture", level: "expert" },
        { sector: "Oil and gas", level: "some" },
      ],
      employmentStatus: "student",
    });
    expect(r.success).toBe(true);
  });

  it("rejects a sector outside the published list", () => {
    const r = interestsSchema.safeParse({
      ...BASE,
      sectorExperience: [{ sector: "Astrology", level: "expert" }],
      employmentStatus: "student",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a sector recorded without a level", () => {
    const r = interestsSchema.safeParse({
      ...BASE,
      sectorExperience: [{ sector: "Agriculture" }],
      employmentStatus: "student",
    });
    expect(r.success).toBe(false);
  });

  it("keeps the topic tags alongside, unchanged", () => {
    const r = interestsSchema.safeParse({
      ...BASE,
      interests: ["sleep and attention"],
      employmentStatus: "student",
    });
    expect(r.success).toBe(true);
  });
});

describe("worksForPay", () => {
  it.each(["employed_full_time", "employed_part_time", "self_employed"])("is true for %s", (s) => {
    expect(worksForPay(s)).toBe(true);
  });

  it.each(["student", "not_working", "retired", undefined])("is false for %s", (s) => {
    expect(worksForPay(s)).toBe(false);
  });
});

describe("what reaches the profile endpoint", () => {
  const answers = {
    age: 30,
    gender: "female",
    education: "bachelors",
    country: "GB",
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
    interests: [],
    sectorExperience: [{ sector: "Agriculture", level: "working" }],
  } as never;

  /*
   * The regression this guards: a participant who picks a sector, then changes
   * their status to "student", must not have the stale sector stored as a fact
   * about where they work.
   */
  it("drops a sector of work from someone who does not work", () => {
    const profile = toProfile({ ...(answers as object), employmentStatus: "student", workSector: "Oil and gas" } as never);
    expect(profile.workSector).toBeUndefined();
    expect(profile.employmentStatus).toBe("student");
  });

  it("keeps it for someone who does", () => {
    const profile = toProfile({
      ...(answers as object),
      employmentStatus: "self_employed",
      workSector: "Oil and gas",
    } as never);
    expect(profile.workSector).toBe("Oil and gas");
  });

  it("carries the sectors of experience through", () => {
    const profile = toProfile({ ...(answers as object), employmentStatus: "student" } as never);
    expect(profile.sectorExperience).toEqual([{ sector: "Agriculture", level: "working" }]);
  });
});

describe("the sector list", () => {
  it("ends with Other, so the escape hatch is last", () => {
    expect(SECTORS[SECTORS.length - 1]).toBe("Other");
  });

  it("has no duplicates", () => {
    expect(new Set(SECTORS).size).toBe(SECTORS.length);
  });
});

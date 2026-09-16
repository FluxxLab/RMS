import { describe, expect, it } from "vitest";
import { fromProfile } from "../screening-schema";

/*
 * The profile comes back from the API, so this reads it defensively: a field
 * that is absent means a step still to answer, never a crash.
 */

describe("FR-SCR-010 prefilling the screening wizard", () => {
  it("has nothing to offer when no profile is stored", () => {
    expect(fromProfile(null)).toEqual({ answers: {}, declaredConditions: [], sectorExperience: [] });
  });

  it("renders booleans as the yes/no the wizard asks for", () => {
    const { answers } = fromProfile({ englishFluent: true, neuroHistory: false });
    expect(answers.englishFluent).toBe("yes");
    expect(answers.neuroHistory).toBe("no");
  });

  it("renders a number as text, because the field holds text", () => {
    expect(fromProfile({ age: 30 }).answers.age).toBe("30");
  });

  it("carries string answers through unchanged", () => {
    const { answers } = fromProfile({ gender: "prefer not to say", country: "NG" });
    expect(answers.gender).toBe("prefer not to say");
    expect(answers.country).toBe("NG");
  });

  it("leaves a missing answer absent rather than guessing at one", () => {
    const { answers } = fromProfile({ age: 30 });
    expect("gender" in answers).toBe(false);
    expect("englishFluent" in answers).toBe(false);
  });

  it("ignores a field whose type it does not recognise", () => {
    const { answers } = fromProfile({ age: { years: 30 }, gender: 7 });
    expect(answers).toEqual({});
  });

  it("reads declared conditions, dropping anything that is not a term", () => {
    const { declaredConditions } = fromProfile({ declaredConditions: ["pregnancy", 42, null, "depression"] });
    expect(declaredConditions).toEqual(["pregnancy", "depression"]);
  });

  it("treats a missing or malformed condition list as none declared", () => {
    expect(fromProfile({}).declaredConditions).toEqual([]);
    expect(fromProfile({ declaredConditions: "pregnancy" }).declaredConditions).toEqual([]);
  });
});

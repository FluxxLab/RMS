import { describe, expect, it } from "vitest";

import { demographicsSchema } from "@/lib/screening-schema";
import { NIGERIA_STATES, isLgaOf, isState, lgasOf } from "@/lib/nigeria";

const NIGERIAN = { age: 30, gender: "female", education: "bachelors", country: "NG" } as const;

/* Required of a Nigerian registration, and not what these cases are about. */
const REST = {
  stateOfOrigin: "Enugu",
  lgaOfOrigin: "Nsukka",
  phone: "08012345678",
  nin: "12345678901",
  addressLine: "12 Awolowo Road, Ikoyi",
} as const;
const ABROAD = { age: 30, gender: "female", education: "bachelors", country: "GB" } as const;

/** The first error on a given field, or undefined when that field is happy. */
function errorOn(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }, field: string) {
  return result.error?.issues.find((i) => i.path[0] === field)?.message;
}

describe("the Nigerian catalogue", () => {
  it("carries the 36 states and the FCT", () => {
    expect(NIGERIA_STATES).toHaveLength(37);
    expect(NIGERIA_STATES.map((s) => s.state)).toContain("Federal Capital Territory");
  });

  it("carries all 774 local government areas", () => {
    expect(NIGERIA_STATES.reduce((n, s) => n + s.lgas.length, 0)).toBe(774);
  });

  it("keeps states in alphabetical order", () => {
    const names = NIGERIA_STATES.map((s) => s.state);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("knows which LGAs belong to a state", () => {
    expect(lgasOf("Lagos")).toContain("Ikeja");
    expect(isLgaOf("Lagos", "Ikeja")).toBe(true);
    expect(isLgaOf("Kano", "Ikeja")).toBe(false);
  });

  it("returns nothing for a state it does not know", () => {
    expect(lgasOf("Atlantis")).toEqual([]);
    expect(isState("Atlantis")).toBe(false);
  });
});

describe("demographics: state and LGA", () => {
  it("accepts a Nigerian participant who names a state and one of its LGAs", () => {
    const r = demographicsSchema.safeParse({ ...NIGERIAN, ...REST, state: "Lagos", lga: "Ikeja" });
    expect(r.success).toBe(true);
  });

  it("asks a Nigerian participant for a state when none is given", () => {
    const r = demographicsSchema.safeParse(NIGERIAN);
    expect(r.success).toBe(false);
    expect(errorOn(r, "state")).toBe("Choose your state.");
  });

  it("does not also complain about the LGA while the state is unchosen", () => {
    const r = demographicsSchema.safeParse(NIGERIAN);
    expect(errorOn(r, "lga")).toBeUndefined();
  });

  it("rejects an LGA that belongs to a different state", () => {
    const r = demographicsSchema.safeParse({ ...NIGERIAN, ...REST, state: "Lagos", lga: "Nsukka" });
    expect(r.success).toBe(false);
    expect(errorOn(r, "lga")).toBe("Choose your local government area.");
  });

  it("rejects a state that is not a Nigerian state", () => {
    const r = demographicsSchema.safeParse({ ...NIGERIAN, ...REST, state: "Texas", lga: "Austin" });
    expect(errorOn(r, "state")).toBe("Choose your state.");
  });

  it("asks nothing of a participant living abroad", () => {
    const r = demographicsSchema.safeParse(ABROAD);
    expect(r.success).toBe(true);
  });

  it("still accepts a participant abroad who has no state or LGA at all", () => {
    const r = demographicsSchema.safeParse({ ...ABROAD, state: undefined, lga: undefined });
    expect(r.success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { ACTOR_ROLE_LABEL, actionFamily, actorRole, studiesByStatus } from "../audit";

describe("FR-AUD-050 audit vocabulary", () => {
  it("names each role this app knows", () => {
    expect(actorRole("participant")).toBe("participant");
    expect(actorRole("super_admin")).toBe("super_admin");
    expect(ACTOR_ROLE_LABEL[actorRole("research_assistant")]).toBe("Research assistant");
  });

  it("files an unrecognised role under other rather than dropping the entry", () => {
    expect(actorRole("system")).toBe("other");
    expect(actorRole("")).toBe("other");
  });

  it("reads an action's area from the part before the first dot", () => {
    expect(actionFamily("booking.reserve")).toBe("booking");
    expect(actionFamily("schedule.bulk_create")).toBe("schedule");
    // An action with no dot is its own area, not an empty one.
    expect(actionFamily("export")).toBe("export");
  });
});

describe("FR-STD-010 study lifecycle counts", () => {
  it("counts studies in each state", () => {
    expect(studiesByStatus(["active", "active", "paused", "draft"])).toEqual({
      draft: 1,
      ethics_review: 0,
      active: 2,
      paused: 1,
      completed: 0,
    });
  });

  it("returns a zero for every state when there are no studies", () => {
    expect(studiesByStatus([])).toEqual({ draft: 0, ethics_review: 0, active: 0, paused: 0, completed: 0 });
  });
});

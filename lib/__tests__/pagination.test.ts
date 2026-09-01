import { describe, expect, it } from "vitest";
import { PAGE_SIZE, paginate } from "../participants";

const rows = Array.from({ length: 16 }, (_, i) => i + 1);

describe("FR-OPS-080 registry pagination", () => {
  it("shows five rows a page by default", () => {
    expect(PAGE_SIZE).toBe(5);
    expect(paginate(rows, 1)).toMatchObject({ rows: [1, 2, 3, 4, 5], page: 1, pageCount: 4, from: 1, to: 5, total: 16 });
  });

  it("gives the last page whatever is left over", () => {
    expect(paginate(rows, 4)).toMatchObject({ rows: [16], from: 16, to: 16 });
  });

  it("clamps a page number past the end", () => {
    expect(paginate(rows, 99).page).toBe(4);
  });

  it("clamps a page number below the start", () => {
    expect(paginate(rows, 0).page).toBe(1);
    expect(paginate(rows, -3).page).toBe(1);
  });

  it("reports an empty range when there is nothing to show", () => {
    expect(paginate([], 1)).toMatchObject({ rows: [], page: 1, pageCount: 1, from: 0, to: 0, total: 0 });
  });
});

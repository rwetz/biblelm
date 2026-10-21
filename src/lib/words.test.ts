import { describe, expect, it } from "vitest";
import { expectedEls, findEls, lettersOf } from "./els";

describe("equidistant letter sequences", () => {
  it("finds a word every n-th letter, both ways", () => {
    const text = lettersOf("gxxoxxd and then dxxoxxg");
    const hits = findEls(text, "god", 5);
    expect(hits.some((h) => h.skip === 3)).toBe(true);
    expect(hits.some((h) => h.skip === -3)).toBe(true);
  });
  it("predicts chance from letter frequencies", () => {
    const text = "AB".repeat(500);
    // Every A..B pair at an odd skip: about half of all placements.
    expect(expectedEls(text, "AB", 10)).toBeGreaterThan(0);
  });
});

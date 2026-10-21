import { describe, expect, it } from "vitest";
import { runs } from "./bible";
import { parseCode, relatedCodes, renderings } from "./strongs";

describe("printed text runs", () => {
  it("separates supplied words and the words of Christ", () => {
    expect(runs("And he said, ⸢Follow me, and I will make you [to be] fishers⸣.")).toEqual([
      { text: "And he said, ", supplied: false, wj: false },
      { text: "Follow me, and I will make you ", supplied: false, wj: true },
      { text: "to be", supplied: true, wj: true },
      { text: " fishers", supplied: false, wj: true },
      { text: ".", supplied: false, wj: false },
    ]);
  });

  it("drops the pilcrow", () => {
    expect(runs("¶ In the beginning")).toEqual([{ text: "In the beginning", supplied: false, wj: false }]);
  });
});

describe("Strong's numbers", () => {
  it.each([
    ["H430", "H430"],
    ["h0430", "H430"],
    ["G26", "G26"],
    ["strong's g0026", "G26"],
    ["love", null],
    ["G", null],
  ])("parses %s", (q, want) => expect(parseCode(q)).toBe(want));

  it("finds related numbers in a derivation", () => {
    expect(relatedCodes("from G1537 (ἐκ) and G05055 (τελέω);")).toEqual(["G1537", "G5055"]);
  });

  it("counts renderings", () => {
    expect(renderings([{ words: ["love", "Love"] }, { words: ["charity"] }])).toEqual([["love", 2], ["charity", 1]]);
  });
});

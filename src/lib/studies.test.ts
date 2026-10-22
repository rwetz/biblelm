import { describe, expect, it } from "vitest";
import { readersPassages, STRUGGLES, studyRef, TO_YOUNG_MEN } from "./studies";

describe("studies", () => {
  it("parses references and refuses bad ones", () => {
    expect(studyRef("Gen.39.7-12")).toEqual({ book: "Gen", chapter: 39, verse: 7, verseEnd: 12 });
    expect(studyRef("1John.2.14")).toEqual({ book: "1John", chapter: 2, verse: 14 });
    expect(studyRef("Nope.1.1")).toBeUndefined();
    expect(studyRef("Gen.1.5-3")).toBeUndefined();
  });

  it("has well-formed studies: unique ids, every reference valid, a question for every idea", () => {
    expect(new Set(STRUGGLES.map((s) => s.id)).size).toBe(STRUGGLES.length);
    const refs = [...TO_YOUNG_MEN, ...STRUGGLES.flatMap((s) => [...s.ideas.flatMap((i) => i.refs), ...s.stories.map((x) => x.ref)])];
    expect(refs.filter((r) => !studyRef(r))).toEqual([]);
    for (const s of STRUGGLES) {
      expect(s.topics.length).toBeGreaterThan(0);
      for (const i of s.ideas) {
        expect(i.refs.length).toBeGreaterThan(0);
        expect(i.question.endsWith("?") || i.question.endsWith(".")).toBe(true);
      }
    }
  });

  it("uses no em dashes in anything a person reads", () => {
    expect(JSON.stringify(STRUGGLES)).not.toContain("—");
  });

  it("merges topics by rank and leaves out what the study already quotes", () => {
    const s = { ...STRUGGLES[0], topics: ["a", "b"] };
    const topics = [
      { name: "a", p: [10, 10, 9, 20, 22, 5, 30, 30, 1] },
      { name: "b", p: [20, 22, 8, 40, 40, 7] },
    ];
    // 20-22 is near the top of both, so it comes first; 10 is skipped.
    expect(readersPassages(topics, s, new Set([10]))).toEqual([[20, 22], [40, 40], [30, 30]]);
  });
});

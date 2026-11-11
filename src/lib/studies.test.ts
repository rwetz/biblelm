import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Translation, type TranslationMeta } from "./bible";
import { readersPassages, STRUGGLES, STUDY_GROUPS, studiesByGroup, studyRef, TO_YOUNG_MEN } from "./studies";

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

describe("studies, laid out", () => {
  it("puts every study in a known group, with no passage or title twice in one study", () => {
    const groups = new Set(STUDY_GROUPS.map((g) => g.id));
    for (const s of STRUGGLES) {
      expect(groups.has(s.group)).toBe(true);
      const titles = s.ideas.map((i) => i.title);
      expect(new Set(titles).size).toBe(titles.length);
      const stories = s.stories.map((x) => x.ref);
      expect(new Set(stories).size).toBe(stories.length);
      for (const i of s.ideas) expect(new Set(i.refs).size).toBe(i.refs.length);
    }
    expect(studiesByGroup().flatMap((g) => g.studies).length).toBe(STRUGGLES.length);
  });
});

// Against the real KJV and OpenBible topics when `pnpm data` has been run (CI builds them).
const KJV = `${process.cwd()}/public/data/bible/kjv.json`;
const META = `${process.cwd()}/public/data/translations.json`;
const TOPICS = `${process.cwd()}/public/data/topics.json`;
const have = existsSync(KJV) && existsSync(TOPICS);

describe.skipIf(!have && !process.env.BIBLELM_REQUIRE_DATA)("studies against the data", () => {
  it("quotes only verses that exist, every verse of every range", () => {
    const metas = JSON.parse(readFileSync(META, "utf8")) as TranslationMeta[];
    const t = new Translation(metas.find((m) => m.id === "kjv")!, JSON.parse(readFileSync(KJV, "utf8")));
    const refs = [...TO_YOUNG_MEN, ...STRUGGLES.flatMap((s) => [...s.ideas.flatMap((i) => i.refs), ...s.stories.map((x) => x.ref)])];
    const bad = refs.filter((s) => {
      const r = studyRef(s)!;
      return t.range(r).length !== (r.verseEnd ?? r.verse) - r.verse + 1;
    });
    expect(bad).toEqual([]);
  });

  it("names only OpenBible topics that exist", () => {
    const names = new Set((JSON.parse(readFileSync(TOPICS, "utf8")) as { name: string }[]).map((x) => x.name));
    expect(STRUGGLES.flatMap((s) => s.topics.filter((n) => !names.has(n)).map((n) => `${s.id}: ${n}`))).toEqual([]);
  });
});

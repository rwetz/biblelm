import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RANKS, SOLOMON_DEMONS, type Spirit } from "./bestiary";
import { studyRef } from "./studies";

describe("the bestiary", () => {
  it("has the Testament's demons well formed, in order, with no em dashes", () => {
    expect(new Set(SOLOMON_DEMONS.map((d) => d.id)).size).toBe(SOLOMON_DEMONS.length);
    const verses = SOLOMON_DEMONS.map((d) => studyRef(d.ref)?.verse ?? NaN);
    expect(verses).toEqual([...verses].sort((a, b) => a - b));
    for (const d of SOLOMON_DEMONS) if (d.scripture) expect(studyRef(d.scripture), d.id).toBeDefined();
    expect(JSON.stringify(SOLOMON_DEMONS)).not.toContain("—");
  });

  it.skipIf(!existsSync("public/data/bible/conybeare.json"))("puts each demon at a verse that names it", () => {
    const tsol = JSON.parse(readFileSync("public/data/bible/conybeare.json", "utf8")).books.find((b: { osis: string }) => b.osis === "TSol");
    const verse = (n: number): string => tsol.chapters[0].v.find(([v]: [number]) => v === n)?.[1] ?? "";
    for (const d of SOLOMON_DEMONS) expect(verse(studyRef(d.ref)!.verse), d.id).toContain(d.says);
  });

  it.skipIf(!existsSync("public/data/bestiary.json"))("has all seventy-two spirits, each ranked, with legions and a library section", () => {
    const spirits: Spirit[] = JSON.parse(readFileSync("public/data/bestiary.json", "utf8"));
    expect(spirits.map((s) => s.n)).toEqual(Array.from({ length: 72 }, (_, i) => i + 1));
    const ranks = RANKS.map((r) => r.rank);
    for (const s of spirits) {
      expect(s.ranks.length, s.name).toBeGreaterThan(0);
      for (const r of s.ranks) expect(ranks).toContain(r);
      expect(s.legions, s.name).toBeGreaterThan(0);
    }
    // The book's own examples of a spirit with two ranks.
    expect(spirits[44].ranks).toEqual(["King", "Earl"]);
    expect(spirits[24].ranks).toEqual(["President", "Earl"]);
    const goetia = JSON.parse(readFileSync("public/data/library/goetia.json", "utf8"));
    for (const s of spirits) expect(goetia.sections.some((x: { title: string }) => x.title === s.section), s.section).toBe(true);
  });

  it.skipIf(!existsSync("public/art/curios/seals.json"))("has a seal for every spirit", () => {
    const seals: { n: number; files: string[] }[] = JSON.parse(readFileSync("public/art/curios/seals.json", "utf8"));
    expect(seals.map((s) => s.n)).toEqual(Array.from({ length: 72 }, (_, i) => i + 1));
    for (const s of seals) for (const f of s.files) expect(existsSync(`public/art/curios/${f}`), f).toBe(true);
  });
});

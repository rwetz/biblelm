import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseOsis } from "./canon";
import { OMENS, omenOfTheDay } from "./omen";

describe("the daily omen", () => {
  it("alternates a verse and a spirit, the same all day", () => {
    const kinds = Array.from({ length: 6 }, (_, i) => omenOfTheDay(new Date(2026, 9, 20 + i, 9)).kind);
    expect(new Set(kinds)).toEqual(new Set(["verse", "spirit"]));
    expect(kinds[0]).not.toBe(kinds[1]);
    expect(omenOfTheDay(new Date(2026, 9, 26, 1))).toEqual(omenOfTheDay(new Date(2026, 9, 26, 23)));
  });

  it("meets every spirit and every omen in a year", () => {
    const spirits = new Set<number>(), verses = new Set<string>();
    for (let d = 0; d < 366; d++) {
      const o = omenOfTheDay(new Date(2028, 0, 1 + d, 12));
      if (o.kind === "spirit") spirits.add(o.n);
      else verses.add(`${o.ref.book}.${o.ref.chapter}.${o.ref.verse}`);
    }
    expect(spirits.size).toBe(72);
    expect(verses.size).toBe(OMENS.length);
  });

  it.skipIf(!existsSync("public/data/bible/kjv.json"))("names only verses the Bible has", () => {
    const have = new Set<string>();
    for (const b of JSON.parse(readFileSync("public/data/bible/kjv.json", "utf8")).books) for (const c of b.chapters) for (const [v] of c.v) have.add(`${b.osis}.${c.c}.${v}`);
    for (const o of OMENS) {
      const r = parseOsis(o)!;
      expect(have.has(`${r.book}.${r.chapter}.${r.verse}`), o).toBe(true);
    }
  });
});

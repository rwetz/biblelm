import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPANION_LINKS, companionLinks } from "./companions";

describe("links to 1 Enoch", () => {
  it("finds a link from either side, inside the passage's verses", () => {
    expect(companionLinks({ book: "Jude", chapter: 1, verse: 15 })[0].other).toMatchObject({ book: "1En", chapter: 1, verse: 9 });
    expect(companionLinks({ book: "1En", chapter: 1, verse: 9 })[0].other).toMatchObject({ book: "Jude", chapter: 1, verse: 14 });
    expect(companionLinks({ book: "Jude", chapter: 1, verse: 16 })).toEqual([]);
  });

  it.skipIf(!existsSync("public/data/bible/enoch.json"))("points only at verses that exist", () => {
    const has = (file: string) => {
      const set = new Set<string>();
      for (const b of JSON.parse(readFileSync(file, "utf8")).books) for (const c of b.chapters) for (const [v] of c.v) set.add(`${b.osis}.${c.c}.${v}`);
      return set;
    };
    const kjv = has("public/data/bible/kjv.json"), enoch = has("public/data/bible/enoch.json");
    for (const l of COMPANION_LINKS) {
      for (let v = l.canon.verse; v <= (l.canon.verseEnd ?? l.canon.verse); v++) expect(kjv.has(`${l.canon.book}.${l.canon.chapter}.${v}`)).toBe(true);
      for (let v = l.enoch.verse; v <= (l.enoch.verseEnd ?? l.enoch.verse); v++) expect(enoch.has(`1En.${l.enoch.chapter}.${v}`)).toBe(true);
    }
  });
});

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatRef } from "./canon";
import { COMPANION_LINKS, companionLinks } from "./companions";

describe("links beyond the canon", () => {
  it("finds a link from either side, inside the passage's verses", () => {
    expect(companionLinks({ book: "Jude", chapter: 1, verse: 15 })[0].other).toMatchObject({ book: "1En", chapter: 1, verse: 9 });
    expect(companionLinks({ book: "1En", chapter: 1, verse: 9 })[0].other).toMatchObject({ book: "Jude", chapter: 1, verse: 14 });
    expect(companionLinks({ book: "Jude", chapter: 1, verse: 16 })).toEqual([]);
    // Genesis 6 is retold in Enoch and in Jubilees.
    expect(companionLinks({ book: "Gen", chapter: 6, verse: 2 }).map((l) => l.other.book)).toEqual(["1En", "Jub"]);
    expect(companionLinks({ book: "TSol", chapter: 1, verse: 24 })[0].other).toMatchObject({ book: "Tob", chapter: 3, verse: 8 });
  });

  it.skipIf(!existsSync("public/data/bible/james.json"))("points only at verses that exist", () => {
    const has = (file: string) => {
      const set = new Set<string>();
      for (const b of JSON.parse(readFileSync(file, "utf8")).books) for (const c of b.chapters) for (const [v] of c.v) set.add(`${b.osis}.${c.c}.${v}`);
      return set;
    };
    const kjv = has("public/data/bible/kjv.json");
    const beyond = new Set(["enoch", "jubilees", "conybeare", "james"].flatMap((id) => [...has(`public/data/bible/${id}.json`)]));
    for (const l of COMPANION_LINKS) {
      for (let v = l.canon.verse; v <= (l.canon.verseEnd ?? l.canon.verse); v++) expect(kjv.has(`${l.canon.book}.${l.canon.chapter}.${v}`), formatRef(l.canon)).toBe(true);
      for (let v = l.beyond.verse; v <= (l.beyond.verseEnd ?? l.beyond.verse); v++) expect(beyond.has(`${l.beyond.book}.${l.beyond.chapter}.${v}`), formatRef(l.beyond)).toBe(true);
    }
  });
});

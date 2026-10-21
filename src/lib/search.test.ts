import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Translation, type TranslationMeta } from "./bible";
import { formatRef, parseOsis, parseRef } from "./canon";
import { search } from "./search";
import type { Shelf } from "./canon";

const PROT = new Set<Shelf>(["protestant"]);
const ALL = new Set<Shelf>(["protestant", "deuterocanon", "apocrypha"]);

describe("parseRef", () => {
  it.each([
    ["John 3:16", "John 3:16"],
    ["jn 3:16", "John 3:16"],
    ["1 cor 13:4-7", "1 Corinthians 13:4–7"],
    ["1cor13:4", "1 Corinthians 13:4"],
    ["Ps 23", "Psalms 23"],
    ["song of songs 2:1", "Song of Solomon 2:1"],
    ["Tobit 6:4", "Tobit 6:4"],
    ["II Maccabees 7:29", "2 Maccabees 7:29"],
  ])("%s", (q, want) => {
    const r = parseRef(q);
    expect(r && formatRef(r)).toBe(want);
  });

  it("rejects words that are not books", () => {
    expect(parseRef("love 3")).toBeUndefined();
    expect(parseRef("fishers of men")).toBeUndefined();
  });

  it("reads OSIS ranges", () => {
    expect(parseOsis("Rom.13.8-Rom.13.10")).toEqual({ book: "Rom", chapter: 13, verse: 8, verseEnd: 10 });
  });
});

// Against the real KJV when `pnpm data` has been run (CI builds it).
const KJV = `${process.cwd()}/public/data/bible/kjv.json`;
const META = `${process.cwd()}/public/data/translations.json`;
const have = existsSync(KJV);

describe.skipIf(!have && !process.env.BIBLELM_REQUIRE_DATA)("KJV search", () => {
  const load = () => {
    const metas = JSON.parse(readFileSync(META, "utf8")) as TranslationMeta[];
    return new Translation(metas.find((m) => m.id === "kjv")!, JSON.parse(readFileSync(KJV, "utf8")));
  };
  const t = have ? load() : (null as unknown as Translation);

  it("has the canonical counts on the Protestant shelf", () => {
    expect(t.onShelves(PROT).length).toBe(31_102);
    expect(search(t, "how many books", PROT)).toMatchObject({ count: 66 });
    expect(search(t, "how many chapters", PROT)).toMatchObject({ count: 1_189 });
  });

  it("includes the Apocrypha when its shelves are on", () => {
    expect(search(t, "how many books", ALL)).toMatchObject({ count: 80 });
  });

  it("looks up references", () => {
    const r = search(t, "John 3:16", PROT);
    expect(r.kind).toBe("passage");
    if (r.kind === "passage") expect(r.verses[0].text).toMatch(/^For God so loved the world/);
    expect(search(t, "Gen 1:1", PROT)).toMatchObject({ kind: "passage" });
    expect(search(t, "Ps 23", PROT)).toMatchObject({ kind: "passage" });
    expect(search(t, "Rev 99:1", PROT).kind).toBe("not_found");
  });

  it("answers the Ask questions", () => {
    expect(search(t, "how many verses in Psalms", PROT)).toMatchObject({ count: 2_461 });
    expect(search(t, "how many chapters in Isaiah", PROT)).toMatchObject({ count: 66 });
    const s = search(t, "shortest verse", PROT);
    expect(s.kind === "superlative" && formatRef(s.verse)).toBe("John 11:35");
    expect(search(t, "how many verses contain love", PROT).kind).toBe("count_verses");
    expect(search(t, "how many times does grace appear", PROT).kind).toBe("word_frequency");
  });

  it("finds phrases and keeps other shelves apart", () => {
    const r = search(t, "find fishers of men", PROT);
    expect(r.kind).toBe("search");
    const tob = search(t, "Raphael", PROT);
    expect(tob.kind === "search" && tob.count).toBe(0);
    expect(tob.kind === "search" && tob.other.length).toBeGreaterThan(0);
  });
});

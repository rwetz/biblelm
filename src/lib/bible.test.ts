import { describe, expect, it } from "vitest";
import { Translation, wholeSentence } from "./bible";
import type { Ref } from "./canon";

const GAL: Record<number, string> = {
  22: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith,",
  23: "Meekness, temperance: against such there is no law.",
  24: "And they that are Christ's have crucified the flesh with the affections and lusts.",
};
const verse = (r: Ref) => (GAL[r.verse ?? 0] ? { raw: GAL[r.verse!] } : undefined);

describe("wholeSentence", () => {
  it("reads on until the sentence ends", () => {
    const { ref, verses } = wholeSentence(verse, { book: "Gal", chapter: 5, verse: 22 });
    expect(verses.map((v) => v.n)).toEqual([22, 23]);
    expect(ref).toEqual({ book: "Gal", chapter: 5, verse: 22, verseEnd: 23 });
  });

  it("keeps a verse that already ends a sentence on its own", () => {
    const { ref, verses } = wholeSentence(verse, { book: "Gal", chapter: 5, verse: 23 });
    expect(verses).toHaveLength(1);
    expect(ref.verseEnd).toBeUndefined();
  });

  it("stops at the end of the chapter", () => {
    const open = (r: Ref) => (r.verse === 1 ? { raw: "And he said," } : undefined);
    expect(wholeSentence(open, { book: "Gen", chapter: 1, verse: 1 }).verses).toHaveLength(1);
  });
});

describe("companion texts", () => {
  const meta = (id: string, companion = false) => ({ id, name: id.toUpperCase(), abbr: id.toUpperCase(), language: "English", year: "", note: "", books: [], verses: 0, source: "", licence: "", companion });
  const kjv = () =>
    new Translation(meta("kjv"), {
      ...meta("kjv"),
      books: [
        { osis: "Gen", chapters: [{ c: 1, v: [[1, "In the beginning God created the heaven and the earth."]] }] },
        { osis: "Matt", chapters: [{ c: 1, v: [[1, "The book of the generation of Jesus Christ."]] }] },
      ],
    });
  const enoch = { books: [{ osis: "1En", chapters: [{ c: 1, v: [[1, "The words of the blessing of Enoch."]] as [number, string][] }] }] };

  it("borrows a companion's book, in its canonical place, credited to the companion", () => {
    const t = kjv();
    const charles = meta("enoch", true);
    t.borrow(charles, enoch);
    expect(t.books()).toEqual(["Gen", "1En", "Matt"]);
    expect(t.verse({ book: "1En", chapter: 1, verse: 1 })?.text).toBe("The words of the blessing of Enoch.");
    expect(t.sourceOf("1En")).toBe(charles);
    expect(t.sourceOf("Gen")).toBe(t.meta);
  });

  it("keeps its own verses apart, and never lets a companion replace its own book", () => {
    const t = kjv();
    t.borrow(meta("enoch", true), { books: [...enoch.books, { osis: "Gen", chapters: [{ c: 1, v: [[1, "Not the KJV."]] }] }] });
    expect(t.ownVerses).toHaveLength(2);
    expect(t.verses).toHaveLength(3);
    expect(t.verse({ book: "Gen", chapter: 1, verse: 1 })?.text).toMatch(/^In the beginning/);
  });

  it("reaches a borrowed book only when its shelf is on", () => {
    const t = kjv();
    t.borrow(meta("enoch", true), enoch);
    expect(t.onShelves(new Set(["protestant"])).some((v) => v.book === "1En")).toBe(false);
    expect(t.onShelves(new Set(["protestant", "pseudepigrapha"])).some((v) => v.book === "1En")).toBe(true);
  });
});

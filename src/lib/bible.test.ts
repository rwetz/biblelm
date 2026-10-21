import { describe, expect, it } from "vitest";
import { wholeSentence } from "./bible";
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

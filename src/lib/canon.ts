// The canon: every book BibleLM knows, which shelf it sits on, and how to
// read a reference a person types ("1 cor 13:4-7", "Ps 23", "jn3:16").
// books.json is shared with the offline data builders in scripts/data.

import BOOKS_JSON from "./data/books.json";

export type Shelf = "protestant" | "deuterocanon" | "apocrypha";
export type Testament = "OT" | "NT";

export interface Book {
  osis: string;
  code: string;
  name: string;
  testament: Testament;
  shelf: Shelf;
  aliases: string[];
}

export const BOOKS: readonly Book[] = BOOKS_JSON as Book[];
const BY_OSIS = new Map(BOOKS.map((b) => [b.osis, b]));

export const SHELVES: { id: Shelf; label: string; blurb: string }[] = [
  { id: "protestant", label: "Protestant canon", blurb: "The 66 books." },
  { id: "deuterocanon", label: "Deuterocanon", blurb: "Tobit, Judith, Wisdom, Sirach, Baruch, Maccabees and the Greek additions." },
  { id: "apocrypha", label: "Apocrypha", blurb: "1 and 2 Esdras, the Prayer of Manasseh, Psalm 151, 3 and 4 Maccabees." },
];

export function book(osis: string): Book | undefined {
  return BY_OSIS.get(osis);
}

export function bookName(osis: string): string {
  return BY_OSIS.get(osis)?.name ?? osis;
}

const norm = (s: string) => s.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();

const ALIAS = (() => {
  const m = new Map<string, string>();
  for (const b of BOOKS) {
    m.set(norm(b.name), b.osis);
    m.set(norm(b.osis), b.osis);
    m.set(norm(b.code), b.osis);
    for (const a of b.aliases) m.set(norm(a), b.osis);
    // "1 John" also as "1john", "first john"
    const num = /^([123]) (.+)$/.exec(norm(b.name));
    if (num) {
      m.set(num[1] + num[2], b.osis);
      m.set(["first", "second", "third"][+num[1] - 1] + " " + num[2], b.osis);
    }
  }
  return m;
})();

export function resolveBook(name: string): string | undefined {
  const n = norm(name);
  return ALIAS.get(n) ?? ALIAS.get(n.replace(/ /g, ""));
}

/** A position in the text: verse 0 means "the whole chapter". */
export interface Ref {
  book: string;
  chapter: number;
  verse: number;
  /** Inclusive end verse of a range in the same chapter. */
  verseEnd?: number;
}

const REF_RE = /^\s*((?:[123]\s*)?[a-z][a-z .]*?)\s*(\d+)(?:\s*[:.]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/i;

/** "John 3:16", "ps 23", "1 cor 13:4-7" -> Ref, or undefined. */
export function parseRef(input: string): Ref | undefined {
  const m = REF_RE.exec(input);
  if (!m) return undefined;
  const osis = resolveBook(m[1]);
  if (!osis) return undefined;
  const ref: Ref = { book: osis, chapter: +m[2], verse: m[3] ? +m[3] : 0 };
  if (m[4] && +m[4] > ref.verse) ref.verseEnd = +m[4];
  return ref;
}

/** "Gen.1.1" or "Gen.1.1-Gen.1.3" (OSIS) -> Ref. */
export function parseOsis(osis: string): Ref | undefined {
  const [a, z] = osis.split("-");
  const [b, c, v] = a.split(".");
  if (!BY_OSIS.has(b)) return undefined;
  const ref: Ref = { book: b, chapter: +c, verse: v ? +v : 0 };
  if (z) {
    const [zb, zc, zv] = z.split(".");
    if (zb === b && +zc === ref.chapter && +zv > ref.verse) ref.verseEnd = +zv;
  }
  return ref;
}

export function osisOf(r: Ref): string {
  return r.verse ? `${r.book}.${r.chapter}.${r.verse}` : `${r.book}.${r.chapter}`;
}

export function formatRef(r: Ref): string {
  const name = bookName(r.book);
  if (!r.verse) return `${name} ${r.chapter}`;
  return `${name} ${r.chapter}:${r.verse}${r.verseEnd ? `–${r.verseEnd}` : ""}`;
}

export function sameChapter(a: Ref, b: Ref): boolean {
  return a.book === b.book && a.chapter === b.chapter;
}

// The verse store. Texts are compact JSON built by scripts/data/build-bible.mjs
// and served from /data (Vite's public/ in dev, the bundle in a release), so
// reading and searching need no backend at all. Each translation keeps its own
// versification; the KJV index (refs.json) is the spine that cross references,
// topics and embeddings key on.

import { book, type Ref, type Shelf } from "./canon";

export interface TranslationMeta {
  id: string;
  name: string;
  abbr: string;
  language: string;
  year: string;
  note: string;
  books: string[];
  verses: number;
  source: string;
  licence: string;
  /** Has a Strong's word list (bible/<id>.strongs.json). */
  strongs?: boolean;
  /** Marks the words of Christ (⸢ … ⸣ in the printed text). */
  redLetter?: boolean;
}

interface ChapterData {
  c: number;
  v: [number, string][];
}
interface BookData {
  osis: string;
  chapters: ChapterData[];
}
interface TranslationData extends Omit<TranslationMeta, "books" | "verses" | "source" | "licence" | "strongs" | "redLetter"> {
  books: BookData[];
}

export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  /** As printed: may hold [supplied words] and ⸢words of Christ⸣. */
  raw: string;
  /** Plain text for search and display without markup. */
  text: string;
  /** Starts a paragraph (pilcrow in the source). */
  para: boolean;
}

export class Translation {
  readonly meta: TranslationMeta;
  private readonly byBook = new Map<string, Map<number, Verse[]>>();
  /** Every verse, canonical order. */
  readonly verses: Verse[] = [];

  constructor(meta: TranslationMeta, data: TranslationData) {
    this.meta = meta;
    for (const b of data.books) {
      const chapters = new Map<number, Verse[]>();
      for (const ch of b.chapters) {
        const list = ch.v.map(([v, raw]) => toVerse(b.osis, ch.c, v, raw));
        chapters.set(ch.c, list);
        this.verses.push(...list);
      }
      this.byBook.set(b.osis, chapters);
    }
  }

  hasBook(osis: string): boolean {
    return this.byBook.has(osis);
  }

  books(): string[] {
    return [...this.byBook.keys()];
  }

  chapters(osis: string): number[] {
    return [...(this.byBook.get(osis)?.keys() ?? [])];
  }

  chapter(osis: string, c: number): Verse[] {
    return this.byBook.get(osis)?.get(c) ?? [];
  }

  verse(r: Ref): Verse | undefined {
    return this.chapter(r.book, r.chapter).find((v) => v.verse === r.verse);
  }

  /** The verses a ref covers (a whole chapter when verse is 0). */
  range(r: Ref): Verse[] {
    const ch = this.chapter(r.book, r.chapter);
    if (!r.verse) return ch;
    const end = r.verseEnd ?? r.verse;
    return ch.filter((v) => v.verse >= r.verse && v.verse <= end);
  }

  onShelves(shelves: ReadonlySet<Shelf>): Verse[] {
    return this.verses.filter((v) => shelves.has(book(v.book)?.shelf ?? "protestant"));
  }
}

const SUPPLIED = /\[([^\]]*)\]/g;

function toVerse(bookId: string, chapter: number, verse: number, raw: string): Verse {
  const para = raw.startsWith("¶");
  const body = para ? raw.slice(1).trimStart() : raw;
  return {
    book: bookId,
    chapter,
    verse,
    raw: body,
    text: body.replace(SUPPLIED, "$1").replace(WJ, "").replace(/¶\s*/g, "").replace(/\s+/g, " ").trim(),
    para,
  };
}

export const WJ_OPEN = "⸢";
export const WJ_CLOSE = "⸣";
const WJ = /[⸢⸣]/g;

export interface Run {
  text: string;
  /** A word the translators supplied (KJV italics). */
  supplied: boolean;
  /** Spoken by Christ (red letter). */
  wj: boolean;
}

/** Split printed text into runs: plain, supplied words (italics), words of Christ. */
export function runs(raw: string): Run[] {
  const out: Run[] = [];
  let supplied = false;
  let wj = false;
  let buf = "";
  const push = () => {
    if (buf) out.push({ text: buf, supplied, wj });
    buf = "";
  };
  for (const ch of raw.replace(/¶\s*/g, "")) {
    if (ch === "[" || ch === "]" || ch === WJ_OPEN || ch === WJ_CLOSE) {
      push();
      if (ch === "[") supplied = true;
      else if (ch === "]") supplied = false;
      else wj = ch === WJ_OPEN;
    } else buf += ch;
  }
  push();
  return out;
}

/** Plain text of a verse, markup removed. */
export const plainText = (raw: string) => runs(raw).map((r) => r.text).join("").trim();

/**
 * A verse quoted on its own can stop mid-sentence (Galatians 5:22 ends
 * "faith,"), so read on, at most three more verses, until the sentence ends.
 */
export function wholeSentence(verse: (r: Ref) => { raw: string } | undefined, start: Ref): { ref: Ref; verses: { n: number; raw: string }[] } {
  const verses: { n: number; raw: string }[] = [];
  for (let n = start.verse || 1; verses.length < 4; n++) {
    const v = verse({ ...start, verse: n });
    if (!v) break;
    verses.push({ n, raw: v.raw });
    if (/[.?!][)'"’”]*$/.test(plainText(v.raw))) break;
  }
  const last = verses[verses.length - 1]?.n;
  return { ref: last && last !== start.verse ? { ...start, verseEnd: last } : start, verses };
}

// ── loading ───────────────────────────────────────────────────────────────

const BASE = `${import.meta.env.BASE_URL}data`;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}. Run "pnpm data" to build the Bible data.`);
  return res.json() as Promise<T>;
}

export async function getBinary(path: string): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}. Run "pnpm data" to build the Bible data.`);
  return res.arrayBuffer();
}

let catalog: Promise<TranslationMeta[]> | null = null;
const loaded = new Map<string, Promise<Translation>>();

export function listTranslations(): Promise<TranslationMeta[]> {
  catalog ??= getJson<TranslationMeta[]>("translations.json");
  return catalog;
}

export function loadTranslation(id: string): Promise<Translation> {
  let p = loaded.get(id);
  if (!p) {
    p = (async () => {
      const metas = await listTranslations();
      const meta = metas.find((m) => m.id === id);
      if (!meta) throw new Error(`Unknown translation "${id}"`);
      return new Translation(meta, await getJson<TranslationData>(`bible/${id}.json`));
    })();
    p.catch(() => loaded.delete(id));
    loaded.set(id, p);
  }
  return p;
}

// ── the KJV verse index ───────────────────────────────────────────────────

export interface VerseIndex {
  refs: string[];
  of: (osis: string) => number | undefined;
  ref: (i: number) => Ref;
}

let index: Promise<VerseIndex> | null = null;

export function loadIndex(): Promise<VerseIndex> {
  index ??= getJson<string[]>("refs.json").then((refs) => {
    const map = new Map(refs.map((r, i) => [r, i]));
    return {
      refs,
      of: (osis: string) => map.get(osis),
      ref: (i: number) => {
        const [b, c, v] = refs[i].split(".");
        return { book: b, chapter: +c, verse: +v };
      },
    };
  });
  return index;
}

/** For tests: forget everything loaded. */
export function resetBibleCache(): void {
  catalog = null;
  index = null;
  loaded.clear();
}

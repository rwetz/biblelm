// The Sub Rosa library: books read beside the Bible, never as it (the Goetia,
// Dionysius, Dante, Milton, the Masons). Built by scripts/data/library.mjs
// into /data/library.json (the catalogue) and /data/library/<id>.json. Each
// text is split into the sections its book prints; a paragraph starting "## "
// is a heading inside one. Loaded only under the rose.

import { getJson } from "./bible";

export interface LibrarySection {
  title: string;
  /** A canto's argument, a chapter's subtitle, the author of a preface. */
  sub?: string;
}

export interface LibraryEntry {
  id: string;
  title: string;
  /** A subtitle of the book itself. */
  sub?: string;
  author?: string;
  translator?: string;
  year: string;
  source: string;
  licence: string;
  /** What it is and why it is here, in a line or two. */
  gist: string;
  /** Said when only part of the book is here. */
  excerpt?: string;
  note?: string;
  /** Poetry: lines kept as printed. */
  verse?: boolean;
  words: number;
  sections: LibrarySection[];
}

export interface LibraryText extends Omit<LibraryEntry, "sections" | "words" | "licence"> {
  sections: (LibrarySection & { paras: string[] })[];
}

let catalogue: Promise<LibraryEntry[]> | null = null;
const texts = new Map<string, Promise<LibraryText>>();

export function loadLibrary(): Promise<LibraryEntry[]> {
  catalogue ??= getJson<LibraryEntry[]>("library.json");
  catalogue.catch(() => (catalogue = null));
  return catalogue;
}

export function loadLibraryText(id: string): Promise<LibraryText> {
  let p = texts.get(id);
  if (!p) {
    p = getJson<LibraryText>(`library/${id}.json`);
    p.catch(() => texts.delete(id));
    texts.set(id, p);
  }
  return p;
}

/** "Dante Alighieri, translated by Henry Wadsworth Longfellow, 1867". */
export function byline(t: Pick<LibraryEntry, "author" | "translator" | "year">): string {
  return [t.author, t.translator && `translated by ${t.translator}`, t.year].filter(Boolean).join(", ");
}

/** A heading inside a section ("## II"), or null for a paragraph. */
export const headingOf = (para: string): string | null => (para.startsWith("## ") ? para.slice(3) : null);

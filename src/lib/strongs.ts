// Word study: Strong's numbers. The KJV and WEB tag each word with the Hebrew
// or Greek lemma behind it (bible/<id>.strongs.json, from eBible's USFM), and
// Strong's 1890 dictionaries give each lemma's meaning (strongs-lexicon.json,
// OpenScriptures' JSON edition, CC-BY-SA). A lookup, not a model.

import { getBinary } from "./bible";

export interface LexEntry {
  /** Lemma in Hebrew or Greek script. */
  l: string;
  /** Transliteration. */
  t: string;
  /** Pronunciation. */
  p: string;
  /** Strong's definition. */
  d: string;
  /** How the KJV renders it. */
  k: string;
  /** Derivation, with references to other numbers. */
  o: string;
}

export type Tagged = [word: string, code: string];

const json = async <T,>(path: string): Promise<T> => JSON.parse(new TextDecoder().decode(await getBinary(path))) as T;

let lexicon: Promise<Record<string, LexEntry>> | null = null;
export function loadLexicon() {
  lexicon ??= json<Record<string, LexEntry>>("strongs-lexicon.json");
  lexicon.catch(() => (lexicon = null));
  return lexicon;
}

const tags = new Map<string, Promise<Record<string, Tagged[]>>>();
export function loadTags(translation: string) {
  let p = tags.get(translation);
  if (!p) {
    p = json<Record<string, Tagged[]>>(`bible/${translation}.strongs.json`);
    p.catch(() => tags.delete(translation));
    tags.set(translation, p);
  }
  return p;
}

/** "h430", "G26", "strong's g0026" -> "H430" / "G26", or null. */
export function parseCode(input: string): string | null {
  const m = /^\s*(?:strong'?s\s+)?([HG])0*(\d{1,4}[a-z]?)\s*$/i.exec(input);
  return m ? `${m[1].toUpperCase()}${m[2]}` : null;
}

/** Hebrew codes are read right to left. */
export const isHebrew = (code: string) => code.startsWith("H");

const concordances = new Map<string, Promise<Map<string, { osis: string; words: string[] }[]>>>();

/** Every verse that uses each number, in canonical order, with the English words used. */
export function loadConcordance(translation: string) {
  let p = concordances.get(translation);
  if (!p) {
    p = loadTags(translation).then((all) => {
      const m = new Map<string, { osis: string; words: string[] }[]>();
      for (const [osis, words] of Object.entries(all)) {
        const byCode = new Map<string, string[]>();
        for (const [w, c] of words) byCode.set(c, [...(byCode.get(c) ?? []), w]);
        for (const [c, ws] of byCode) {
          let list = m.get(c);
          if (!list) m.set(c, (list = []));
          list.push({ osis, words: ws });
        }
      }
      return m;
    });
    concordances.set(translation, p);
  }
  return p;
}

/** How the translation renders a number: each English word and how often. */
export function renderings(hits: { words: string[] }[]): [string, number][] {
  const n = new Map<string, number>();
  for (const h of hits) for (const w of h.words) n.set(w.toLowerCase(), (n.get(w.toLowerCase()) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1]);
}

/** The other numbers a derivation refers to ("from G1537 and G5055"). */
export const relatedCodes = (derivation: string) => [...new Set(derivation.match(/[HG]\d+/g) ?? [])].map((c) => c.replace(/^([HG])0+/, "$1"));

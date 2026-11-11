// The interlinear: the Hebrew (Leningrad Codex) and Greek (NA28 base text)
// under the English, word by word, from STEPBible's TAHOT and TAGNT (Tyndale
// House, CC BY 4.0), built by scripts/data/interlinear.mjs. Keyed by the
// English (KJV) chapter and verse; one file per book, loaded when needed.

import { getBinary } from "./bible";

/** [word, transliteration, English gloss, Strong's, grammar code] */
export type Word = [string, string, string, string, string];
export type BookWords = Record<string, Word[]>;

const books = new Map<string, Promise<BookWords | null>>();

export function loadInterlinear(book: string): Promise<BookWords | null> {
  let p = books.get(book);
  if (!p) {
    // A book with no file (the deuterocanon, the Pseudepigrapha) is null, and
    // so is one that will not parse: left unhandled, the reader waited on it
    // forever.
    p = getBinary(`interlinear/${book}.json`)
      .then((b) => JSON.parse(new TextDecoder().decode(b)) as BookWords)
      .catch(() => null);
    books.set(book, p);
  }
  return p;
}

/** Hebrew reads right to left. */
export const isHebrew = (w: Word[]) => /[֐-׿]/.test(w[0]?.[0] ?? "");

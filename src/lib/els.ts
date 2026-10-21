// "Bible codes" and why they are not (IDEAS.md, Honest statistics).
//
// An equidistant letter sequence (ELS) spells a word by taking every d-th
// letter of a text. In 1994 Witztum, Rips and Rosenberg reported meaningful
// ELS in Genesis; McKay, Bar-Natan, Bar-Hillel and Kalai then found equally
// striking "codes" in Moby-Dick and showed how freedom in the search makes
// such finds certain. Here the same search runs on both texts of the same
// length, next to the number chance alone predicts.

import { getBinary, type Translation } from "./bible";

export const lettersOf = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");

let moby: Promise<string> | null = null;
export function loadMoby(): Promise<string> {
  moby ??= getBinary("moby-dick.txt").then((b) => new TextDecoder().decode(b));
  moby.catch(() => (moby = null));
  return moby;
}

/** The letters of a book (or several), as one string. */
export function bookLetters(t: Translation, books: string[]): string {
  return lettersOf(t.verses.filter((v) => books.includes(v.book)).map((v) => v.text).join(""));
}

export interface ElsHit {
  start: number;
  skip: number;
}

/** Every place `word` appears as an ELS with skip 2..maxSkip, either direction. */
export function findEls(text: string, word: string, maxSkip = 300, limit = 200_000): ElsHit[] {
  const w = lettersOf(word);
  const out: ElsHit[] = [];
  if (w.length < 2) return out;
  const n = text.length;
  const first = w.charCodeAt(0);
  for (let i = 0; i < n; i++) {
    if (text.charCodeAt(i) !== first) continue;
    for (let d = 2; d <= maxSkip; d++)
      for (const s of [d, -d]) {
        const last = i + s * (w.length - 1);
        if (last < 0 || last >= n) continue;
        let k = 1;
        while (k < w.length && text.charCodeAt(i + s * k) === w.charCodeAt(k)) k++;
        if (k === w.length) {
          out.push({ start: i, skip: s });
          if (out.length >= limit) return out;
        }
      }
  }
  return out;
}

/**
 * How many hits chance alone predicts: every possible placement times the
 * probability that the letters line up, from the text's own letter frequencies.
 */
export function expectedEls(text: string, word: string, maxSkip = 300): number {
  const w = lettersOf(word);
  const freq = new Float64Array(26);
  for (let i = 0; i < text.length; i++) freq[text.charCodeAt(i) - 65]++;
  for (let i = 0; i < 26; i++) freq[i] /= text.length || 1;
  let p = 1;
  for (const c of w) p *= freq[c.charCodeAt(0) - 65];
  let places = 0;
  for (let d = 2; d <= maxSkip; d++) places += 2 * Math.max(0, text.length - d * (w.length - 1));
  return places * p;
}

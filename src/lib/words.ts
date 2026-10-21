// Counting words: plain corpus statistics over one translation's 66 books.
// Every number here is a count or a formula over counts (docs/IDEAS.md):
//   distinctive  tf-idf: words a book uses far more than the rest of the Bible
//   collocates   pointwise mutual information: words that travel together
//   hapax        words that occur exactly once
//   zipf         frequency against rank, which is nearly a straight line
//   delta        Burrows' Delta: distance in style between books, from how
//                often each uses the commonest words. It measures style, not
//                authorship or inspiration, and scholars disagree on what it proves.

import type { Translation, Verse } from "./bible";
import { BOOKS } from "./canon";

export const tokens = (text: string): string[] => text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];

interface Counts {
  books: string[];
  /** word -> count, per book */
  per: Map<string, Map<string, number>>;
  /** words per book */
  size: Map<string, number>;
  total: Map<string, number>;
  /** word -> first verse it occurs in (for hapax) */
  first: Map<string, Verse>;
  verses: Verse[];
  n: number;
}

const cache = new Map<string, Counts>();

export function counts(t: Translation): Counts {
  const hit = cache.get(t.meta.id);
  if (hit) return hit;
  const canon = new Set(BOOKS.filter((b) => b.shelf === "protestant").map((b) => b.osis));
  const verses = t.verses.filter((v) => canon.has(v.book));
  const per = new Map<string, Map<string, number>>();
  const size = new Map<string, number>();
  const total = new Map<string, number>();
  const first = new Map<string, Verse>();
  let n = 0;
  for (const v of verses) {
    let m = per.get(v.book);
    if (!m) per.set(v.book, (m = new Map()));
    for (const w of tokens(v.text)) {
      m.set(w, (m.get(w) ?? 0) + 1);
      total.set(w, (total.get(w) ?? 0) + 1);
      if (!first.has(w)) first.set(w, v);
      size.set(v.book, (size.get(v.book) ?? 0) + 1);
      n++;
    }
  }
  const c = { books: [...per.keys()], per, size, total, first, verses, n };
  cache.set(t.meta.id, c);
  return c;
}

/** tf-idf: the words that make a book itself. */
export function distinctive(t: Translation, book: string, limit = 24): { word: string; count: number; score: number }[] {
  const c = counts(t);
  const m = c.per.get(book);
  if (!m) return [];
  const size = c.size.get(book) ?? 1;
  const df = (w: string) => c.books.reduce((k, b) => k + (c.per.get(b)!.has(w) ? 1 : 0), 0);
  return [...m]
    .filter(([, k]) => k >= 3)
    .map(([word, count]) => ({ word, count, score: (count / size) * Math.log(c.books.length / df(word)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Words that travel with `word` within four words either side, ranked by
 * pointwise mutual information weighted by how often (so a pair seen twice
 * does not outrank one seen two hundred times).
 */
export function collocates(t: Translation, word: string, limit = 24, window = 4): { word: string; together: number; pmi: number }[] {
  const c = counts(t);
  const target = word.toLowerCase().trim();
  const fw = c.total.get(target);
  if (!fw) return [];
  const near = new Map<string, number>();
  for (const v of c.verses) {
    const ws = tokens(v.text);
    ws.forEach((w, i) => {
      if (w !== target) return;
      for (let j = Math.max(0, i - window); j <= Math.min(ws.length - 1, i + window); j++) if (j !== i) near.set(ws[j], (near.get(ws[j]) ?? 0) + 1);
    });
  }
  // The hundred commonest words keep company with everything; leave them out.
  const common = new Set([...c.total].sort((a, b) => b[1] - a[1]).slice(0, 100).map(([w]) => w));
  return [...near]
    .filter(([w, k]) => k >= 3 && w !== target && !common.has(w))
    .map(([w, k]) => {
      const pmi = Math.log2((k * c.n) / (fw * (c.total.get(w) ?? 1) * 2 * window));
      return { word: w, together: k, pmi };
    })
    .filter((x) => x.pmi > 0)
    .sort((a, b) => b.pmi * Math.log(1 + b.together) - a.pmi * Math.log(1 + a.together))
    .slice(0, limit);
}

/** Words that occur exactly once, with the verse. */
export function hapax(t: Translation): { word: string; verse: Verse }[] {
  const c = counts(t);
  return [...c.total].filter(([, k]) => k === 1).map(([word]) => ({ word, verse: c.first.get(word)! })).sort((a, b) => a.word.localeCompare(b.word));
}

/** Zipf: frequencies by rank, and the slope of log frequency on log rank (about -1). */
export function zipf(t: Translation): { ranks: number[]; slope: number; words: string[] } {
  const c = counts(t);
  const sorted = [...c.total].sort((a, b) => b[1] - a[1]);
  const ranks = sorted.map(([, k]) => k);
  // Least squares on log-log over ranks 10..1000, where the law holds best.
  let sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
  for (let r = 10; r <= Math.min(1000, ranks.length); r++) {
    const x = Math.log(r), y = Math.log(ranks[r - 1]);
    sx += x; sy += y; sxx += x * x; sxy += x * y; n++;
  }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { ranks, slope, words: sorted.slice(0, 30).map(([w]) => w) };
}

/**
 * Burrows' Delta (2002): z-score each book's rate of the `top` commonest
 * words against all books, then a book's distance to another is the mean
 * absolute difference of those z-scores. Smaller is more alike in style.
 */
export function delta(t: Translation, top = 150): { books: string[]; d: (a: string, b: string) => number } {
  const c = counts(t);
  const common = [...c.total].sort((a, b) => b[1] - a[1]).slice(0, top).map(([w]) => w);
  const books = c.books.filter((b) => (c.size.get(b) ?? 0) >= 1000); // too short to have a style
  const rate = new Map(books.map((b) => [b, common.map((w) => (c.per.get(b)!.get(w) ?? 0) / c.size.get(b)!)]));
  const mean = common.map((_, i) => books.reduce((s, b) => s + rate.get(b)![i], 0) / books.length);
  const sd = common.map((_, i) => Math.sqrt(books.reduce((s, b) => s + (rate.get(b)![i] - mean[i]) ** 2, 0) / books.length) || 1);
  const z = new Map(books.map((b) => [b, rate.get(b)!.map((r, i) => (r - mean[i]) / sd[i])]));
  return {
    books,
    d: (a, b) => {
      const za = z.get(a), zb = z.get(b);
      if (!za || !zb) return NaN;
      return za.reduce((s, x, i) => s + Math.abs(x - zb[i]), 0) / common.length;
    },
  };
}

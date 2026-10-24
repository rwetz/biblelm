// Deterministic search: references, counts and phrase finding over a loaded
// translation. A port of python/biblelm/search.py (the Ask grammar) that works
// on any translation and respects canon shelves. No model is involved: rules
// and arithmetic stay in code.

import { foldAccents, type Translation, type Verse } from "./bible";
import { book, bookName, formatRef, parseRef, resolveBook, type Ref, type Shelf } from "./canon";

export type SearchResult =
  | { kind: "passage"; ref: Ref; verses: Verse[] }
  | { kind: "count_verses"; word: string; count: number; sample: Verse[] }
  | { kind: "word_frequency"; word: string; count: number }
  | { kind: "book_verse_count"; book: string; count: number }
  | { kind: "book_chapter_count"; book: string; count: number }
  | { kind: "total_verses"; count: number }
  | { kind: "total_books"; count: number; books: string[] }
  | { kind: "total_chapters"; count: number }
  | { kind: "total_words"; count: number }
  | { kind: "superlative"; label: string; verse: Verse }
  | { kind: "search"; word: string; count: number; results: Verse[]; other: Verse[] }
  | { kind: "not_found"; message: string }
  | { kind: "no_results"; message: string };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (w: string, flags = "i") => new RegExp(`(?<![\\p{L}\\p{N}])${escape(w)}(?![\\p{L}\\p{N}])`, `u${flags}`);

export function countWord(word: string, text: string): number {
  return text.match(wordRe(word, "gi"))?.length ?? 0;
}

export function hasWord(word: string, text: string): boolean {
  return wordRe(word).test(text);
}

/** Verses containing `word`, split into enabled shelves and the rest. */
export function find(t: Translation, word: string, shelves: ReadonlySet<Shelf>, limit = 200) {
  const re = wordRe(foldAccents(word));
  const results: Verse[] = [];
  const other: Verse[] = [];
  let count = 0;
  for (const v of t.verses) {
    if (!re.test(v.folded ?? v.text)) continue;
    if (shelves.has(book(v.book)?.shelf ?? "protestant")) {
      count++;
      if (results.length < limit) results.push(v);
    } else if (other.length < 20) other.push(v);
  }
  return { count, results, other };
}

export function search(t: Translation, query: string, shelves: ReadonlySet<Shelf>): SearchResult {
  const q = query.trim();
  const ql = q.toLowerCase();
  const verses = t.onShelves(shelves);
  if (!q) return { kind: "no_results", message: "Type a reference, a word or a question." };

  // 1. A reference: "John 3:16", "Ps 23", "1 Cor 13:4-7"
  const ref = parseRef(q);
  if (ref) {
    if (!t.hasBook(ref.book)) {
      return { kind: "not_found", message: `${bookName(ref.book)} is not in the ${t.meta.abbr}.` };
    }
    const vs = t.range(ref);
    if (vs.length) return { kind: "passage", ref, verses: vs };
    return { kind: "not_found", message: `${formatRef(ref)} was not found in the ${t.meta.abbr}.` };
  }

  // 2. How many times does X appear
  let m = /how many times (?:does|is|do)\s+["']?(.+?)["']?\s+(?:appear|occur|mentioned|used|found)/.exec(ql);
  if (m) {
    const word = m[1].trim();
    return { kind: "word_frequency", word, count: verses.reduce((n, v) => n + countWord(word, v.text), 0) };
  }

  // 3. How many verses contain X
  m = /how many verses (?:contain|mention|have|include|with|about)\s+(?:the (?:word|phrase)\s+)?["']?(.+?)["']?\s*$/.exec(ql);
  if (m) {
    const word = m[1].trim();
    const matched = verses.filter((v) => hasWord(word, v.text));
    return { kind: "count_verses", word, count: matched.length, sample: matched.slice(0, 5) };
  }

  // 4. How many verses in Book
  m = /how many verses (?:in|of|are in|in the book of)\s+(.+)/.exec(ql) ?? /how many verses does (.+?) have/.exec(ql);
  if (m) {
    const b = resolveBook(m[1].replace(/\?$/, ""));
    if (b) return { kind: "book_verse_count", book: b, count: t.verses.filter((v) => v.book === b).length };
  }

  // 5. How many chapters in Book
  m = /how many chapters (?:in|of|are in|in the book of)\s+(.+)/.exec(ql) ?? /how many chapters does (.+?) have/.exec(ql);
  if (m) {
    const b = resolveBook(m[1].replace(/\?$/, ""));
    if (b) return { kind: "book_chapter_count", book: b, count: t.chapters(b).length };
  }

  // 6. Totals
  if (/how many verses/.test(ql)) return { kind: "total_verses", count: verses.length };
  if (/how many books/.test(ql)) {
    const books = [...new Set(verses.map((v) => v.book))];
    return { kind: "total_books", count: books.length, books };
  }
  if (/how many chapters/.test(ql)) {
    return { kind: "total_chapters", count: new Set(verses.map((v) => `${v.book}.${v.chapter}`)).size };
  }
  if (/how many words/.test(ql)) {
    return { kind: "total_words", count: verses.reduce((n, v) => n + v.text.split(/\s+/).length, 0) };
  }

  // 7. Longest / shortest verse
  if (ql.includes("longest verse")) {
    const verse = verses.reduce((a, b) => (b.text.length > a.text.length ? b : a));
    return { kind: "superlative", label: `Longest verse in the ${t.meta.abbr}`, verse };
  }
  if (ql.includes("shortest verse")) {
    const verse = verses.reduce((a, b) => (b.text.length > 0 && b.text.length < a.text.length ? b : a));
    return { kind: "superlative", label: `Shortest verse in the ${t.meta.abbr}`, verse };
  }

  // 8. find / search / verses about X, else the whole query as a phrase
  m = /^(?:find|search|show(?:\s+me)?|verses?(?:\s+(?:containing|with|about|for))?)\s+(?:about|containing|with|for|me|verses?\s+(?:containing|with|about))?\s*["']?(.+?)["']?\s*$/.exec(ql);
  const word = (m?.[1] ?? ql).trim();
  if (word) {
    const r = find(t, word, shelves);
    if (r.count || r.other.length) return { kind: "search", word, ...r };
  }
  return { kind: "no_results", message: `No verse in the ${t.meta.abbr} uses those exact words.` };
}

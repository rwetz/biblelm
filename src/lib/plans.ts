// Reading plans: deterministic portions of Scripture per day, worked out from
// the text itself (chapters weighted by their verse counts so each day is
// about the same length). Your progress is kept in notes.json (PlanProgress).
// The Daily Office is not here: it follows the calendar (src/lib/lectionary.ts).

import type { Translation } from "./bible";
import { BOOKS, bookName, type Ref } from "./canon";

export interface Plan {
  id: string;
  name: string;
  blurb: string;
  days: number;
}

export const PLANS: Plan[] = [
  { id: "year", name: "The Bible in a year", blurb: "Genesis to Revelation, about four chapters a day.", days: 365 },
  { id: "nt90", name: "The New Testament in ninety days", blurb: "Matthew to Revelation, about three chapters a day.", days: 90 },
  { id: "gospels", name: "The Gospels in a month", blurb: "Matthew, Mark, Luke and John in thirty days.", days: 30 },
  { id: "psalms", name: "Psalms and Proverbs in a month", blurb: "Five psalms and a chapter of Proverbs a day: the old monastic habit.", days: 31 },
];

type Chapter = { book: string; chapter: number; verses: number };

function chaptersOf(t: Translation, books: string[]): Chapter[] {
  return books.flatMap((b) => t.chapters(b).map((c) => ({ book: b, chapter: c, verses: t.chapter(b, c).length })));
}

/** Split chapters into `days` runs of about equal verse count. */
function split(chs: Chapter[], days: number): Chapter[][] {
  const total = chs.reduce((n, c) => n + c.verses, 0);
  const out: Chapter[][] = Array.from({ length: days }, () => []);
  let acc = 0;
  for (const c of chs) {
    const d = Math.min(days - 1, Math.floor(((acc + c.verses / 2) / total) * days));
    out[d].push(c);
    acc += c.verses;
  }
  return out;
}

const cache = new Map<string, Ref[][]>();

/** Every day's chapters for a plan (index 0 = day 1). */
export function planDays(planId: string, t: Translation): Ref[][] {
  const key = `${planId}:${t.meta.id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canon = BOOKS.filter((b) => b.shelf === "protestant" && t.hasBook(b.osis));
  const nt = canon.filter((b) => b.testament === "NT").map((b) => b.osis);
  let days: Chapter[][];
  if (planId === "year") days = split(chaptersOf(t, canon.map((b) => b.osis)), 365);
  else if (planId === "nt90") days = split(chaptersOf(t, nt), 90);
  else if (planId === "gospels") days = split(chaptersOf(t, ["Matt", "Mark", "Luke", "John"]), 30);
  else if (planId === "psalms")
    days = Array.from({ length: 31 }, (_, d) => [
      ...Array.from({ length: 5 }, (_, k) => d * 5 + k + 1).filter((p) => p <= 150).map((p) => ({ book: "Ps", chapter: p, verses: 0 })),
      { book: "Prov", chapter: d + 1, verses: 0 },
    ]);
  else days = [];
  const refs = days.map((d) => d.map((c) => ({ book: c.book, chapter: c.chapter, verse: 0 })));
  cache.set(key, refs);
  return refs;
}

/** "Genesis 1-3, Matthew 1" from a day's chapters. */
export function portionLabel(day: Ref[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < day.length) {
    let j = i;
    while (j + 1 < day.length && day[j + 1].book === day[i].book && day[j + 1].chapter === day[j].chapter + 1) j++;
    const name = day[i].book === "Ps" ? (i === j ? "Psalm" : "Psalms") : bookName(day[i].book);
    parts.push(i === j ? `${name} ${day[i].chapter}` : `${name} ${day[i].chapter}-${day[j].chapter}`);
    i = j + 1;
  }
  return parts.join(", ");
}

/** Which day of a plan today is (1-based), from its start date "YYYY-MM-DD". */
export function planDay(started: string, now = new Date()): number {
  const [y, m, d] = started.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today - start) / 86_400_000) + 1;
}

export const todayISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

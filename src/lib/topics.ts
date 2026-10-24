// OpenBible.info's topical Bible (CC-BY): 6,700 topics, each with passages
// scored by reader votes, over the KJV verse index.

import { getBinary, loadIndex } from "./bible";

export interface Topic {
  name: string;
  /** Flat [start, end, score] triples over the verse index. */
  p: number[];
}

let topics: Promise<Topic[]> | null = null;

export function loadTopics(): Promise<Topic[]> {
  topics ??= getBinary("topics.json").then((b) => JSON.parse(new TextDecoder().decode(b)) as Topic[]);
  return topics;
}

export function passages(t: Topic): { start: number; end: number; score: number }[] {
  const out = [];
  for (let i = 0; i < t.p.length; i += 3) out.push({ start: t.p[i], end: t.p[i + 1], score: t.p[i + 2] });
  return out.sort((a, b) => b.score - a.score);
}

/** Topics whose name matches the query: prefix matches first, then substrings. */
export function findTopics(all: Topic[], query: string, limit = 30): Topic[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: Topic[] = [];
  const contains: Topic[] = [];
  for (const t of all) {
    const n = t.name.toLowerCase();
    if (n === q || n.startsWith(q)) starts.push(t);
    else if (n.includes(q)) contains.push(t);
  }
  const weight = (t: Topic) => t.p.length;
  return [...starts.sort((a, b) => weight(b) - weight(a)), ...contains.sort((a, b) => weight(b) - weight(a))].slice(0, limit);
}

const QUIET = new Set("a an and are about after again also am any be been being but by can could do does for from had has have how i if in into is it its just me more most my not of on or our over should so some than that the their them then there these they this those to too very was we were what when where which while who why will with would you your feel feeling feels verse verses bible scripture scriptures".split(" "));
const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !QUIET.has(w));

/** Two words share a stem: "anxious" and "anxiety", "forgive" and "forgiveness". */
export function sameStem(a: string, b: string): boolean {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n >= Math.max(4, Math.ceil(0.55 * Math.min(a.length, b.length))) || (a === b);
}

/**
 * The verses readers vote for under the topics a question names, best first:
 * a topic counts when every word of its name ("being anxious", "worry and
 * anxiety") shares a stem with a word of the query. Fused with search by
 * meaning, it lifts the verses people actually turn to (Philippians 4:6 for
 * "when I feel anxious") above ones that only sound alike.
 */
export function votedVerses(all: Topic[], query: string, limit = 30): number[] {
  const q = words(query);
  if (!q.length) return [];
  const score = new Map<number, number>();
  for (const t of all) {
    const name = words(t.name);
    if (!name.length || !name.every((w) => q.some((x) => sameStem(w, x)))) continue;
    // A topic naming more of the question is the surer guide.
    const weight = name.length;
    // Scores run to 100 on a few one-passage topics; cap near the 99th percentile so one cannot drown the rest.
    for (const p of passages(t)) score.set(p.start, (score.get(p.start) ?? 0) + Math.min(p.score, 20) * weight);
  }
  return [...score].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([v]) => v);
}

/** Topics that list a verse, strongest first. */
export async function topicsForVerse(verse: number, limit = 12): Promise<{ topic: Topic; score: number }[]> {
  const all = await loadTopics();
  await loadIndex();
  const hits: { topic: Topic; score: number }[] = [];
  for (const t of all) {
    for (let i = 0; i < t.p.length; i += 3) {
      if (verse >= t.p[i] && verse <= t.p[i + 1]) {
        hits.push({ topic: t, score: t.p[i + 2] });
        break;
      }
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** What kind of subject each topic is, tagged offline by Jev (scripts/data/topic-kinds.mjs). */
export interface TopicKinds {
  source: string;
  kinds: string[];
  /** name -> [kind, probability] */
  tags: Record<string, [string, number]>;
}

let kinds: Promise<TopicKinds | null> | null = null;

export function loadTopicKinds(): Promise<TopicKinds | null> {
  kinds ??= getBinary("topic-kinds.json")
    .then((b) => JSON.parse(new TextDecoder().decode(b)) as TopicKinds)
    .catch(() => null);
  return kinds;
}

const OT_GENRES = new Set(["Law", "History", "Wisdom and poetry", "Prophets"]);

/** Where a topic's passages sit: its commonest genre, that genre's share, and the testament. */
export interface TopicPlace {
  genre: string;
  share: number;
  testament: "ot" | "nt" | "both";
}

/** Where every topic lives in Scripture, from its passages' books (counted by vote-weighted passage). */
export function topicPlaces(all: Topic[], refs: readonly string[], genreOf: (book: string) => string): Map<string, TopicPlace> {
  const out = new Map<string, TopicPlace>();
  for (const t of all) {
    const by = new Map<string, number>();
    let ot = 0, n = 0;
    for (let i = 0; i < t.p.length; i += 3) {
      const book = refs[t.p[i]]?.split(".")[0];
      if (!book) continue;
      const g = genreOf(book);
      by.set(g, (by.get(g) ?? 0) + 1);
      if (OT_GENRES.has(g)) ot++;
      n++;
    }
    let genre = "Other", top = 0;
    for (const [g, c] of by) if (c > top) { top = c; genre = g; }
    out.set(t.name, { genre, share: n ? top / n : 0, testament: !n ? "both" : ot / n >= 0.7 ? "ot" : ot / n <= 0.3 ? "nt" : "both" });
  }
  return out;
}

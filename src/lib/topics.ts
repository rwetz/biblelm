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

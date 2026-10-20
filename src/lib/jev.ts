// Jev (TypeSafe System One): small bounded judgments, never text. Per the
// workspace rules, Jev only ranks, routes or flags; exact rules, lookups and
// arithmetic stay in code (a book's genre is a table below, not a question).
// The request is made by Rust with TYPESAFE_API_KEY from the user's own
// environment; the key never reaches this page. With no key, every function
// here returns null and the app behaves exactly as without Jev.

import { backend } from "./backend";

export const MODEL = "jev-latest";

type Choice = { choice: string; confidence: number };
type Score = { score: number; confidence: number; legend: string[] };
type Answers = Record<string, Choice | Score>;
export type JevResponse = { answers: Answers; usage?: Record<string, number> };

let available: Promise<boolean> | null = null;
export function jevAvailable(): Promise<boolean> {
  available ??= backend.jevAvailable().catch(() => false);
  return available;
}

/** Bypass for a session ("bypass jev"). */
let bypass = false;
export const setJevBypass = (on: boolean) => (bypass = on);

// ── contract 1: how to treat a query ─────────────────────────────────────

export const ROUTE_QUESTIONS = {
  intent: {
    type: "choice",
    instructions: "A person typed this into a Bible study search box. What are they most likely looking for?",
    criteria: {
      words: "Verses containing these exact words or this phrase",
      theme: "Passages about a theme, idea or situation, whatever words they use",
      story: "A particular narrative, event or person in the Bible",
      question: "An answer to a question, which the app should meet with relevant passages, not a reply",
    },
  },
};

export const ROUTE_LABELS: Record<string, string> = {
  words: "Jev read this as exact words",
  theme: "Jev read this as a theme",
  story: "Jev read this as a story or person",
  question: "Jev read this as a question; here are passages, not an answer",
};

/** Pure: a route response to a label, or null when Jev is unsure. */
export function decideRoute(r: JevResponse, minConfidence = 0.6): string | null {
  const a = r.answers.intent as Choice | undefined;
  if (!a || a.confidence < minConfidence) return null;
  return ROUTE_LABELS[a.choice] ?? null;
}

export async function routeQuery(query: string): Promise<string | null> {
  if (bypass || !(await jevAvailable())) return null;
  try {
    const r = (await backend.jev({ task: "route", input: { model: MODEL, state: { query }, questions: ROUTE_QUESTIONS } })) as JevResponse;
    return decideRoute(r);
  } catch {
    return null;
  }
}

// ── contract 2: rerank candidates for a study question ────────────────────

export function rerankQuestions(question: string, verses: { ref: string; text: string }[]) {
  return Object.fromEntries(
    verses.map((v, i) => [
      `v${i}`,
      {
        type: "score",
        instructions: `How directly does ${v.ref} speak to this study question: "${question}"? Judge only this verse: "${v.text}"`,
        criteria: [
          "Not about the question at all",
          "Touches it in passing",
          "Clearly relevant",
          "Speaks to it directly and centrally",
        ],
      },
    ]),
  );
}

/**
 * Pure: reorder candidates by Jev's relevance level, breaking ties by the
 * original (embedding) order. Low-confidence judgments keep their position.
 */
export function decideRerank<T>(items: T[], r: JevResponse, minConfidence = 0.55): { item: T; level: number | null }[] {
  return items
    .map((item, i) => {
      const a = r.answers[`v${i}`] as Score | undefined;
      const level = a && a.confidence >= minConfidence ? a.score : null;
      return { item, level, i };
    })
    .sort((x, y) => (y.level ?? 1.5) - (x.level ?? 1.5) || x.i - y.i)
    .map(({ item, level }) => ({ item, level }));
}

export async function rerank<T>(question: string, items: T[], toVerse: (t: T) => { ref: string; text: string }) {
  if (bypass || !(await jevAvailable()) || !items.length) return null;
  try {
    const r = (await backend.jev({
      task: "rerank",
      input: { model: MODEL, state: { question }, questions: rerankQuestions(question, items.map(toVerse)) },
    })) as JevResponse;
    return decideRerank(items, r);
  } catch {
    return null;
  }
}

// ── in code, not Jev: genre is a lookup ───────────────────────────────────

const GENRE: [string, string[]][] = [
  ["Law", ["Gen", "Exod", "Lev", "Num", "Deut"]],
  ["History", ["Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Tob", "Jdt", "AddEsth", "1Macc", "2Macc", "3Macc", "1Esd"]],
  ["Wisdom and poetry", ["Job", "Ps", "Prov", "Eccl", "Song", "Wis", "Sir", "AddPs", "PrMan", "4Macc"]],
  ["Prophets", ["Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal", "Bar", "EpJer", "PrAzar", "Sus", "Bel", "DanGr", "2Esd"]],
  ["Gospels", ["Matt", "Mark", "Luke", "John"]],
  ["Acts", ["Acts"]],
  ["Epistles", ["Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John", "2John", "3John", "Jude"]],
  ["Apocalyptic", ["Rev"]],
];
const GENRE_OF = new Map(GENRE.flatMap(([g, books]) => books.map((b) => [b, g] as const)));
export const genreOf = (osisBook: string) => GENRE_OF.get(osisBook) ?? "Other";

// Jev (TypeSafe System One): small bounded judgments, never text. Per the
// workspace rules, Jev only ranks, routes or flags; exact rules, lookups and
// arithmetic stay in code (a book's genre is a table below, not a question).
// The request is made by Rust with TYPESAFE_API_KEY from the user's own
// environment; the key never reaches this page. With no key, every function
// here returns null and the app behaves exactly as without Jev.

import { backend } from "./backend";

export { MODEL, ROUTE_QUESTIONS, VERSE_QUESTIONS, XREF_LEVELS, xrefQuestions, JUDGE_QUESTIONS, ANSWER_LEVELS, answerQuestions, clauses, rerankQuestions, decideRerank } from "./jev-contracts";
import { MODEL, ROUTE_QUESTIONS, VERSE_QUESTIONS, xrefQuestions, JUDGE_QUESTIONS, answerQuestions, rerankQuestions, decideRerank } from "./jev-contracts";

type Choice = { choice: string; confidence: number; probabilities?: Record<string, number> };
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
  const r = await readQuery(query);
  return r ? decideRoute(r.response) : null;
}

// ── live readings: fast enough to run as you type or click ───────────────

/** One judgment, timed end to end (IPC, network and model), for showing live. */
export type Reading = { choice: string; confidence: number; probabilities: Record<string, number>; ms: number; response: JevResponse };

const cache = new Map<string, Promise<Reading | null>>();

async function timed(task: string, key: string, input: unknown, question: string): Promise<Reading | null> {
  if (bypass || !(await jevAvailable())) return null;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      const t0 = performance.now();
      try {
        const response = (await backend.jev({ task, input })) as JevResponse;
        const a = response.answers[question] as Choice | undefined;
        if (!a) return null;
        return { choice: a.choice, confidence: a.confidence, probabilities: a.probabilities ?? { [a.choice]: a.confidence }, ms: performance.now() - t0, response };
      } catch {
        cache.delete(key); // a failed call can be retried
        return null;
      }
    })();
    cache.set(key, p);
  }
  return p;
}

/** How Jev reads a search query (contract 1), cached per query. */
export function readQuery(query: string): Promise<Reading | null> {
  const q = query.trim();
  return timed("route", `route:${q.toLowerCase()}`, { model: MODEL, state: { query: q }, questions: ROUTE_QUESTIONS }, "intent");
}

// ── contract 3: what kind of passage a verse is ───────────────────────────

/** How Jev reads one verse, cached per reference and translation. */
export function readVerse(ref: string, text: string, translation: string): Promise<Reading | null> {
  return timed("verse", `verse:${translation}:${ref}`, { model: MODEL, state: { reference: ref, text }, questions: VERSE_QUESTIONS }, "kind");
}

// ── contract 2: rerank candidates for a study question ────────────────────

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

// ── contract 4: which cross references speak to this verse most closely ─

export type XrefRanking<T> = { ranked: { item: T; level: number | null }[]; ms: number };
const xrefCache = new Map<string, Promise<XrefRanking<number> | null>>();

/**
 * Rank cross references (given as indices into `refs`) by closeness to the
 * source verse, in one call. Cached per source; null without Jev.
 */
export function rankXrefs(key: string, source: { ref: string; text: string }, refs: { ref: string; text: string }[]): Promise<XrefRanking<number> | null> {
  let p = xrefCache.get(key);
  if (!p) {
    p = (async () => {
      if (bypass || !(await jevAvailable()) || !refs.length) return null;
      const t0 = performance.now();
      try {
        const r = (await backend.jev({ task: "xref", input: { model: MODEL, state: { verse: source.ref }, questions: xrefQuestions(source, refs) } })) as JevResponse;
        const ranked = decideRerank(
          refs.map((_, i) => i),
          { answers: Object.fromEntries(Object.entries(r.answers).map(([k, v]) => [k.replace("x", "v"), v])) },
        );
        return { ranked, ms: performance.now() - t0 };
      } catch {
        xrefCache.delete(key);
        return null;
      }
    })();
    xrefCache.set(key, p);
  }
  return p;
}

// ── contract 5: judge what the Lab's model wrote (never Scripture) ───────

export type Judgment = { style: number; sense: number; ms: number };

/** Two scores (0 to 3) for a generated passage. Null without Jev. */
export async function judgeGenerated(text: string): Promise<Judgment | null> {
  if (bypass || !(await jevAvailable()) || text.trim().length < 20) return null;
  const t0 = performance.now();
  try {
    const r = (await backend.jev({ task: "judge", input: { model: MODEL, state: { generated: text.slice(0, 2000) }, questions: JUDGE_QUESTIONS } })) as JevResponse;
    const style = r.answers.style as Score | undefined, sense = r.answers.sense as Score | undefined;
    if (!style || !sense) return null;
    return { style: style.score, sense: sense.score, ms: performance.now() - t0 };
  } catch {
    return null;
  }
}

// ── contract 6: answer a question by choosing, never by writing ──────────

export type AnswerPick = {
  /** A hand-written note on the text, when the question is about the book. */
  note: { id: string; p: number } | null;
  /** Passages that answer, best first: index into the candidates, level 0..3, and the clause that answers. */
  passages: { i: number; level: number; clause: number | null }[];
};

/**
 * Pure: what to show for a question. A note needs a clear choice; a passage
 * must at least give part of an answer, and only the best three are kept.
 */
export function decideAnswer(r: JevResponse, count: number, minLevel = 1.8): AnswerPick {
  const n = r.answers.note as Choice | undefined;
  const np = n ? (n.probabilities?.[n.choice] ?? n.confidence) : 0;
  const note = n && n.choice !== "none" && np >= 0.5 ? { id: n.choice, p: np } : null;
  const passages: AnswerPick["passages"] = [];
  for (let i = 0; i < count; i++) {
    const a = r.answers[`a${i}`] as Score | undefined;
    if (!a || a.confidence < 0.4 || a.score < minLevel) continue;
    const c = r.answers[`c${i}`] as Choice | undefined;
    const cp = c ? (c.probabilities?.[c.choice] ?? c.confidence) : 0;
    passages.push({ i, level: a.score, clause: c && cp >= 0.4 ? Number(c.choice.slice(1)) : null });
  }
  passages.sort((x, y) => y.level - x.level || x.i - y.i);
  return { note, passages: passages.slice(0, 3) };
}

const answerCache = new Map<string, Promise<AnswerPick | null>>();

/** Which of these passages (and which notes) answer a question; null without Jev. */
export function findAnswer(question: string, passages: { ref: string; text: string; clauses: string[] }[], notes: { id: string; about: string }[]): Promise<AnswerPick | null> {
  const key = `${question.trim().toLowerCase()}|${passages.map((p) => p.ref).join(",")}`;
  let p = answerCache.get(key);
  if (!p) {
    p = (async () => {
      if (bypass || !(await jevAvailable())) return null;
      try {
        const r = (await backend.jev({ task: "answer", input: { model: MODEL, state: { question }, questions: answerQuestions(question, passages, notes) } })) as JevResponse;
        return decideAnswer(r, passages.length);
      } catch {
        answerCache.delete(key);
        return null;
      }
    })();
    answerCache.set(key, p);
  }
  return p;
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

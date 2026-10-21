// FSRS: the Free Spaced Repetition Scheduler (Jarrett Ye, 2022), the modern
// successor to Anki's SM-2, used for learning verses by heart. A memory has a
// stability (days until recall falls to 90%) and a difficulty (1 to 10); each
// review updates both from how well you remembered. FSRS-4.5's published
// default weights; a plain formula, no model.

export type Grade = 1 | 2 | 3 | 4; // again, hard, good, easy

export interface Card {
  id: string;
  /** OSIS of the verse, or the first verse of a range. */
  ref: string;
  /** Inclusive end of a range in the same chapter, OSIS. */
  end?: string;
  created: number;
  /** When it is next due, ms since the epoch. */
  due: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  /** Last review, ms; 0 for a new card. */
  last: number;
}

const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5;
const FACTOR = 19 / 81; // so that recall is exactly 90% after `stability` days
const DAY = 86_400_000;
const RETENTION = 0.9;

const clampD = (d: number) => Math.min(10, Math.max(1, d));
const initD = (g: Grade) => clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1);

/** Probability of recall after `days` with stability `s`. */
export const retrievability = (days: number, s: number) => (1 + (FACTOR * days) / s) ** DECAY;

/** Days until recall falls to the target retention. */
export const interval = (s: number) => Math.max(1, Math.round((s / FACTOR) * (RETENTION ** (1 / DECAY) - 1)));

export function newCard(id: string, ref: string, end: string | undefined, now = Date.now()): Card {
  return { id, ref, ...(end ? { end } : {}), created: now, due: now, stability: 0, difficulty: 0, reps: 0, lapses: 0, last: 0 };
}

/** The card after a review graded `g` at `now`. */
export function review(c: Card, g: Grade, now = Date.now()): Card {
  let { stability: s, difficulty: d } = c;
  if (c.reps === 0) {
    s = W[g - 1];
    d = initD(g);
  } else {
    const r = retrievability(Math.max(0, (now - c.last) / DAY), s);
    // Difficulty moves with the grade and reverts a little to the mean.
    d = clampD(W[7] * initD(4) + (1 - W[7]) * (d - W[6] * (g - 3)));
    if (g === 1) {
      s = W[11] * d ** -W[12] * ((s + 1) ** W[13] - 1) * Math.exp(W[14] * (1 - r));
    } else {
      const hard = g === 2 ? W[15] : 1, easy = g === 4 ? W[16] : 1;
      s = s * (Math.exp(W[8]) * (11 - d) * s ** -W[9] * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy + 1);
    }
  }
  // "Again" comes back in ten minutes; anything else after its interval.
  const due = g === 1 ? now + 10 * 60_000 : now + interval(s) * DAY;
  return { ...c, stability: s, difficulty: d, reps: c.reps + 1, lapses: c.lapses + (g === 1 && c.reps > 0 ? 1 : 0), last: now, due };
}

/** What each grade would do now, for the buttons: days until it comes back (0 = today). */
export function preview(c: Card, now = Date.now()): Record<Grade, number> {
  const out = {} as Record<Grade, number>;
  for (const g of [1, 2, 3, 4] as Grade[]) out[g] = Math.round((review(c, g, now).due - now) / DAY);
  return out;
}

export const isDue = (c: Card, now = Date.now()) => c.due <= now;

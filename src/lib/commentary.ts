// Grounded commentary (opt-in). Retrieval first: the prompt carries the
// passage and the verses the app found around it, and the model must cite
// them by reference. The request is made by Rust (commentary command) with a
// key from the OS keychain. Output is always labelled as generated.

import { backend } from "./backend";

export const COMMENTARY_MODEL = "claude-opus-5-5";

export const SYSTEM = `You help a person study the Bible. You are a study aid, not an authority.
Use only the passages provided between <passage> and <context> tags as Scripture. Quote or refer to them by their reference in square brackets, like [John 3:16], and only those references.
Offer: historical and literary context, how the passage connects to the cross references given, and three or four questions for reflection.
Do not claim to speak for God, do not predict the future, and do not give pastoral or doctrinal verdicts. Where Christian traditions read a passage differently, say so briefly and fairly.
Keep it under 350 words. Plain prose with short headings; no preamble.`;

export interface Grounding {
  ref: string;
  text: string;
  translation: string;
  context: { ref: string; text: string }[];
}

export function buildPrompt(g: Grounding): string {
  const ctx = g.context.map((c) => `[${c.ref}] ${c.text}`).join("\n");
  return `<passage translation="${g.translation}">\n[${g.ref}] ${g.text}\n</passage>\n<context>\n${ctx}\n</context>\n\nGive study notes on [${g.ref}].`;
}

/** References the model cited that were not in the grounding: shown as a warning. */
export function uncited(answer: string, g: Grounding): string[] {
  const allowed = new Set([g.ref, ...g.context.map((c) => c.ref)]);
  const cited = [...answer.matchAll(/\[([1-3]?\s?[A-Z][A-Za-z ]+ \d+:\d+(?:[–-]\d+)?)\]/g)].map((m) => m[1]);
  return [...new Set(cited.filter((c) => !allowed.has(c)))];
}

export async function commentary(g: Grounding): Promise<string> {
  return backend.commentary({ system: SYSTEM, prompt: buildPrompt(g), model: COMMENTARY_MODEL });
}

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { answer, nextQuestion, QUESTIONS } from "./quiz";
import { studyRef } from "./studies";

describe("Scripture or myth?", () => {
  it("is well formed: unique ids, verses for every answer, an origin for every myth, no em dashes", () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS) {
      expect(q.refs.length, q.id).toBeGreaterThan(0);
      for (const r of q.refs) expect(studyRef(r), `${q.id}: ${r}`).toBeDefined();
      expect(!!q.origin, q.id).toBe(!q.scripture);
    }
    expect(JSON.stringify(QUESTIONS)).not.toContain("—");
  });

  it("asks new questions in order, and brings a wrong one back before a right one", () => {
    const now = Date.UTC(2026, 9, 26);
    let cards = {};
    expect(nextQuestion(cards, now)?.id).toBe(QUESTIONS[0].id);
    cards = answer(cards, QUESTIONS[0], false, now);
    cards = answer(cards, QUESTIONS[1], true, now);
    expect(nextQuestion(cards, now)?.id).toBe(QUESTIONS[2].id);
    // An hour on, the wrong one is due again; the right one is not.
    expect(nextQuestion(cards, now + 3_600_000)?.id).toBe(QUESTIONS[0].id);
  });

  it.skipIf(!existsSync("public/data/bible/kjv.json"))("points only at verses that exist", () => {
    const have = new Set<string>();
    for (const b of JSON.parse(readFileSync("public/data/bible/kjv.json", "utf8")).books) for (const c of b.chapters) for (const [v] of c.v) have.add(`${b.osis}.${c.c}.${v}`);
    for (const q of QUESTIONS) for (const r of q.refs) expect(have.has(r), `${q.id}: ${r}`).toBe(true);
  });
});

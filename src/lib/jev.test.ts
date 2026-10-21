import { describe, expect, it } from "vitest";
import { answerQuestions, clauses, decideAnswer, decideRerank, decideRoute, genreOf, JUDGE_QUESTIONS, rerankQuestions, routeQuery, VERSE_QUESTIONS, XREF_LEVELS, xrefQuestions } from "./jev";

describe("Jev contracts (pure parts)", () => {
  it("routes only when confident", () => {
    expect(decideRoute({ answers: { intent: { choice: "theme", confidence: 0.9 } } })).toMatch(/theme/);
    expect(decideRoute({ answers: { intent: { choice: "theme", confidence: 0.4 } } })).toBeNull();
  });

  it("reranks by level and keeps unsure items in place", () => {
    const items = ["a", "b", "c", "d"];
    const out = decideRerank(items, {
      answers: {
        v0: { score: 0, confidence: 0.9, legend: [] },
        v1: { score: 3, confidence: 0.9, legend: [] },
        v2: { score: 2, confidence: 0.2, legend: [] },
        v3: { score: 2, confidence: 0.8, legend: [] },
      },
    });
    expect(out.map((o) => o.item)).toEqual(["b", "d", "c", "a"]);
    expect(out[2].level).toBeNull();
  });

  it("asks a verse one choice with a no-nonsense set of kinds", () => {
    expect(VERSE_QUESTIONS.kind.type).toBe("choice");
    expect(Object.keys(VERSE_QUESTIONS.kind.criteria)).toEqual(["narrative", "law", "praise", "lament", "prophecy", "teaching", "prayer", "list"]);
  });

  it("scores each cross reference against the open verse on four levels", () => {
    const q = xrefQuestions({ ref: "John 3:16", text: "For God so loved" }, [{ ref: "Rom 5:8", text: "But God commendeth" }, { ref: "1 John 4:9", text: "In this was manifested" }]);
    expect(Object.keys(q)).toEqual(["x0", "x1"]);
    expect(q.x1.criteria).toBe(XREF_LEVELS);
    expect(q.x0.instructions).toContain("John 3:16");
  });

  it("judges generated text on style and sense, never as Scripture", () => {
    expect(Object.keys(JUDGE_QUESTIONS)).toEqual(["style", "sense"]);
    expect(JUDGE_QUESTIONS.style.instructions).toMatch(/language model/);
  });

  it("asks one bounded question per candidate", () => {
    const q = rerankQuestions("What is grace?", [{ ref: "Eph 2:8", text: "For by grace are ye saved" }]);
    expect(Object.keys(q)).toEqual(["v0"]);
    expect(q.v0.type).toBe("score");
    expect(q.v0.criteria).toHaveLength(4);
  });

  it("keeps lookups in code", () => {
    expect(genreOf("Ps")).toBe("Wisdom and poetry");
    expect(genreOf("Rev")).toBe("Apocalyptic");
  });

  it("is silent without the desktop app or a key", async () => {
    expect(await routeQuery("fear not")).toBeNull();
  });
});

describe("answering a question by choosing", () => {
  it("cuts a verse into clauses at its punctuation, folding tiny pieces back", () => {
    expect(clauses("Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.")).toEqual([
      "Yea, though I walk through the valley of the shadow of death,",
      "I will fear no evil:",
      "for thou art with me;",
      "thy rod and thy staff they comfort me.",
    ]);
    expect(clauses("Jesus wept.")).toEqual(["Jesus wept."]);
  });

  it("never offers more than six clauses", () => {
    expect(clauses("One two three, four five six, seven eight nine, ten eleven twelve, a b c, d e f, g h i, j k l.")).toHaveLength(6);
  });

  it("asks one note question and a score and clause choice per passage", () => {
    const q = answerQuestions("why?", [{ ref: "A 1:1", text: "x, y z w.", clauses: ["x,", "y z w."] }, { ref: "B 1:1", text: "Short.", clauses: ["Short."] }], [{ id: "lord", about: "LORD" }]);
    expect(Object.keys(q)).toEqual(["note", "a0", "c0", "a1"]);
    expect((q.note as { criteria: Record<string, string> }).criteria).toHaveProperty("none");
  });

  it("keeps a clear note and passages that at least partly answer, best first", () => {
    const pick = decideAnswer(
      {
        answers: {
          note: { choice: "lord", confidence: 0.9, probabilities: { lord: 0.9, none: 0.1 } },
          a0: { score: 1.2, confidence: 0.8, legend: [] },
          a1: { score: 2.9, confidence: 0.8, legend: [] },
          c1: { choice: "c2", confidence: 0.7, probabilities: { c2: 0.7 } },
          a2: { score: 2.4, confidence: 0.2, legend: [] },
        },
      },
      3,
    );
    expect(pick).toEqual({ note: { id: "lord", p: 0.9 }, passages: [{ i: 1, level: 2.9, clause: 2 }] });
  });

  it("shows no note when the best choice is none", () => {
    const pick = decideAnswer({ answers: { note: { choice: "none", confidence: 0.95 } } }, 0);
    expect(pick.note).toBeNull();
  });
});

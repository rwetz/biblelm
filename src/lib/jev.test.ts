import { describe, expect, it } from "vitest";
import { decideRerank, decideRoute, genreOf, rerankQuestions, routeQuery } from "./jev";

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

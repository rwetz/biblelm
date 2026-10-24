import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { sameStem, topicPlaces, votedVerses, type Topic } from "./topics";

const refs = ["Gen.1.1", "Ps.23.1", "Matt.5.9", "Rom.8.28", "Rom.12.2"];
const genre = (b: string) => ({ Gen: "Law", Ps: "Wisdom and poetry", Matt: "Gospels", Rom: "Epistles" })[b] ?? "Other";

describe("topicPlaces", () => {
  it("names the commonest genre, its share and the testament", () => {
    const t: Topic = { name: "renewal", p: [2, 2, 10, 3, 3, 50, 4, 4, 30] };
    expect(topicPlaces([t], refs, genre).get("renewal")).toEqual({ genre: "Epistles", share: 2 / 3, testament: "nt" });
  });
  it("calls a topic spread across both testaments both", () => {
    const t: Topic = { name: "peace", p: [1, 1, 10, 2, 2, 10] };
    expect(topicPlaces([t], refs, genre).get("peace")?.testament).toBe("both");
  });
});

describe("votedVerses", () => {
  it("matches words that share a stem, and only those", () => {
    expect(sameStem("anxious", "anxiety")).toBe(true);
    expect(sameStem("forgive", "forgiveness")).toBe(true);
    expect(sameStem("tomorrow", "tomorrow")).toBe(true);
    expect(sameStem("anxious", "answer")).toBe(false);
    expect(sameStem("fear", "feast")).toBe(false);
  });

  it("takes a topic only when every word of its name is in the question", () => {
    const t = (name: string, start: number, score = 5): Topic => ({ name, p: [start, start, score] });
    const all = [t("anxiety", 1, 4), t("being anxious", 2, 3), t("worry and anxiety", 3, 9), t("tomorrow", 4, 2)];
    expect(votedVerses(all, "when I feel anxious about tomorrow")).toEqual([1, 2, 4]);
    expect(votedVerses(all, "verses about the")).toEqual([]);
  });

  const DATA = "public/data/topics.json";
  it.skipIf(!existsSync(DATA))("puts the verses readers vote for first, on the real topics", () => {
    const all = JSON.parse(readFileSync(DATA, "utf8")) as Topic[];
    const refs = JSON.parse(readFileSync("public/data/refs.json", "utf8")) as string[];
    const top = votedVerses(all, "when I feel anxious about tomorrow", 5).map((i) => refs[i]);
    expect(top).toContain("Phil.4.6");
    expect(top).toContain("1Pet.5.7");
  });
});

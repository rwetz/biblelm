import { describe, expect, it } from "vitest";
import { topicPlaces, type Topic } from "./topics";

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

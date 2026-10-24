import { describe, expect, it } from "vitest";
import { localDay, paintingForDay, seasonalHero, type Hero, type Painting } from "./art";

const paintings = ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({ id }) as Painting);
const heroes = ["dore-001", "dore-193", "dore-194"].map((plate) => ({ id: plate, plate }) as Hero);
const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min);

describe("the day's picture", () => {
  it("keeps one painting for the whole local day, early morning to late evening", () => {
    const morning = paintingForDay(paintings, at(2026, 10, 23, 0, 30));
    expect(paintingForDay(paintings, at(2026, 10, 23, 18, 59))).toBe(morning);
    expect(paintingForDay(paintings, at(2026, 10, 23, 23, 30))).toBe(morning);
    expect(paintingForDay(paintings, at(2026, 10, 24, 0, 30))).not.toBe(morning);
  });

  it("starts Advent at local midnight on its Sunday, not the evening before", () => {
    // Advent 2026 begins on Sunday 29 November.
    expect(seasonalHero(heroes, at(2026, 11, 28, 22, 0))?.plate).toBe("dore-001");
    expect(seasonalHero(heroes, at(2026, 11, 29, 0, 30))?.plate).toBe("dore-193");
  });

  it("numbers calendar days whatever the hour", () => {
    expect(localDay(at(2026, 10, 23, 23, 59)) - localDay(at(2026, 10, 23, 0, 0))).toBe(0);
    expect(localDay(at(2026, 10, 24, 0, 0)) - localDay(at(2026, 10, 23, 23, 59))).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { localDay, PAGE_PLATES, pagePainting, pagePlate, paintingForDay, roseHero, ROSE_PLATES, seasonalHero, SIDEBAR_PLATES, type Hero, type Painting } from "./art";

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

describe("under the rose", () => {
  const rose = ["r1", "r2", "r3"].map((id) => ({ id, rose: true }) as Painting);

  it("gives every page and sidebar plate a Sub Rosa plate, and none otherwise", () => {
    for (const n of [...Object.values(PAGE_PLATES), ...Object.values(SIDEBAR_PLATES)]) {
      expect(pagePlate(n, true)).toBeGreaterThan(2000);
      expect(pagePlate(n, false)).toBe(n);
    }
    expect(new Set(Object.values(ROSE_PLATES)).size).toBe(Object.keys(ROSE_PLATES).length);
  });

  it("turns the day's painting through its own paintings only", () => {
    const days = [20, 21, 22, 23].map((d) => paintingForDay([...paintings, ...rose], at(2026, 10, d, 12)));
    expect(days.every((p) => p?.rose)).toBe(true);
    expect(new Set(days.map((p) => p?.id)).size).toBe(3);
  });

  it("picks Home's hero from its own heroes, and none when they are not loaded", () => {
    expect(roseHero([...heroes, { id: "x", plate: "x", rose: true } as Hero])?.id).toBe("x");
    expect(roseHero(heroes)).toBeUndefined();
  });

  it("names a painting for each page that has one", () => {
    expect(pagePainting("gallery", false)).toBe("calling-of-matthew");
    expect(pagePainting("gallery", true)).toBe("fall-of-the-rebel-angels");
  });
});

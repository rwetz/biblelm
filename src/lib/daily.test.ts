import { describe, expect, it } from "vitest";
import { interval, newCard, preview, retrievability, review } from "./fsrs";
import { adventSunday, lessonRef, officeFor, type Lectionary, type OfficeDay } from "./lectionary";
import { planDay, portionLabel } from "./plans";

const day = (p: Partial<OfficeDay>): OfficeDay => ({ day: "Sunday", psalms: { morning: [], evening: [] }, lessons: {}, ...p });

describe("FSRS", () => {
  it("recalls 90% after exactly `stability` days", () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 5);
    expect(interval(10)).toBe(10);
  });
  it("spaces a well-known verse further out each time, and pulls a lapse back", () => {
    let c = newCard("c", "John.3.16", undefined, 0);
    c = review(c, 3, 0);
    const first = c.due;
    c = review(c, 3, c.due);
    expect(c.due - c.last).toBeGreaterThan(first);
    const lapsed = review(c, 1, c.due);
    expect(lapsed.stability).toBeLessThan(c.stability);
    expect(lapsed.lapses).toBe(1);
    const p = preview(c, c.due);
    expect(p[4]).toBeGreaterThanOrEqual(p[3]);
    expect(p[3]).toBeGreaterThanOrEqual(p[2]);
  });
});

describe("the Daily Office calendar", () => {
  it("finds Advent Sunday", () => {
    expect(adventSunday(2026).toDateString()).toBe(new Date(2026, 10, 29).toDateString());
    expect(adventSunday(2023).toDateString()).toBe(new Date(2023, 11, 3).toDateString());
  });
  it("picks the year and the week", () => {
    const l: Lectionary = {
      source: "",
      one: [day({ week: "Week of 1 Advent", day: "Monday", title: "one" })],
      two: [day({ week: "Week of 1 Advent", day: "Monday", title: "two" }), day({ week: "Proper 24", day: "Wednesday", title: "proper" })],
      holy: [],
    };
    // Advent 2026 begins the church year 2027 (odd): Year One.
    expect(officeFor(l, new Date(2026, 10, 30)).day?.title).toBe("one");
    // Wednesday 21 October 2026: the week of the Sunday closest to October 19 is Proper 24, Year Two.
    expect(officeFor(l, new Date(2026, 9, 21)).day?.title).toBe("proper");
  });
  it("opens the reader at a lesson", () => {
    expect(lessonRef("Isa 63:15-64:9")).toMatchObject({ book: "Isa", chapter: 63, verse: 15 });
    expect(lessonRef("Gen 17:1-12a, 15-16")).toMatchObject({ book: "Gen", chapter: 17, verse: 1, verseEnd: 12 });
    expect(lessonRef("Sir 43:1-12(27-33)")).toMatchObject({ book: "Sir", chapter: 43 });
  });
});

describe("reading plans", () => {
  it("counts days from the start and labels runs of chapters", () => {
    expect(planDay("2026-10-01", new Date(2026, 9, 21))).toBe(21);
    expect(portionLabel([{ book: "Gen", chapter: 1, verse: 0 }, { book: "Gen", chapter: 2, verse: 0 }, { book: "Matt", chapter: 1, verse: 0 }])).toBe("Genesis 1-2, Matthew 1");
  });
});

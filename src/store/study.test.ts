import { beforeEach, describe, expect, it } from "vitest";
import { ALL_SHELVES, useStudy } from "./study";

describe("Sub Rosa", () => {
  beforeEach(() => useStudy.setState({ subRosa: false, beforeSubRosa: null, shelves: ["protestant"] }));

  it("puts every shelf on, and the shelves you had back when it ends", () => {
    useStudy.getState().set({ shelves: ["protestant", "pseudepigrapha"] });
    useStudy.getState().setSubRosa(true, { themeId: "tenebrae", mode: "dark" });
    expect(useStudy.getState().shelves).toEqual(ALL_SHELVES);
    const before = useStudy.getState().setSubRosa(false);
    expect(useStudy.getState().shelves).toEqual(["protestant", "pseudepigrapha"]);
    expect(before).toMatchObject({ themeId: "tenebrae", mode: "dark" });
    expect(useStudy.getState().beforeSubRosa).toBeNull();
  });

  it("does nothing when asked for the state it is already in", () => {
    useStudy.getState().setSubRosa(true, { themeId: "scriptorium", mode: "light" });
    expect(useStudy.getState().setSubRosa(true, { themeId: "subrosa", mode: "dark" })).toBeNull();
    expect(useStudy.getState().beforeSubRosa?.themeId).toBe("scriptorium");
  });
});

describe("the verse panel", () => {
  const matt25 = { book: "Matt", chapter: 25, verse: 14 };
  beforeEach(() => useStudy.setState({ selected: null, selection: [] }));

  it("closes when you turn to another chapter", () => {
    useStudy.getState().select(matt25);
    useStudy.getState().read({ book: "Acts", chapter: 1, verse: 0 });
    expect(useStudy.getState().selected).toBeNull();
    expect(useStudy.getState().selection).toEqual([]);
  });

  it("stays open within its chapter, and opens on a verse you jump to", () => {
    useStudy.getState().select(matt25);
    useStudy.getState().read({ book: "Matt", chapter: 25, verse: 30 });
    expect(useStudy.getState().selected).toEqual(matt25);
    useStudy.getState().read({ book: "Acts", chapter: 2, verse: 4 }, { select: true });
    expect(useStudy.getState().selected).toMatchObject({ book: "Acts", chapter: 2, verse: 4 });
  });
});

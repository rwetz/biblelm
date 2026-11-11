import { describe, expect, it } from "vitest";
import { findSettings, locateSetting, SETTINGS } from "./sections";

describe("settings tree", () => {
  it("has unique chapter, group and setting names", () => {
    expect(new Set(SETTINGS.map((c) => c.id)).size).toBe(SETTINGS.length);
    const groups = SETTINGS.flatMap((c) => c.groups.map((g) => g.id));
    expect(new Set(groups).size).toBe(groups.length);
    const labels = SETTINGS.flatMap((c) => c.groups.flatMap((g) => g.settings.map((s) => s.label)));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("finds settings by label first, then by keyword", () => {
    expect(findSettings("text")[0].setting.label).toBe("Text size");
    expect(findSettings("enoch").map((h) => h.setting.label)).toEqual(["Pseudepigrapha"]);
    expect(findSettings("dark mode").map((h) => h.chapter.id)).toContain("appearance");
    expect(findSettings("  ")).toEqual([]);
  });

  it("locates a palette label in its chapter and group", () => {
    expect(locateSetting("Two columns")).toMatchObject({ chapter: { id: "reading" }, group: { id: "text" } });
    expect(locateSetting("Jev")).toMatchObject({ chapter: { id: "machine" }, group: { id: "jev" } });
    expect(locateSetting("About")).toMatchObject({ chapter: { id: "about" } });
    expect(locateSetting("no such thing")).toBeUndefined();
  });

  it("uses no em dashes in anything a person reads", () => {
    expect(JSON.stringify(SETTINGS)).not.toContain("—");
  });
});

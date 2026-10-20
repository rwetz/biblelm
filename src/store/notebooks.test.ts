import { describe, expect, it } from "vitest";
import { migrate, noteCovers, toMarkdown, VERSION, type Note } from "./notebooks";

const note = (p: Partial<Note>): Note => ({
  id: "n", notebook: "b", start: "John.3.16", body: "", tags: [], created: 0, updated: 0, ...p,
});

describe("notebooks", () => {
  it("migrates nothing into an empty file", () => {
    expect(migrate(null)).toMatchObject({ version: VERSION, notebooks: [], notes: [] });
  });

  it("keeps unknown fields and fills missing ones", () => {
    const m = migrate({ version: 0, notes: [{ id: "x", start: "Gen.1.1", body: "hi" }], future: 42 });
    expect(m.notes[0].tags).toEqual([]);
    expect((m as unknown as { future: number }).future).toBe(42);
  });

  it("knows which verses a note covers", () => {
    const n = note({ start: "Rom.8.28", end: "Rom.8.30" });
    expect(noteCovers(n, "Rom.8.29")).toBe(true);
    expect(noteCovers(n, "Rom.8.31")).toBe(false);
    expect(noteCovers(n, "Rom.9.29")).toBe(false);
    expect(noteCovers(note({}), "John.3.16")).toBe(true);
  });

  it("exports Markdown with verse links", () => {
    const files = toMarkdown(
      {
        version: 1, active: null, highlights: [],
        notebooks: [{ id: "b", title: "Romans", description: "", created: 0, translations: ["kjv"], shelves: ["protestant"] }],
        notes: [note({ start: "Rom.8.28", body: "All things", tags: ["providence"] })],
      },
      "b",
      (o) => o.replace(/\./g, " "),
    );
    expect(files.map((f) => f.path)).toEqual(["README.md", "Rom.md"]);
    expect(files[1].body).toContain("[[Rom.8.28]]");
    expect(files[1].body).toContain("#providence");
  });
});

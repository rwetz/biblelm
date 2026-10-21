import { describe, expect, it } from "vitest";
import { mergeNotes, migrate, noteCovers, toMarkdown, VERSION, type Note, type NotesData } from "./notebooks";

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

  it("migrates a version 1 file to version 2 without losing anything", () => {
    const v1 = { version: 1, active: "b", notebooks: [{ id: "b", title: "Romans" }], notes: [note({ id: "n1" })], highlights: [{ id: "h", notebook: "b", ref: "Rom.1.1", created: 1 }] };
    const m = migrate(v1);
    expect(m.version).toBe(2);
    expect(m.notebooks).toHaveLength(1);
    expect(m.notes[0].id).toBe("n1");
    expect(m.highlights).toHaveLength(1);
    expect(m.active).toBe("b");
    expect(m).toMatchObject({ memory: [], plans: [], deleted: [] });
  });

  it("merges two copies: newer edits win, deletions hold, plans union", () => {
    const base = migrate(null);
    const a: NotesData = { ...base, notes: [note({ id: "x", body: "old", updated: 1 }), note({ id: "gone", updated: 1 })], plans: [{ id: "p", plan: "year", started: "2026-01-01", done: [1, 2] }], deleted: [] };
    const b: NotesData = { ...base, notes: [note({ id: "x", body: "new", updated: 5 }), note({ id: "y", body: "only b", updated: 2 })], plans: [{ id: "p", plan: "year", started: "2026-01-01", done: [3] }], deleted: [{ id: "gone", at: 3 }] };
    const m = mergeNotes(a, b);
    expect(m.notes.map((n) => [n.id, n.body])).toEqual([["x", "new"], ["y", "only b"]]);
    expect(m.plans[0].done).toEqual([1, 2, 3]);
    // Commutative and idempotent.
    expect(mergeNotes(b, a).notes).toEqual(m.notes);
    expect(mergeNotes(m, m).notes).toEqual(m.notes);
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
        version: 2, active: null, highlights: [], memory: [], plans: [], deleted: [],
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

import { describe, expect, it } from "vitest";
import { bibleOrder, mergeNotes, migrate, noteCovers, noteEndsAt, spanFields, spansLabel, spansOf, toMarkdown, VERSION, type Note, type NotesData } from "./notebooks";

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

  it("migrates a version 1 file to the current version without losing anything", () => {
    const v1 = { version: 1, active: "b", notebooks: [{ id: "b", title: "Romans" }], notes: [note({ id: "n1" })], highlights: [{ id: "h", notebook: "b", ref: "Rom.1.1", created: 1 }] };
    const m = migrate(v1);
    expect(m.version).toBe(VERSION);
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

  it("migrates a version 2 file to version 3: notes keep their range, bad spans go", () => {
    const v2 = { version: 2, notes: [note({ id: "a", start: "Rom.8.28", end: "Rom.8.30" }), { ...note({ id: "b" }), more: "junk" }, { ...note({ id: "c" }), more: [{ start: "John.3.18" }, null] }] };
    const m = migrate(v2);
    expect(VERSION).toBe(3);
    expect(m.notes[0]).toMatchObject({ start: "Rom.8.28", end: "Rom.8.30" });
    expect("more" in m.notes[0]).toBe(false);
    expect("more" in m.notes[1]).toBe(false);
    expect(m.notes[2].more).toEqual([{ start: "John.3.18" }]);
  });

  it("turns picked verses into runs", () => {
    expect(spansOf("Rom", 8, [11, 2, 3, 4, 5, 9, 10, 3])).toEqual([
      { start: "Rom.8.2", end: "Rom.8.5" },
      { start: "Rom.8.9", end: "Rom.8.11" },
    ]);
    expect(spansOf("John", 3, [16])).toEqual([{ start: "John.3.16" }]);
    const fields = spanFields(spansOf("Rom", 8, [2, 3, 9]));
    expect(fields).toEqual({ start: "Rom.8.2", end: "Rom.8.3", more: [{ start: "Rom.8.9" }] });
    expect(spansLabel([{ start: "Rom.8.2", end: "Rom.8.5" }, { start: "Rom.8.9", end: "Rom.8.11" }, { start: "Rom.8.14" }], (o) => o.replace(/\.(\d+)\.(\d+)$/, " $1:$2"))).toBe("Rom 8:2–5, 9–11, 14");
  });

  it("knows which verses a note of several runs covers, and where each run ends", () => {
    const n = note({ ...spanFields(spansOf("Rom", 8, [2, 3, 4, 5, 9, 10, 11])) });
    expect(["Rom.8.2", "Rom.8.4", "Rom.8.9", "Rom.8.11"].every((o) => noteCovers(n, o))).toBe(true);
    expect(noteCovers(n, "Rom.8.7")).toBe(false);
    expect(noteCovers(n, "Rom.8.12")).toBe(false);
    expect(noteEndsAt(n, "Rom.8.5")).toBe(true);
    expect(noteEndsAt(n, "Rom.8.11")).toBe(true);
    expect(noteEndsAt(n, "Rom.8.4")).toBe(false);
  });

  it("sorts notes in Bible order, not by the letters of the book", () => {
    const ns = [note({ start: "Rom.8.2" }), note({ start: "Exod.20.3" }), note({ start: "Gen.1.10" }), note({ start: "Gen.1.2" }), note({ start: "Gen.10.1" })];
    expect(ns.sort(bibleOrder).map((n) => n.start)).toEqual(["Gen.1.2", "Gen.1.10", "Gen.10.1", "Exod.20.3", "Rom.8.2"]);
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

  it("exports by chapter, or one file, with the verses quoted", () => {
    const data: NotesData = {
      version: VERSION, active: null, highlights: [], memory: [], plans: [], deleted: [],
      notebooks: [{ id: "b", title: "Romans", description: "", created: 0, translations: ["kjv"], shelves: ["protestant"] }],
      notes: [
        note({ id: "1", start: "Rom.8.28", body: "All things" }),
        note({ id: "2", start: "Rom.5.1", end: "Rom.5.2", more: [{ start: "Rom.5.5" }], body: "Peace" }),
        note({ id: "3", start: "Gen.1.1", body: "Beginning" }),
      ],
    };
    const lbl = (o: string) => o.replace(/\.(\d+)\.(\d+)$/, " $1:$2").replace(/\.(\d+)$/, " $1");
    const passage = (s: { start: string; end?: string }) => [`verse ${s.start}`];

    const byChapter = toMarkdown(data, "b", lbl, { split: "chapter" });
    expect(byChapter.map((f) => f.path)).toEqual(["README.md", "Gen.1.md", "Rom.5.md", "Rom.8.md"]);
    expect(byChapter[2].body).toContain("Rom 5:1–2, 5");

    const one = toMarkdown(data, "b", lbl, { split: "one", passage, passageFrom: "KJV", keep: (n) => n.start.startsWith("Rom.") });
    expect(one).toHaveLength(1);
    expect(one[0].body).not.toContain("Beginning");
    // Romans 5 before Romans 8, each under a chapter heading, the runs quoted apart.
    expect(one[0].body.indexOf("Peace")).toBeLessThan(one[0].body.indexOf("All things"));
    expect(one[0].body).toContain("### Chapter 5");
    expect(one[0].body).toContain("> verse Rom.5.1\n>\n> ...\n>\n> verse Rom.5.5\n>\n> (KJV)");
  });
});

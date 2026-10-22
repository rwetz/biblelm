// Notebooks: one per study, each with its own translations and shelves, and
// notes anchored to verse ranges by OSIS reference (translation-independent,
// so a note follows its verse into every translation). Saved through
// backend.notesSave: a JSON file in the app data folder that Rust writes
// atomically with daily backups. In a browser it falls back to localStorage.
//
// Notes are the one thing here that cannot be rebuilt. Never drop fields when
// loading, and bump VERSION with a migration (and a test) when the shape changes.

import { create } from "zustand";
import { backend } from "@/lib/backend";
import { BOOKS, type Shelf } from "@/lib/canon";
import { newCard, review, type Card, type Grade } from "@/lib/fsrs";

// 2: verses learned by heart (memory), reading plans (plans) and tombstones
// (deleted) so two copies of the file can be merged without losing anything.
// 3: a note can cover several separate runs of verses in one chapter (more).
export const VERSION = 3;

export interface Notebook {
  id: string;
  title: string;
  description: string;
  created: number;
  translations: string[];
  shelves: Shelf[];
  /** A Doré plate id shown on the notebook's cover. */
  plate?: string;
}

export interface Note {
  id: string;
  notebook: string;
  /** OSIS: "John.3.16". */
  start: string;
  /** Inclusive end of a range in the same chapter, OSIS. */
  end?: string;
  /** Further runs of verses in the same chapter after the first ("Rom 8:2-5, 9-11"), in order. */
  more?: Span[];
  /** Set when the note is about one translation's wording. */
  translation?: string;
  /** That translation's content hash when the note was written: the exact wording. */
  textHash?: string;
  body: string;
  tags: string[];
  created: number;
  updated: number;
}

/** One run of verses: a start and an optional inclusive end in the same chapter, OSIS. */
export interface Span {
  start: string;
  end?: string;
}

export interface Highlight {
  id: string;
  notebook: string;
  ref: string;
  created: number;
}

/** A reading plan you are following (src/lib/plans.ts). */
export interface PlanProgress {
  id: string;
  plan: string;
  /** Local date the plan began, "YYYY-MM-DD". */
  started: string;
  /** Day numbers (1-based) marked read. */
  done: number[];
}

/** Something deleted, remembered so a merge does not bring it back. */
export interface Tombstone {
  id: string;
  at: number;
}

export interface NotesData {
  version: number;
  notebooks: Notebook[];
  notes: Note[];
  highlights: Highlight[];
  active: string | null;
  memory: Card[];
  plans: PlanProgress[];
  deleted: Tombstone[];
}

const EMPTY: NotesData = { version: VERSION, notebooks: [], notes: [], highlights: [], active: null, memory: [], plans: [], deleted: [] };

/** Bring any saved shape up to the current one without losing anything. */
export function migrate(raw: unknown): NotesData {
  if (!raw || typeof raw !== "object") return { ...EMPTY };
  const r = raw as Partial<NotesData> & Record<string, unknown>;
  return {
    ...r,
    version: VERSION,
    notebooks: Array.isArray(r.notebooks) ? r.notebooks : [],
    notes: Array.isArray(r.notes) ? r.notes.map(migrateNote) : [],
    highlights: Array.isArray(r.highlights) ? r.highlights : [],
    active: typeof r.active === "string" ? r.active : null,
    // Version 1 had none of these.
    memory: Array.isArray(r.memory) ? r.memory : [],
    plans: Array.isArray(r.plans) ? r.plans.map((p) => ({ ...p, done: Array.isArray(p.done) ? p.done : [] })) : [],
    deleted: Array.isArray(r.deleted) ? r.deleted : [],
  };
}

function migrateNote(n: Note): Note {
  const out = { ...n, tags: Array.isArray(n.tags) ? n.tags : [] };
  // Version 2 had no `more`; keep only well-formed spans where a file has one.
  if ("more" in out) {
    const more = Array.isArray(out.more) ? out.more.filter((s) => s && typeof s.start === "string") : [];
    if (more.length) out.more = more;
    else delete out.more;
  }
  return out;
}

/**
 * Merge another copy of the notes file into this one (from a second machine,
 * or a backup): a state-based CRDT. Every item has a unique id; when both
 * copies have it the newer edit wins; anything either copy deleted stays
 * deleted unless it was edited after; plans keep every day either copy read.
 * Merging is commutative and idempotent, so the order of merges never matters.
 */
export function mergeNotes(a: NotesData, b: NotesData): NotesData {
  const deleted = new Map<string, number>();
  for (const t of [...a.deleted, ...b.deleted]) deleted.set(t.id, Math.max(deleted.get(t.id) ?? 0, t.at));
  const stamp = (x: object) => {
    const y = x as { updated?: number; created?: number; last?: number };
    return Math.max(y.updated ?? 0, y.created ?? 0, y.last ?? 0);
  };
  const newer = <T extends object>(x: T, y: T) => (stamp(y) > stamp(x) || (stamp(y) === stamp(x) && JSON.stringify(y) > JSON.stringify(x)) ? y : x);
  function union<T extends { id: string }>(xs: T[], ys: T[], pick: (x: T, y: T) => T = newer): T[] {
    const m = new Map<string, T>();
    for (const x of [...xs, ...ys]) m.set(x.id, m.has(x.id) ? pick(m.get(x.id)!, x) : x);
    return [...m.values()].filter((x) => !(deleted.has(x.id) && deleted.get(x.id)! >= stamp(x))).sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
  }
  const plans = union(a.plans, b.plans, (x, y) => ({ ...newer(x, y), done: [...new Set([...x.done, ...y.done])].sort((p, q) => p - q) }));
  return {
    ...b,
    ...a,
    version: VERSION,
    notebooks: union(a.notebooks, b.notebooks),
    notes: union(a.notes, b.notes),
    highlights: union(a.highlights, b.highlights),
    memory: union(a.memory, b.memory),
    plans,
    deleted: [...deleted].sort().map(([id, at]) => ({ id, at })),
    active: a.active ?? b.active,
  };
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface NotebooksState extends NotesData {
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  createNotebook: (n: Pick<Notebook, "title" | "description" | "translations" | "shelves" | "plate">) => string;
  updateNotebook: (id: string, patch: Partial<Omit<Notebook, "id" | "created">>) => void;
  deleteNotebook: (id: string) => void;
  setActive: (id: string | null) => void;
  addNote: (n: Pick<Note, "notebook" | "start" | "end" | "more" | "translation" | "textHash" | "body"> & { tags?: string[] }) => string;
  updateNote: (id: string, patch: Partial<Pick<Note, "body" | "tags" | "translation" | "end">>) => void;
  deleteNote: (id: string) => void;
  toggleHighlight: (notebook: string, ref: string) => void;
  /** Learn a verse (or range) by heart; again removes it. */
  toggleMemory: (ref: string, end?: string) => void;
  reviewCard: (id: string, grade: Grade) => void;
  startPlan: (plan: string, started: string) => void;
  stopPlan: (id: string) => void;
  markPlanDay: (id: string, day: number, read: boolean) => void;
  /** Merge another notes file into this one (see mergeNotes). */
  mergeFrom: (other: unknown) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useNotebooks = create<NotebooksState>((set, get) => {
  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      backend.notesSave({ ...snapshot() }).catch((e) => set({ error: String(e) }));
    }, 400);
  };
  const snapshot = (): NotesData => {
    const { version, notebooks, notes, highlights, active, memory, plans, deleted } = get();
    return { version, notebooks, notes, highlights, active, memory, plans, deleted };
  };
  const commit = (patch: Partial<NotesData>) => {
    set(patch);
    persist();
  };
  const bury = (...ids: string[]) => [...get().deleted, ...ids.map((id) => ({ id, at: Date.now() }))];

  return {
    ...EMPTY,
    loaded: false,
    error: null,

    load: async () => {
      try {
        set({ ...migrate(await backend.notesLoad()), loaded: true, error: null });
      } catch (e) {
        // Leave whatever is on disk alone: an unreadable file is not an empty one.
        set({ loaded: true, error: String(e) });
      }
    },

    createNotebook: (n) => {
      const id = uid();
      commit({ notebooks: [...get().notebooks, { ...n, id, created: Date.now() }], active: id });
      return id;
    },
    updateNotebook: (id, patch) =>
      commit({ notebooks: get().notebooks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }),
    deleteNotebook: (id) =>
      commit({
        notebooks: get().notebooks.filter((b) => b.id !== id),
        notes: get().notes.filter((n) => n.notebook !== id),
        highlights: get().highlights.filter((h) => h.notebook !== id),
        active: get().active === id ? null : get().active,
        deleted: bury(id, ...get().notes.filter((n) => n.notebook === id).map((n) => n.id), ...get().highlights.filter((h) => h.notebook === id).map((h) => h.id)),
      }),
    setActive: (active) => commit({ active }),

    addNote: (n) => {
      const id = uid();
      const now = Date.now();
      commit({ notes: [...get().notes, { tags: [], ...n, id, created: now, updated: now }] });
      return id;
    },
    updateNote: (id, patch) =>
      commit({ notes: get().notes.map((n) => (n.id === id ? { ...n, ...patch, updated: Date.now() } : n)) }),
    deleteNote: (id) => commit({ notes: get().notes.filter((n) => n.id !== id), deleted: bury(id) }),

    toggleHighlight: (notebook, ref) => {
      const has = get().highlights.find((h) => h.notebook === notebook && h.ref === ref);
      commit({
        highlights: has
          ? get().highlights.filter((h) => h !== has)
          : [...get().highlights, { id: uid(), notebook, ref, created: Date.now() }],
        ...(has ? { deleted: bury(has.id) } : {}),
      });
    },

    toggleMemory: (ref, end) => {
      const has = get().memory.find((c) => c.ref === ref && c.end === end);
      commit(has ? { memory: get().memory.filter((c) => c !== has), deleted: bury(has.id) } : { memory: [...get().memory, newCard(uid(), ref, end)] });
    },
    reviewCard: (id, grade) => commit({ memory: get().memory.map((c) => (c.id === id ? review(c, grade) : c)) }),
    startPlan: (plan, started) => commit({ plans: [...get().plans, { id: uid(), plan, started, done: [] }] }),
    stopPlan: (id) => commit({ plans: get().plans.filter((p) => p.id !== id), deleted: bury(id) }),
    markPlanDay: (id, day, read) =>
      commit({
        plans: get().plans.map((p) => (p.id === id ? { ...p, done: read ? [...new Set([...p.done, day])].sort((a, b) => a - b) : p.done.filter((d) => d !== day) } : p)),
      }),
    mergeFrom: (other) => commit(mergeNotes(snapshot(), migrate(other))),
  };
});

/** Every span a note covers, the first from start and end. */
export function noteSpans(n: Pick<Note, "start" | "end" | "more">): Span[] {
  return [{ start: n.start, end: n.end }, ...(n.more ?? [])];
}

const verseOf = (osis: string) => +osis.split(".")[2];

/** Does a note cover this verse (in any of its spans)? */
export function noteCovers(n: Pick<Note, "start" | "end" | "more">, osis: string): boolean {
  const [b, c, v] = osis.split(".");
  return noteSpans(n).some((s) => {
    if (s.start === osis || s.end === osis) return true;
    if (!s.end) return false;
    const [sb, sc] = s.start.split(".");
    return b === sb && c === sc && +v >= verseOf(s.start) && +v <= verseOf(s.end);
  });
}

/** Does one of a note's spans end on this verse? (The reader marks the note there.) */
export function noteEndsAt(n: Pick<Note, "start" | "end" | "more">, osis: string): boolean {
  return noteSpans(n).some((s) => (s.end ?? s.start) === osis);
}

/** Verses of one chapter (any order, repeats allowed) as runs: 2,3,4,5,9,10,11 → 2-5, 9-11. */
export function spansOf(book: string, chapter: number, verses: number[]): Span[] {
  const vs = [...new Set(verses)].filter((v) => v > 0).sort((a, b) => a - b);
  const out: Span[] = [];
  for (let i = 0; i < vs.length; ) {
    let j = i;
    while (j + 1 < vs.length && vs[j + 1] === vs[j] + 1) j++;
    out.push({ start: `${book}.${chapter}.${vs[i]}`, ...(j > i ? { end: `${book}.${chapter}.${vs[j]}` } : {}) });
    i = j + 1;
  }
  return out;
}

/** The note fields for a set of spans: the first as start and end, the rest as more. */
export function spanFields(spans: Span[]): Pick<Note, "start" | "end" | "more"> {
  const [first, ...rest] = spans;
  return { start: first.start, ...(first.end ? { end: first.end } : {}), ...(rest.length ? { more: rest } : {}) };
}

/** "Romans 8:2–5, 9–11", given how to label a start verse ("Romans 8:2"). */
export function spansLabel(spans: Span[], refLabel: (osis: string) => string): string {
  const tail = (s: Span) => `${verseOf(s.start)}${s.end ? `–${verseOf(s.end)}` : ""}`;
  const [first, ...rest] = spans;
  return [refLabel(first.start) + (first.end ? `–${verseOf(first.end)}` : ""), ...rest.map(tail)].join(", ");
}

const BOOK_ORDER = new Map(BOOKS.map((b, i) => [b.osis, i]));

/** Notes in Bible order: canonical book, then chapter, then verse. */
export function bibleOrder(a: Pick<Note, "start">, b: Pick<Note, "start">): number {
  const [ab, ac, av] = a.start.split(".");
  const [bb, bc, bv] = b.start.split(".");
  return (BOOK_ORDER.get(ab) ?? 999) - (BOOK_ORDER.get(bb) ?? 999) || +ac - +bc || +av - +bv;
}

export interface ExportOptions {
  /** Which notes go out; all of the notebook's by default. */
  keep?: (n: Note) => boolean;
  /** One file per book (the default), one per chapter, or a single file. */
  split?: "book" | "chapter" | "one";
  /** The verses of a span, to quote above its note (one line each). */
  passage?: (span: Span) => string[];
  /** The translation the passage is quoted from, named under it. */
  passageFrom?: string;
}

export const fileSafe = (s: string) => s.replace(/[^\p{L}\p{N} -]/gu, "").trim() || "notebook";

/** A notebook as Markdown files (Obsidian-friendly, with [[John.3.16]] links), plus an index. */
export function toMarkdown(data: NotesData, notebookId: string, refLabel: (osis: string) => string, opts: ExportOptions = {}) {
  const nb = data.notebooks.find((b) => b.id === notebookId);
  if (!nb) return [];
  const split = opts.split ?? "book";
  const notes = data.notes.filter((n) => n.notebook === notebookId && (opts.keep?.(n) ?? true)).sort(bibleOrder);
  const bookTitle = (b: string) => refLabel(`${b}.1`).replace(/ 1$/, "");
  const chapterTitle = (b: string, c: string) => (b === "Ps" ? `Psalm ${c}` : `Chapter ${c}`);

  const noteMd = (n: Note, depth: number) => {
    const spans = noteSpans(n);
    const head = `${"#".repeat(depth)} [[${n.start}]] ${spansLabel(spans, refLabel)}${n.translation ? ` (${n.translation.toUpperCase()} wording)` : ""}`;
    const quoted = opts.passage ? spans.map((s) => opts.passage!(s).map((l) => `> ${l}`).join("\n")).filter(Boolean) : [];
    const quote = quoted.length ? `${quoted.join("\n>\n> ...\n>\n")}${opts.passageFrom ? `\n>\n> (${opts.passageFrom})` : ""}\n\n` : "";
    const tags = n.tags.length ? `\n${n.tags.map((t) => `#${t.replace(/\s+/g, "-")}`).join(" ")}\n` : "";
    return `${head}\n\n${quote}${n.body.trim()}\n${tags}`;
  };

  // Bible order: book, then chapter.
  const groups: { book: string; chapter: string; notes: Note[] }[] = [];
  for (const n of notes) {
    const [b, c] = n.start.split(".");
    const last = groups[groups.length - 1];
    if (last && last.book === b && last.chapter === c) last.notes.push(n);
    else groups.push({ book: b, chapter: c, notes: [n] });
  }
  const books = [...new Set(groups.map((g) => g.book))];

  // Inside a book, chapters get headings only when it has notes in more than one.
  const bookBody = (b: string, depth: number) => {
    const gs = groups.filter((g) => g.book === b);
    if (gs.length === 1) return gs[0].notes.map((n) => noteMd(n, depth)).join("\n");
    return gs.map((g) => `${"#".repeat(depth)} ${chapterTitle(b, g.chapter)}\n\n${g.notes.map((n) => noteMd(n, depth + 1)).join("\n")}`).join("\n");
  };

  const intro = `# ${nb.title}\n\n${nb.description ? `${nb.description}\n\n` : ""}Translations: ${nb.translations.join(", ").toUpperCase()}\n\n`;
  if (split === "one") return [{ path: `${fileSafe(nb.title)}.md`, body: intro + books.map((b) => `## ${bookTitle(b)}\n\n${bookBody(b, 3)}`).join("\n") }];
  const files =
    split === "book"
      ? books.map((b) => ({ path: `${b}.md`, body: `# ${bookTitle(b)}\n\n${bookBody(b, 2)}` }))
      : groups.map((g) => ({ path: `${g.book}.${g.chapter}.md`, body: `# ${bookTitle(g.book)} ${g.chapter}\n\n${g.notes.map((n) => noteMd(n, 2)).join("\n")}` }));
  files.unshift({ path: "README.md", body: intro + files.map((f) => `- [[${f.path.replace(/\.md$/, "")}]]`).join("\n") + "\n" });
  return files;
}

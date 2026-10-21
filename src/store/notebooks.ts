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
import type { Shelf } from "@/lib/canon";
import { newCard, review, type Card, type Grade } from "@/lib/fsrs";

// 2: verses learned by heart (memory), reading plans (plans) and tombstones
// (deleted) so two copies of the file can be merged without losing anything.
export const VERSION = 2;

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
  /** Set when the note is about one translation's wording. */
  translation?: string;
  /** That translation's content hash when the note was written: the exact wording. */
  textHash?: string;
  body: string;
  tags: string[];
  created: number;
  updated: number;
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
    notes: Array.isArray(r.notes) ? r.notes.map((n) => ({ ...n, tags: Array.isArray(n.tags) ? n.tags : [] })) : [],
    highlights: Array.isArray(r.highlights) ? r.highlights : [],
    active: typeof r.active === "string" ? r.active : null,
    // Version 1 had none of these.
    memory: Array.isArray(r.memory) ? r.memory : [],
    plans: Array.isArray(r.plans) ? r.plans.map((p) => ({ ...p, done: Array.isArray(p.done) ? p.done : [] })) : [],
    deleted: Array.isArray(r.deleted) ? r.deleted : [],
  };
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
  addNote: (n: Pick<Note, "notebook" | "start" | "end" | "translation" | "textHash" | "body"> & { tags?: string[] }) => string;
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

/** Does a note's range cover this verse? */
export function noteCovers(n: Note, osis: string): boolean {
  if (n.start === osis || n.end === osis) return true;
  if (!n.end) return false;
  const [b, c, v] = osis.split(".");
  const [sb, sc, sv] = n.start.split(".");
  const ev = n.end.split(".")[2];
  return b === sb && c === sc && +v >= +sv && +v <= +ev;
}

/** A notebook as Markdown files: one per book touched, plus an index. */
export function toMarkdown(data: NotesData, notebookId: string, refLabel: (osis: string) => string) {
  const nb = data.notebooks.find((b) => b.id === notebookId);
  if (!nb) return [];
  const notes = data.notes.filter((n) => n.notebook === notebookId).sort((a, b) => a.start.localeCompare(b.start, undefined, { numeric: true }));
  const byBook = new Map<string, Note[]>();
  for (const n of notes) {
    const b = n.start.split(".")[0];
    byBook.set(b, [...(byBook.get(b) ?? []), n]);
  }
  const files = [...byBook].map(([b, list]) => ({
    path: `${b}.md`,
    body:
      `# ${refLabel(`${b}.1`).replace(/ 1$/, "")}\n\n` +
      list
        .map((n) => {
          const label = refLabel(n.start) + (n.end ? `-${n.end.split(".")[2]}` : "");
          return `## [[${n.start}]] ${label}${n.translation ? ` (${n.translation.toUpperCase()})` : ""}\n\n${n.body.trim()}\n${n.tags.length ? `\n${n.tags.map((t) => `#${t.replace(/\s+/g, "-")}`).join(" ")}\n` : ""}`;
        })
        .join("\n"),
  }));
  files.unshift({
    path: "README.md",
    body: `# ${nb.title}\n\n${nb.description}\n\nTranslations: ${nb.translations.join(", ").toUpperCase()}\n\n${[...byBook.keys()].map((b) => `- [[${b}]]`).join("\n")}\n`,
  });
  return files;
}

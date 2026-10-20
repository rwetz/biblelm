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

export const VERSION = 1;

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

export interface NotesData {
  version: number;
  notebooks: Notebook[];
  notes: Note[];
  highlights: Highlight[];
  active: string | null;
}

const EMPTY: NotesData = { version: VERSION, notebooks: [], notes: [], highlights: [], active: null };

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
  addNote: (n: Pick<Note, "notebook" | "start" | "end" | "translation" | "body"> & { tags?: string[] }) => string;
  updateNote: (id: string, patch: Partial<Pick<Note, "body" | "tags" | "translation" | "end">>) => void;
  deleteNote: (id: string) => void;
  toggleHighlight: (notebook: string, ref: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useNotebooks = create<NotebooksState>((set, get) => {
  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const { version, notebooks, notes, highlights, active } = get();
      backend.notesSave({ version, notebooks, notes, highlights, active }).catch((e) => set({ error: String(e) }));
    }, 400);
  };
  const commit = (patch: Partial<NotesData>) => {
    set(patch);
    persist();
  };

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
    deleteNote: (id) => commit({ notes: get().notes.filter((n) => n.id !== id) }),

    toggleHighlight: (notebook, ref) => {
      const has = get().highlights.find((h) => h.notebook === notebook && h.ref === ref);
      commit({
        highlights: has
          ? get().highlights.filter((h) => h !== has)
          : [...get().highlights, { id: uid(), notebook, ref, created: Date.now() }],
      });
    },
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

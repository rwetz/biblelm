// Study preferences and place: where you are reading, which translations and
// shelves are on, how much art to show. Persisted in localStorage; notebooks
// (your own words) live in store/notebooks.ts and are saved through Rust.

import { create } from "zustand";
import type { Ref, Shelf } from "@/lib/canon";

export type Page = "home" | "read" | "search" | "topics" | "notebooks" | "lab" | "settings";
export type Illustrations = "full" | "margins" | "off";
export type ReadingFace = "garamond" | "fell" | "gothic";

interface StudyState {
  page: Page;
  translation: string;
  /** Extra translations shown side by side in the reader. */
  parallel: string[];
  shelves: Shelf[];
  illustrations: Illustrations;
  face: ReadingFace;
  textSize: number;
  columns: boolean;
  location: Ref;
  /** The verse the verse panel is open on. */
  selected: Ref | null;
  history: Ref[];
  /** Hand-offs between pages (not persisted). */
  topic: string | null;
  walk: Ref | null;
  query: string;

  go: (page: Page) => void;
  read: (ref: Ref, opts?: { select?: boolean }) => void;
  select: (ref: Ref | null) => void;
  openTopic: (name: string) => void;
  openWalk: (ref: Ref) => void;
  searchFor: (q: string) => void;
  set: (patch: Partial<Pick<StudyState, "translation" | "parallel" | "shelves" | "illustrations" | "face" | "textSize" | "columns">>) => void;
}

const KEY = "biblelm:study";
const DEFAULTS = {
  page: "home" as Page,
  translation: "kjv",
  parallel: [] as string[],
  shelves: ["protestant"] as Shelf[],
  illustrations: "full" as Illustrations,
  face: "garamond" as ReadingFace,
  textSize: 18,
  columns: false,
  location: { book: "John", chapter: 1, verse: 0 } as Ref,
  history: [] as Ref[],
};

function load(): typeof DEFAULTS {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw), page: "home" } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function save(s: StudyState) {
  try {
    const { translation, parallel, shelves, illustrations, face, textSize, columns, location, history } = s;
    localStorage.setItem(KEY, JSON.stringify({ translation, parallel, shelves, illustrations, face, textSize, columns, location, history }));
  } catch {
    // Storage blocked: preferences just won't persist.
  }
}

export const useStudy = create<StudyState>((set, get) => ({
  ...load(),
  selected: null,
  topic: null,
  walk: null,
  query: "",
  go: (page) => set({ page }),
  openTopic: (topic) => set({ page: "topics", topic, walk: null }),
  openWalk: (walk) => set({ page: "topics", walk, topic: null }),
  searchFor: (query) => set({ page: "search", query }),
  read: (ref, opts) => {
    const chapter = { book: ref.book, chapter: ref.chapter, verse: 0 };
    const history = [chapter, ...get().history.filter((h) => h.book !== ref.book || h.chapter !== ref.chapter)].slice(0, 12);
    set({ page: "read", location: ref, history, selected: opts?.select && ref.verse ? ref : get().selected });
    save(get());
  },
  select: (selected) => set({ selected }),
  set: (patch) => {
    set(patch);
    save(get());
  },
}));

export const shelfSet = (shelves: Shelf[]) => new Set<Shelf>(shelves);

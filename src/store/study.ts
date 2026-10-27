// Study preferences and place: where you are reading, which translations and
// shelves are on, how much art to show. Persisted in localStorage; notebooks
// (your own words) live in store/notebooks.ts and are saved through Rust.

import { create } from "zustand";
import { SHELVES, type Ref, type Shelf } from "@/lib/canon";
import type { SaverMode } from "@/lib/power";
import { answer, type Question, type QuizCards } from "@/lib/quiz";
import type { SymbolFamily } from "@/lib/symbols";

export type Page = "home" | "read" | "search" | "topics" | "atlas" | "gallery" | "daily" | "notebooks" | "lab" | "settings" | "cabinet";
/** A picture opened to look at: a painting or a Doré plate, by id. */
export type LookTarget = { kind: "painting" | "plate"; id: string };
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
  /** Words of Christ in red, where the translation marks them. */
  redLetter: boolean;
  /** The hand-drawn dithered ornaments (headpieces, page marks, the sidebar's). */
  ornaments: boolean;
  /** Tighter margins and spacing, for a small screen or a preference for more on it. */
  compact: boolean;
  /** Folded to its icons by choice (it also folds on a narrow window). */
  sidebarFolded: boolean;
  /** Save the battery: the art holds still and glass loses its blur. Auto: on battery power. */
  saver: SaverMode;
  /** The Lab in the sidebar and the palette; off gives a study-only app and a shorter nav. */
  showLab: boolean;
  /** Your name, for the title page of a printed notebook. Empty: not given. */
  name: string;
  /** Whether the first-start welcome (which asks the name) has been seen. */
  welcomed: boolean;
  location: Ref;
  /** Sub Rosa: the curiosities mode, its own theme and every shelf (src/app/subrosa.ts). */
  subRosa: boolean;
  /** What Sub Rosa changed, to put back when it ends: the shelves and the scheme. */
  beforeSubRosa: BeforeSubRosa | null;
  /** Where you are in the Sub Rosa library: a text (by id) and its section, or the cabinet's shelves. */
  cabinet: CabinetPlace;
  /** Sub Rosa's quiz, "Scripture or myth?": a scheduler card per question answered (src/lib/quiz.ts). */
  quiz: QuizCards;
  /** Developer mode: preview any hero or plate to hunt for art bugs (Settings). */
  devMode: boolean;
  /** Developer override for the Home hero (a hero id), else the church year picks. */
  devHero: string | null;
  /** Developer override for the sidebar vignette (a plate number). */
  devPlate: number | null;
  /** The verse the verse panel is open on, and the anchor of a shift-click. */
  selected: Ref | null;
  /** Verse numbers picked in the selected verse's chapter (ctrl and shift click); one when a single verse is open. */
  selection: number[];
  history: Ref[];
  /** Reading with the Hebrew and Greek under each verse. */
  interlinear: boolean;
  /** The picture open in Look (full window), or none. */
  look: LookTarget | null;
  /** Hand-offs between pages (not persisted). */
  topic: string | null;
  /** A person or place to open in the Atlas. */
  /** What the Atlas opens on: a place, a person, or (under the rose) the map of hell. */
  atlas: { kind: "place" | "person" | "hell"; id: string } | null;
  walk: Ref | null;
  /** A struggle to open in Topics, Studies (src/lib/studies.ts). */
  studies: string | null;
  query: string;

  go: (page: Page) => void;
  read: (ref: Ref, opts?: { select?: boolean }) => void;
  select: (ref: Ref | null) => void;
  /** Click on a verse as in a file list: alone, ctrl toggles it, shift takes the run from the anchor, ctrl+shift adds that run. */
  pick: (ref: Ref, how: { ctrl: boolean; shift: boolean }) => void;
  openTopic: (name: string) => void;
  openWalk: (ref: Ref) => void;
  openStudies: (id?: string) => void;
  searchFor: (q: string) => void;
  openLook: (t: LookTarget | null) => void;
  openAtlas: (kind: "place" | "person" | "hell", id: string) => void;
  /** Open the cabinet, at a library text and section, or at its shelves (text null). */
  openCabinet: (place: CabinetPlace) => void;
  /** Record an answer to a quiz question: wrong brings it back soon, right later. */
  answerQuiz: (q: Question, right: boolean) => void;
  /** Go under the rose (every shelf comes on, silently) or come back out (the shelves you had). */
  setSubRosa: (on: boolean, theme?: { themeId: string; mode: string }) => BeforeSubRosa | null;
  set: (patch: Partial<Pick<StudyState, "translation" | "parallel" | "shelves" | "illustrations" | "face" | "textSize" | "columns" | "redLetter" | "ornaments" | "compact" | "sidebarFolded" | "saver" | "showLab" | "name" | "welcomed" | "interlinear" | "devMode" | "devHero" | "devPlate">>) => void;
}

export type CabinetShelf = "library" | "dossiers" | "symbols" | "lodge" | "bestiary" | "numbers" | "quiz" | "beside";

export interface CabinetPlace {
  /** A library text open in the reader (by id), at its section; or null for the shelves. */
  text: string | null;
  section: number;
  /** The shelf showing, and a dossier or symbol open on it (src/lib/dossiers.ts). */
  shelf?: CabinetShelf;
  curio?: string | null;
  /** A Goetia spirit open in the bestiary, by number (src/lib/bestiary.ts). */
  spirit?: number | null;
  /** The symbols shown, by family (src/lib/symbols.ts); all when unset. */
  family?: SymbolFamily | null;
}

export interface BeforeSubRosa {
  shelves: Shelf[];
  themeId: string;
  mode: string;
}

/** Every shelf, in canon order: what Sub Rosa reads from. */
export const ALL_SHELVES: Shelf[] = SHELVES.map((s) => s.id);

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
  redLetter: true,
  ornaments: true,
  compact: false,
  sidebarFolded: false,
  saver: "auto" as SaverMode,
  showLab: true,
  name: "",
  welcomed: false,
  interlinear: false,
  location: { book: "John", chapter: 1, verse: 0 } as Ref,
  history: [] as Ref[],
  subRosa: false,
  beforeSubRosa: null as BeforeSubRosa | null,
  cabinet: { text: null, section: 0 } as CabinetPlace,
  quiz: {} as QuizCards,
  devMode: false,
  devHero: null as string | null,
  devPlate: null as number | null,
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
    const { translation, parallel, shelves, illustrations, face, textSize, columns, redLetter, ornaments, compact, sidebarFolded, saver, showLab, name, welcomed, interlinear, location, history, subRosa, beforeSubRosa, cabinet, quiz, devMode, devHero, devPlate } = s;
    localStorage.setItem(KEY, JSON.stringify({ translation, parallel, shelves, illustrations, face, textSize, columns, redLetter, ornaments, compact, sidebarFolded, saver, showLab, name, welcomed, interlinear, location, history, subRosa, beforeSubRosa, cabinet, quiz, devMode, devHero, devPlate }));
  } catch {
    // Storage blocked: preferences just won't persist.
  }
}

export const useStudy = create<StudyState>((set, get) => ({
  ...load(),
  selected: null,
  selection: [],
  look: null,
  atlas: null,
  topic: null,
  walk: null,
  studies: null,
  query: "",
  go: (page) => set({ page }),
  openTopic: (topic) => set({ page: "topics", topic, walk: null, studies: null }),
  openWalk: (walk) => set({ page: "topics", walk, topic: null, studies: null }),
  openStudies: (id) => set({ page: "topics", studies: id ?? "", walk: null, topic: null }),
  searchFor: (query) => set({ page: "search", query }),
  openLook: (look) => set({ look }),
  openAtlas: (kind, id) => set({ page: "atlas", atlas: { kind, id } }),
  answerQuiz: (q, right) => {
    set({ quiz: answer(get().quiz, q, right) });
    save(get());
  },
  openCabinet: (cabinet) => {
    set({ page: "cabinet", cabinet });
    save(get());
  },
  read: (ref, opts) => {
    const chapter = { book: ref.book, chapter: ref.chapter, verse: 0 };
    const history = [chapter, ...get().history.filter((h) => h.book !== ref.book || h.chapter !== ref.chapter)].slice(0, 12);
    const pick = opts?.select && ref.verse;
    set({ page: "read", location: ref, history, selected: pick ? ref : get().selected, selection: pick ? [ref.verse] : get().selection });
    save(get());
  },
  select: (selected) => set({ selected, selection: selected?.verse ? [selected.verse] : [] }),
  pick: (ref, { ctrl, shift }) => {
    const { selected, selection } = get();
    const v = ref.verse;
    if (!selected || selected.book !== ref.book || selected.chapter !== ref.chapter || (!ctrl && !shift)) return get().select(ref);
    if (shift) {
      // The anchor stays where it was, as in a file list.
      const [lo, hi] = [Math.min(selected.verse, v), Math.max(selected.verse, v)];
      const run = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
      return set({ selection: [...new Set([...(ctrl ? selection : []), ...run])].sort((a, b) => a - b) });
    }
    const next = selection.includes(v) ? selection.filter((x) => x !== v) : [...selection, v].sort((a, b) => a - b);
    if (!next.length) return set({ selected: null, selection: [] });
    set({ selected: { ...ref, verseEnd: undefined }, selection: next });
  },
  setSubRosa: (on, theme) => {
    const { subRosa, shelves, beforeSubRosa } = get();
    if (on === subRosa) return null;
    if (on) {
      const before = { shelves, themeId: theme?.themeId ?? "", mode: theme?.mode ?? "" };
      set({ subRosa: true, beforeSubRosa: before, shelves: ALL_SHELVES });
      save(get());
      return before;
    }
    set({ subRosa: false, beforeSubRosa: null, shelves: beforeSubRosa?.shelves ?? shelves });
    save(get());
    return beforeSubRosa;
  },
  set: (patch) => {
    set(patch);
    save(get());
  },
}));

export const shelfSet = (shelves: Shelf[]) => new Set<Shelf>(shelves);

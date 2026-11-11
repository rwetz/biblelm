// ╔══════════════════════════════════════╗
// ║  Ryan Wetzstein                      ║
// ║  Biblelm                             ║
// ║  2026                                ║
// ╚══════════════════════════════════════╝

// The shape of Settings: chapters, the groups inside each, and the settings
// inside each group, by the label printed on the page. One tree drives the
// Settings nav, its search, and the command palette's "Settings:" commands,
// so a setting is found the same way from everywhere.

import { SHELVES, type Shelf } from "@/lib/canon";

export interface SettingEntry {
  label: string;
  keywords?: string[];
}

export interface SettingsGroupEntry {
  id: string;
  label: string;
  settings: SettingEntry[];
}

export interface SettingsChapter {
  id: ChapterId;
  numeral: string;
  label: string;
  description: string;
  groups: SettingsGroupEntry[];
}

export type ChapterId = "reading" | "appearance" | "machine" | "you" | "subrosa" | "developer" | "about";

/** Each shelf by its own books, so "enoch" finds the Pseudepigrapha alone. */
export const SHELF_WORDS: Record<Shelf, string[]> = {
  protestant: ["protestant", "66 books"],
  deuterocanon: ["deuterocanon", "catholic", "tobit", "judith", "wisdom", "sirach", "baruch", "maccabees"],
  apocrypha: ["apocrypha", "esdras", "manasseh", "psalm 151", "1611"],
  pseudepigrapha: ["pseudepigrapha", "enoch", "watchers", "charles", "jubilees", "solomon", "nicodemus", "harrowing", "apocalypse of paul", "james"],
};

export const SETTINGS: SettingsChapter[] = [
  {
    id: "reading",
    numeral: "I",
    label: "Reading",
    description: "How Scripture looks on the page, which books it holds, and in which words.",
    groups: [
      {
        id: "text",
        label: "The text",
        settings: [
          { label: "Reading face", keywords: ["font", "typeface", "garamond", "fell", "gothic", "blackletter"] },
          { label: "Text size", keywords: ["font size", "bigger", "smaller", "zoom"] },
          { label: "Red letter", keywords: ["words of christ", "jesus", "red"] },
          { label: "Two columns", keywords: ["columns", "layout", "printed bible"] },
        ],
      },
      {
        id: "canon",
        label: "Canon",
        settings: SHELVES.map((s) => ({ label: s.label, keywords: ["canon", "shelf", "books", ...SHELF_WORDS[s.id]] })),
      },
      {
        id: "translations",
        label: "Translations",
        settings: [{ label: "Translations", keywords: ["kjv", "web", "asv", "version", "bible", "edition"] }],
      },
    ],
  },
  {
    id: "appearance",
    numeral: "II",
    label: "Appearance",
    description: "Colours, pictures, and the size of everything around the text.",
    groups: [
      {
        id: "scheme",
        label: "Scheme",
        settings: [
          { label: "Scheme", keywords: ["theme", "dark mode", "light mode", "vellum", "nocturne", "tenebrae", "colours"] },
          { label: "Follow the system's light and dark", keywords: ["dark mode", "auto", "system theme"] },
        ],
      },
      {
        id: "pictures",
        label: "Pictures",
        settings: [
          { label: "Illustrations", keywords: ["art", "pictures", "engravings", "paintings", "off"] },
          { label: "Ornaments", keywords: ["decorations", "flair", "dither", "emblems", "turn off"] },
        ],
      },
      {
        id: "layout",
        label: "Layout",
        settings: [
          { label: "Interface size", keywords: ["zoom", "scale", "bigger", "smaller", "ui size", "large monitor", "4k"] },
          { label: "Compact spacing", keywords: ["density", "small screen", "laptop", "margins", "tight"] },
          { label: "Fold the sidebar to icons", keywords: ["collapse", "nav", "room"] },
        ],
      },
      {
        id: "power",
        label: "Power",
        settings: [{ label: "Save battery", keywords: ["power", "low power", "laptop", "animation", "blur", "motion"] }],
      },
    ],
  },
  {
    id: "machine",
    numeral: "III",
    label: "Machine help",
    description: "Small models only, always citing real verses.",
    groups: [
      { id: "lab", label: "The Lab", settings: [{ label: "Lab in the sidebar", keywords: ["machine", "gpt", "train", "hide", "simpler", "study only"] }] },
      { id: "meaning", label: "Search by meaning", settings: [{ label: "Semantic search", keywords: ["meaning", "embedding", "machine"] }] },
      { id: "jev", label: "Jev", settings: [{ label: "Jev", keywords: ["typesafe", "rerank", "machine help", "bypass"] }] },
      { id: "keys", label: "Keys", settings: [{ label: "TypeSafe key for Jev", keywords: ["api key", "keychain", "typesafe", "token"] }] },
    ],
  },
  {
    id: "you",
    numeral: "IV",
    label: "You",
    description: "What is yours, kept on this computer.",
    groups: [
      { id: "name", label: "Name", settings: [{ label: "Your name", keywords: ["name", "print", "title page", "profile"] }] },
      { id: "notes", label: "Your notes", settings: [{ label: "Notes folder", keywords: ["backups", "data", "folder", "export", "where"] }] },
    ],
  },
  {
    id: "subrosa",
    numeral: "V",
    label: "Sub Rosa",
    description: "A cabinet of curiosities, kept under the rose.",
    groups: [
      {
        id: "rose",
        label: "Under the rose",
        settings: [{ label: "Sub Rosa", keywords: ["curiosities", "dark", "occult", "angels", "demons", "hell", "goetia", "solomon", "masons", "symbols", "under the rose"] }],
      },
    ],
  },
  {
    id: "developer",
    numeral: "VI",
    label: "Developer",
    description: "For finding art and layout bugs.",
    groups: [
      { id: "devmode", label: "Developer mode", settings: [{ label: "Developer mode", keywords: ["debug", "hero", "plates", "art", "ornaments sheet"] }] },
      { id: "art", label: "Art on demand", settings: [{ label: "Home hero" }, { label: "Plates" }, { label: "Ornament sheet" }] },
    ],
  },
  {
    id: "about",
    numeral: "VII",
    label: "About",
    description: "What BibleLM is, and where everything in it comes from.",
    groups: [{ id: "credits", label: "Credits", settings: [{ label: "About", keywords: ["credits", "licence", "version", "sources"] }] }],
  },
];

export interface SettingHit {
  chapter: SettingsChapter;
  group: SettingsGroupEntry;
  setting: SettingEntry;
}

const norm = (s: string) => s.toLowerCase().replace(/['’]/g, "");

/** Every setting whose label or keywords match the words typed, best first: label starts, then label contains, then keywords. */
export function findSettings(query: string, chapters: SettingsChapter[] = SETTINGS): SettingHit[] {
  const q = norm(query.trim());
  if (!q) return [];
  const scored: { hit: SettingHit; score: number }[] = [];
  for (const chapter of chapters)
    for (const group of chapter.groups)
      for (const setting of group.settings) {
        const label = norm(setting.label);
        const words = [norm(group.label), norm(chapter.label), ...(setting.keywords ?? []).map(norm)];
        const score = label.startsWith(q) ? 3 : label.includes(q) ? 2 : words.some((w) => w.includes(q)) ? 1 : 0;
        if (score) scored.push({ hit: { chapter, group, setting }, score });
      }
  return scored.sort((a, b) => b.score - a.score).map((x) => x.hit);
}

/** Where a label lives: a setting first, then a group, then a chapter. */
export function locateSetting(label: string, chapters: SettingsChapter[] = SETTINGS): { chapter: SettingsChapter; group?: SettingsGroupEntry; setting?: SettingEntry } | undefined {
  const want = norm(label);
  for (const chapter of chapters)
    for (const group of chapter.groups) {
      const setting = group.settings.find((s) => norm(s.label).startsWith(want));
      if (setting) return { chapter, group, setting };
    }
  for (const chapter of chapters) {
    const group = chapter.groups.find((g) => norm(g.label).startsWith(want));
    if (group) return { chapter, group };
  }
  const chapter = chapters.find((c) => norm(c.label).startsWith(want));
  return chapter && { chapter };
}

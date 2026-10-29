// Scriptorium: BibleLM's own theme. Vellum by day (parchment, iron-gall ink,
// rubric red), Nocturne by night (lamp-black, bone, gilt). Rubric red as the
// one accent is historically right: scribes rubricated headings and initials.
// It marks the current verse, the selection and the primary action only.

import type { Theme } from "@nexis/design";

export const SCRIPTORIUM_ID = "scriptorium";

export const scriptorium: Theme = {
  id: SCRIPTORIUM_ID,
  name: "Scriptorium",
  author: "BibleLM",
  description: "Vellum and rubric red by day, lamp-black and gilt by night.",
  variants: {
    light: {
      colors: {
        background: "#f5efe1",
        foreground: "#2a2118",
        card: "#fbf7ec",
        cardForeground: "#2a2118",
        popover: "#fffaf0",
        popoverForeground: "#2a2118",
        primary: "#3a2f24",
        primaryForeground: "#fbf7ec",
        secondary: "#ebe2cd",
        secondaryForeground: "#2a2118",
        muted: "#ebe2cd",
        mutedForeground: "#6b5d4c",
        accent: "#e6dbc2",
        accentForeground: "#2a2118",
        destructive: "#b3261e",
        border: "rgba(42,33,24,0.14)",
        input: "rgba(42,33,24,0.20)",
        ring: "#a3311d",
        sidebar: "#eee5d0",
        sidebarForeground: "#2a2118",
        sidebarPrimary: "#a3311d",
        sidebarPrimaryForeground: "#fbf7ec",
        sidebarAccent: "#e2d6ba",
        sidebarAccentForeground: "#2a2118",
        sidebarBorder: "rgba(42,33,24,0.12)",
        sidebarRing: "#a3311d",
        radius: "0.5rem",
      },
      terminal: {
        background: "#f5efe1",
        foreground: "#2a2118",
        ansi: [
          "#2a2118", "#a3311d", "#4f7a2e", "#9a6a0b",
          "#2f5f8a", "#7a3f74", "#2d7470", "#ebe2cd",
          "#6b5d4c", "#c2412a", "#5f9138", "#b67f12",
          "#3b72a6", "#93508b", "#358a85", "#fbf7ec",
        ],
      },
    },
    dark: {
      colors: {
        background: "#14110d",
        foreground: "#e9e1d0",
        card: "#1b1712",
        cardForeground: "#e9e1d0",
        popover: "#1f1a14",
        popoverForeground: "#e9e1d0",
        primary: "#e9e1d0",
        primaryForeground: "#14110d",
        secondary: "#27211a",
        secondaryForeground: "#e9e1d0",
        muted: "#27211a",
        mutedForeground: "#a69a86",
        accent: "#2e271f",
        accentForeground: "#e9e1d0",
        destructive: "#e5675e",
        border: "rgba(233,225,208,0.10)",
        input: "rgba(233,225,208,0.15)",
        ring: "#d4a94f",
        sidebar: "#100d0a",
        sidebarForeground: "#e9e1d0",
        sidebarPrimary: "#d4a94f",
        sidebarPrimaryForeground: "#14110d",
        sidebarAccent: "#2a241c",
        sidebarAccentForeground: "#e9e1d0",
        sidebarBorder: "rgba(233,225,208,0.08)",
        sidebarRing: "#d4a94f",
        radius: "0.5rem",
      },
      terminal: {
        background: "#14110d",
        foreground: "#e9e1d0",
        ansi: [
          "#27211a", "#e5675e", "#8fbf6a", "#d9a94a",
          "#78a8d6", "#c48fbe", "#6fbcb4", "#d8cfbd",
          "#5f5545", "#f08a80", "#a7d384", "#ecc068",
          "#97c0e8", "#d9a8d2", "#8fd2ca", "#f6efe0",
        ],
      },
    },
  },
};

// Tenebrae: a third scheme for the paintings. Caravaggio's black ground,
// lead-white flesh and the vermilion of his cloaks as the one accent. Night
// for looking at pictures; its light variant is a primed canvas (gesso and
// umber), reached only by toggling light while in Tenebrae.
export const TENEBRAE_ID = "tenebrae";

export const tenebrae: Theme = {
  id: TENEBRAE_ID,
  name: "Tenebrae",
  author: "BibleLM",
  description: "Caravaggio's dark ground and vermilion, for the paintings.",
  variants: {
    light: {
      colors: {
        background: "#ece4d3",
        foreground: "#1f1812",
        card: "#f4eee1",
        cardForeground: "#1f1812",
        popover: "#f8f3e8",
        popoverForeground: "#1f1812",
        primary: "#2b211a",
        primaryForeground: "#f4eee1",
        secondary: "#e0d5bf",
        secondaryForeground: "#1f1812",
        muted: "#e0d5bf",
        mutedForeground: "#62513f",
        accent: "#dacdb3",
        accentForeground: "#1f1812",
        destructive: "#a3261b",
        border: "rgba(31,24,18,0.15)",
        input: "rgba(31,24,18,0.22)",
        ring: "#a8361f",
        sidebar: "#e4dac5",
        sidebarForeground: "#1f1812",
        sidebarPrimary: "#a8361f",
        sidebarPrimaryForeground: "#f4eee1",
        sidebarAccent: "#d6c8ac",
        sidebarAccentForeground: "#1f1812",
        sidebarBorder: "rgba(31,24,18,0.12)",
        sidebarRing: "#a8361f",
        radius: "0.5rem",
      },
      terminal: {
        background: "#ece4d3",
        foreground: "#1f1812",
        ansi: [
          "#1f1812", "#a8361f", "#4f7a2e", "#9a6a0b",
          "#2f5f8a", "#7a3f74", "#2d7470", "#e0d5bf",
          "#62513f", "#c2452b", "#5f9138", "#b67f12",
          "#3b72a6", "#93508b", "#358a85", "#f4eee1",
        ],
      },
    },
    dark: {
      colors: {
        background: "#0b0907",
        foreground: "#efe6d3",
        card: "#13100c",
        cardForeground: "#efe6d3",
        popover: "#17130e",
        popoverForeground: "#efe6d3",
        primary: "#efe6d3",
        primaryForeground: "#0b0907",
        secondary: "#1f1914",
        secondaryForeground: "#efe6d3",
        muted: "#1f1914",
        mutedForeground: "#a99b85",
        accent: "#261f18",
        accentForeground: "#efe6d3",
        destructive: "#e5675e",
        border: "rgba(239,230,211,0.09)",
        input: "rgba(239,230,211,0.14)",
        ring: "#d9603f",
        sidebar: "#080605",
        sidebarForeground: "#efe6d3",
        sidebarPrimary: "#d9603f",
        sidebarPrimaryForeground: "#0b0907",
        sidebarAccent: "#211b15",
        sidebarAccentForeground: "#efe6d3",
        sidebarBorder: "rgba(239,230,211,0.07)",
        sidebarRing: "#d9603f",
        radius: "0.5rem",
      },
      terminal: {
        background: "#0b0907",
        foreground: "#efe6d3",
        ansi: [
          "#1f1914", "#e5675e", "#8fbf6a", "#d9a94a",
          "#78a8d6", "#c48fbe", "#6fbcb4", "#d8cfbd",
          "#5f5545", "#f08a80", "#a7d384", "#ecc068",
          "#97c0e8", "#d9a8d2", "#8fd2ca", "#f6efe0",
        ],
      },
    },
  },
};

export type Scheme = "vellum" | "nocturne" | "tenebrae";

export const SCHEMES: { id: Scheme; label: string; blurb: string }[] = [
  { id: "vellum", label: "Vellum", blurb: "Parchment and rubric red" },
  { id: "nocturne", label: "Nocturne", blurb: "Lamp-black and gilt" },
  { id: "tenebrae", label: "Tenebrae", blurb: "Caravaggio's dark and vermilion, for the paintings" },
];

// Sub Rosa: the curiosities mode's own theme (src/app/subrosa.ts). Not a
// scheme you step to: it comes with the mode and goes with it. Cold where
// the others are warm: a green-black like a smoked glass, ash and bone for
// the ink, and brimstone (sulphur yellow) as the one accent. Its light
// variant (ash on bone) exists only because a theme must have one.
export const SUBROSA_ID = "subrosa";

export const subRosa: Theme = {
  id: SUBROSA_ID,
  name: "Sub Rosa",
  author: "BibleLM",
  description: "Smoked glass, ash and brimstone, under the rose.",
  variants: {
    light: {
      colors: {
        background: "#e3e2da",
        foreground: "#16170f",
        card: "#ecebe3",
        cardForeground: "#16170f",
        popover: "#f1f0e8",
        popoverForeground: "#16170f",
        primary: "#1f2018",
        primaryForeground: "#ecebe3",
        secondary: "#d4d3c8",
        secondaryForeground: "#16170f",
        muted: "#d4d3c8",
        mutedForeground: "#56574a",
        accent: "#cbcabd",
        accentForeground: "#16170f",
        destructive: "#a3261b",
        border: "rgba(22,23,15,0.15)",
        input: "rgba(22,23,15,0.22)",
        ring: "#7d7414",
        sidebar: "#d9d8cd",
        sidebarForeground: "#16170f",
        sidebarPrimary: "#7d7414",
        sidebarPrimaryForeground: "#ecebe3",
        sidebarAccent: "#c8c7b9",
        sidebarAccentForeground: "#16170f",
        sidebarBorder: "rgba(22,23,15,0.12)",
        sidebarRing: "#7d7414",
        radius: "0.5rem",
      },
      terminal: {
        background: "#e3e2da",
        foreground: "#16170f",
        ansi: [
          "#16170f", "#a3261b", "#4f7a2e", "#7d7414",
          "#2f5f8a", "#6a3f74", "#2d7470", "#d4d3c8",
          "#56574a", "#c2452b", "#5f9138", "#9a9019",
          "#3b72a6", "#83508b", "#358a85", "#ecebe3",
        ],
      },
    },
    dark: {
      colors: {
        background: "#0a0c0a",
        foreground: "#d8d6c6",
        card: "#101310",
        cardForeground: "#d8d6c6",
        popover: "#141714",
        popoverForeground: "#d8d6c6",
        primary: "#d8d6c6",
        primaryForeground: "#0a0c0a",
        secondary: "#1a1e1a",
        secondaryForeground: "#d8d6c6",
        muted: "#1a1e1a",
        mutedForeground: "#8e8f7f",
        accent: "#202520",
        accentForeground: "#d8d6c6",
        destructive: "#e5675e",
        border: "rgba(216,214,198,0.09)",
        input: "rgba(216,214,198,0.14)",
        ring: "#cdbf45",
        sidebar: "#070907",
        sidebarForeground: "#d8d6c6",
        sidebarPrimary: "#cdbf45",
        sidebarPrimaryForeground: "#0a0c0a",
        sidebarAccent: "#1c201c",
        sidebarAccentForeground: "#d8d6c6",
        sidebarBorder: "rgba(216,214,198,0.07)",
        sidebarRing: "#cdbf45",
        radius: "0.5rem",
      },
      terminal: {
        background: "#0a0c0a",
        foreground: "#d8d6c6",
        ansi: [
          "#1a1e1a", "#e5675e", "#8fbf6a", "#cdbf45",
          "#78a8d6", "#b48fbe", "#6fbcb4", "#c8c6b6",
          "#4f5246", "#f08a80", "#a7d384", "#e2d55e",
          "#97c0e8", "#cba8d2", "#8fd2ca", "#eeecdc",
        ],
      },
    },
  },
};

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

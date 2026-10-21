// The three schemes as one choice: Vellum and Nocturne are Scriptorium's
// light and dark, Tenebrae is its own theme (src/app/theme.ts).

import { useTheme } from "@nexis/design";
import { SCRIPTORIUM_ID, TENEBRAE_ID, type Scheme } from "./theme";

export function useScheme(): [Scheme, (s: Scheme) => void] {
  const theme = useTheme();
  const scheme: Scheme = theme.themeId === TENEBRAE_ID ? "tenebrae" : theme.resolvedMode === "dark" ? "nocturne" : "vellum";
  const set = (s: Scheme) => {
    theme.setThemeId(s === "tenebrae" ? TENEBRAE_ID : SCRIPTORIUM_ID);
    theme.setMode(s === "vellum" ? "light" : "dark");
  };
  return [scheme, set];
}

export const nextScheme = (s: Scheme): Scheme => (s === "vellum" ? "nocturne" : s === "nocturne" ? "tenebrae" : "vellum");

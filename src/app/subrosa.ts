// Sub Rosa ("under the rose", said of what is told in confidence): the
// curiosities mode. Off by default; going under asks for one acknowledgement
// (SubRosaAsk, from Settings or the palette). It puts on its own theme and every shelf,
// without a word about the shelves; coming back out restores the scheme and
// the shelves you had. See docs/SUBROSA.md.

import { useEffect } from "react";
import { create } from "zustand";
import { useTheme } from "@nexis/design";
import { useStudy } from "@/store/study";
import { SCRIPTORIUM_ID, SUBROSA_ID } from "./theme";

type Mode = ReturnType<typeof useTheme>["mode"];

export function useSubRosa(): [boolean, (on: boolean) => void] {
  const on = useStudy((s) => s.subRosa);
  const setSubRosa = useStudy((s) => s.setSubRosa);
  const theme = useTheme();
  const set = (next: boolean) => {
    const before = setSubRosa(next, { themeId: theme.themeId, mode: theme.mode });
    if (next) {
      theme.setThemeId(SUBROSA_ID);
      theme.setMode("dark");
    } else {
      theme.setThemeId(before?.themeId && before.themeId !== SUBROSA_ID ? before.themeId : SCRIPTORIUM_ID);
      theme.setMode((before?.mode || "light") as Mode);
    }
  };
  return [on, set];
}

/** Whether the acknowledgement before going under is open. One for the app, so Settings and the palette share it. */
export const useSubRosaAsk = create<{ asking: boolean; ask: (open: boolean) => void }>((set) => ({ asking: false, ask: (asking) => set({ asking }) }));

/**
 * Keeps the page and the mode agreeing: `data-subrosa` on <html> for the
 * stylesheet, and the theme held to Sub Rosa while it is on (the theme engine
 * keeps its own choice in storage, which can drift from the study store's).
 */
export function useSubRosaSync() {
  const on = useStudy((s) => s.subRosa);
  const theme = useTheme();
  useEffect(() => {
    const root = document.documentElement;
    if (on) root.dataset.subrosa = "";
    else delete root.dataset.subrosa;
    if (on && theme.themeId !== SUBROSA_ID) theme.setThemeId(SUBROSA_ID);
    if (on && theme.mode !== "dark") theme.setMode("dark");
    if (!on && theme.themeId === SUBROSA_ID) theme.setThemeId(SCRIPTORIUM_ID);
  }, [on, theme]);
}

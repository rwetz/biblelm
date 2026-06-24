import { createContext, useContext, useEffect, useState } from "react";
import { flushSync } from "react-dom";

type Mode = "light" | "dark" | "system";

const STORAGE_KEY = "biblelm-ui-theme";

interface ThemeCtx {
  resolvedMode: "light" | "dark";
  mode: Mode;
  setMode: (m: Mode) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as Mode) ?? "system";
    } catch {
      return "system";
    }
  });

  const resolved: "light" | "dark" =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;

  const setMode = (m: Mode) => {
    const apply = () => {
      setModeState(m);
      try {
        localStorage.setItem(STORAGE_KEY, m);
      } catch {}
    };
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (
      doc.startViewTransition &&
      !window.matchMedia("(prefers-reduced-motion:reduce)").matches
    ) {
      doc.startViewTransition(() => flushSync(apply));
    } else {
      apply();
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.classList.toggle("light", resolved === "light");
  }, [resolved]);

  return (
    <Ctx.Provider value={{ mode, resolvedMode: resolved, setMode }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

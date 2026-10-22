// The app's own command palette (Mod+Shift+P, or the title bar): every page,
// setting and action in BibleLM, and nothing from Scripture (Search is for
// that). While it is empty the placeholder types out things to try; as you
// type, a dithered compass beside the box resolves as the matches narrow, and
// each group carries its own ornament. Ranking is the design system's
// (rankCommands), so it orders matches like every other palette in the family.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "motion/react";
import { Icon, cn, rankCommands, useReducedMotion, type PaletteCommand } from "@nexis/design";
import { Ornament } from "@/art/Art";
import type { OrnamentName } from "@/art/ornaments";

/** Which ornament marks each group of commands. */
const GROUP_ORNAMENT: Record<string, OrnamentName> = {
  Navigate: "compass",
  Settings: "urn",
  Appearance: "sun",
  Read: "cross",
  Study: "chi-rho",
  Notebooks: "quill",
  Translation: "tetragrammaton",
  Canon: "ihs",
  Art: "fleuron",
  Lab: "ophan",
};

const TRY = ["dark mode", "learn by heart", "two columns", "red letter", "interlinear", "export notes", "studies for young men", "text size", "your name", "ornaments"];

/** The placeholder types and erases suggestions, one after another. */
function useTypedHint(active: boolean, reduced: boolean) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!active || reduced) return setText("");
    let i = 0, n = 0, dir = 1, wait = 0;
    const id = setInterval(() => {
      const word = TRY[i % TRY.length];
      if (wait > 0) return void wait--;
      n += dir;
      if (n >= word.length) [dir, wait] = [-1, 22];
      if (n <= 0) [dir, wait, i] = [1, 4, i + 1];
      setText(word.slice(0, Math.max(0, n)));
    }, 55);
    return () => clearInterval(id);
  }, [active, reduced]);
  return text;
}

function Highlight({ text, indices }: { text: string; indices: readonly number[] }) {
  if (!indices.length) return <>{text}</>;
  const on = new Set(indices);
  return <>{Array.from(text, (ch, i) => (on.has(i) ? <span key={i} className="font-semibold text-foreground">{ch}</span> : ch))}</>;
}

export function Palette({ open, onOpenChange, commands }: { open: boolean; onOpenChange: (o: boolean) => void; commands: readonly PaletteCommand[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const reduced = !!useReducedMotion();
  const hint = useTypedHint(open && !query, reduced);
  const groups = useMemo(() => rankCommands(commands, query), [commands, query]);
  const flat = useMemo(() => groups.flatMap(([, items]) => items.map((x) => x.c)), [groups]);
  // The compass resolves as the list narrows: faint at rest, whole on one match.
  const level = !query ? 0.3 : flat.length === 0 ? 0.08 : Math.min(1, 0.45 + 0.55 * (1 - Math.min(1, flat.length / 24)));

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    requestAnimationFrame(() => input.current?.focus());
  }, [open]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (c: PaletteCommand | undefined) => {
    if (!c || c.disabled) return;
    onOpenChange(false);
    requestAnimationFrame(() => c.run());
  };

  let i = -1;
  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/55 pt-[14vh] backdrop-blur-[6px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.16 }}
          onMouseDown={(e) => e.target === e.currentTarget && onOpenChange(false)}
        >
          <m.div
            role="dialog"
            aria-modal
            aria-label="Commands"
            className="w-[min(40rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-popover shadow-2xl ring-1 ring-foreground/10"
            initial={reduced ? false : { opacity: 0, y: -10, scale: 0.97, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduced ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onOpenChange(false);
              else if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(flat.length - 1, a + 1)));
              else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
              else if (e.key === "Enter") (e.preventDefault(), run(flat[active]));
            }}
          >
            <div className="relative flex items-center gap-3 border-b border-border/60 px-4">
              <Ornament name="compass" level={level} reveal={false} className="size-8" />
              <div className="relative flex-1">
                <input
                  ref={input}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Find a page, setting or command"
                  className="h-14 w-full bg-transparent text-[15px] text-foreground outline-none"
                />
                {!query && (
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-[15px] text-muted-foreground">
                    Find a page, setting or command{hint && <span className="text-muted-foreground/70">: {hint}</span>}
                    <span className="ml-px inline-block h-4 w-px animate-pulse bg-muted-foreground/60" />
                  </span>
                )}
              </div>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">Esc</kbd>
              {/* A line of dots runs under the box while you type. */}
              <span aria-hidden className={cn("palette-seek absolute inset-x-0 -bottom-px h-px", query && "is-seeking")} />
            </div>
            <div ref={list} className="max-h-[26rem] overflow-y-auto p-2">
              {!flat.length && (
                <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
                  <Ornament name="lamp" className="h-10" />
                  Nothing in BibleLM matches “{query}”. To search Scripture, use Search.
                </div>
              )}
              {groups.map(([group, items], gi) => (
                <section key={group || "_"} className="mb-1">
                  <m.p
                    className="flex items-center gap-2 px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                    initial={reduced ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduced ? 0 : gi * 0.03 }}
                  >
                    {GROUP_ORNAMENT[group] && <Ornament name={GROUP_ORNAMENT[group]} className="h-4" reveal={false} />}
                    {group}
                  </m.p>
                  {items.map(({ c, indices }) => {
                    i++;
                    const k = i;
                    const on = k === active;
                    return (
                      <m.button
                        key={c.id}
                        type="button"
                        data-i={k}
                        disabled={c.disabled}
                        onMouseMove={() => active !== k && setActive(k)}
                        onClick={() => run(c)}
                        className={cn("relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm", on ? "text-foreground" : "text-foreground/80")}
                        initial={reduced ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduced ? 0 : Math.min(k, 12) * 0.012, duration: 0.18 }}
                      >
                        {on && <m.span layoutId="palette-active" className="absolute inset-0 -z-10 rounded-lg bg-accent" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                        {c.icon ? <Icon name={c.icon} className={cn("shrink-0", on ? "text-brand" : "text-muted-foreground")} /> : <span className="w-4" />}
                        <span className="flex-1 truncate">
                          <Highlight text={c.label} indices={indices} />
                        </span>
                        {c.shortcut && <kbd className="font-mono text-[10px] text-muted-foreground">{c.shortcut}</kbd>}
                        {on && <Icon name="arrow-right" size="xs" className="text-muted-foreground" />}
                      </m.button>
                    );
                  })}
                </section>
              ))}
            </div>
            <div className="flex items-center gap-4 border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
              <span><kbd className="font-mono">↑↓</kbd> to move</span>
              <span><kbd className="font-mono">Enter</kbd> to open</span>
              <span className="flex-1" />
              <span>{flat.length} {flat.length === 1 ? "match" : "matches"}</span>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

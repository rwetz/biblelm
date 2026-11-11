// ╔══════════════════════════════════════╗
// ║  Ryan Wetzstein                      ║
// ║  Biblelm                             ║
// ║  2026                                ║
// ╚══════════════════════════════════════╝

/**
 * A settings nav as a tree, for settings too many for one flat list: the
 * contents page of a book. Chapters carry a numeral; a chapter's sections
 * hang from a hairline spine under it. Two rails glide (Nexis's
 * `useGlidingRail`): a soft highlight between chapters, and a short accent
 * mark that travels down the spine to the section in view, so where you are
 * reads at a glance and moving never jumps.
 *
 * It is generic (nodes in, a chapter and section out) so it can move into
 * @nexis/design beside `SidebarNav`; nothing in it knows about BibleLM.
 * WAI-ARIA tree keys: Up and Down move, Right opens or steps in, Left closes
 * or steps out, Enter and Space choose, Home and End jump.
 */

import * as React from "react";
import { Icon, RailIndicator, cn, useGlidingRail } from "@nexis/design";

export interface SettingsTreeNode {
  id: string;
  label: string;
  /** The leading mark of a chapter: a numeral, an icon. */
  mark?: React.ReactNode;
  /** Quiet text on the right of a section (a count, where a search hit lives). */
  meta?: React.ReactNode;
  children?: readonly SettingsTreeNode[];
}

export function SettingsTree({
  nodes,
  chapter,
  section,
  onSelect,
  openAll = false,
  label = "Settings",
  className,
}: {
  nodes: readonly SettingsTreeNode[];
  /** The chapter shown. */
  chapter: string;
  /** The section in view inside it, if any. */
  section?: string | null;
  onSelect: (chapter: string, section: string | null) => void;
  /** Every chapter open, as while searching. */
  openAll?: boolean;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState<Set<string>>(() => new Set([chapter]));
  // Moving to a chapter opens it and folds the rest, like turning a page;
  // others can still be opened by their chevrons to look inside.
  React.useEffect(() => setOpen(new Set([chapter])), [chapter]);
  const isOpen = (id: string) => openAll || open.has(id);
  const toggle = (id: string, to?: boolean) =>
    setOpen((o) => {
      const next = new Set(o);
      if (to ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });

  // Visible rows in order, for the keys.
  const flat = React.useMemo(() => {
    const out: { id: string; parent: string | null; node: SettingsTreeNode }[] = [];
    for (const n of nodes) {
      out.push({ id: n.id, parent: null, node: n });
      if (n.children?.length && isOpen(n.id)) for (const c of n.children) out.push({ id: `${n.id}/${c.id}`, parent: n.id, node: c });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, open, openAll]);

  const revision = flat.length;
  const chapters = useGlidingRail<string>(chapter, "vertical", revision);
  const sections = useGlidingRail<string>(section ? `${chapter}/${section}` : "", "vertical", revision);
  const setContainer = React.useCallback(
    (el: HTMLDivElement | null) => {
      (chapters.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      (sections.containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    },
    [chapters.containerRef, sections.containerRef],
  );

  // Opening and closing animate the tree's height; the rails' resize
  // observer measures again as it moves, so the marks follow the rows.

  const rows = React.useRef(new Map<string, HTMLElement>());
  const [focusId, setFocusId] = React.useState<string>(chapter);
  const focus = (id: string | undefined) => {
    if (!id) return;
    setFocusId(id);
    rows.current.get(id)?.focus();
  };
  const choose = (id: string) => {
    const r = flat.find((f) => f.id === id);
    if (!r) return;
    if (r.parent) onSelect(r.parent, r.node.id);
    else onSelect(r.node.id, null);
  };
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const r = flat[i];
    const hasKids = !r.parent && !!r.node.children?.length;
    switch (e.key) {
      case "ArrowDown":
        focus(flat[i + 1]?.id);
        break;
      case "ArrowUp":
        focus(flat[i - 1]?.id);
        break;
      case "ArrowRight":
        if (hasKids && !isOpen(r.id)) toggle(r.id, true);
        else if (hasKids) focus(flat[i + 1]?.id);
        break;
      case "ArrowLeft":
        if (r.parent) focus(r.parent);
        else if (hasKids && isOpen(r.id) && r.id !== chapter) toggle(r.id, false);
        break;
      case "Home":
        focus(flat[0]?.id);
        break;
      case "End":
        focus(flat[flat.length - 1]?.id);
        break;
      case "Enter":
      case " ":
        choose(r.id);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <nav aria-label={label} className={cn("text-body", className)}>
      <div ref={setContainer} role="tree" aria-label={label} className="relative flex flex-col" onPointerLeave={() => chapters.setHoverId(null)}>
        <RailIndicator rail={chapters} rect={chapters.hoverRect} radius={10} className="inset-x-0 bg-muted/45" />
        <RailIndicator rail={chapters} rect={chapters.activeRect} radius={10} className="inset-x-0 bg-muted/80" />
        {/* The section mark rides the spine: 1.75rem in, centred on the hairline. */}
        <RailIndicator rail={sections} rect={sections.activeRect} radius={2} className="left-[calc(1.375rem-0.5px)] w-0.5 bg-brand" />
        {nodes.map((n) => {
          const on = n.id === chapter;
          const kids = n.children ?? [];
          const opened = isOpen(n.id) && kids.length > 0;
          const i = flat.findIndex((f) => f.id === n.id);
          return (
            <div key={n.id} role="none">
              <div
                ref={(el) => {
                  chapters.registerItem(n.id, el);
                  if (el) rows.current.set(n.id, el);
                  else rows.current.delete(n.id);
                }}
                role="treeitem"
                aria-selected={on}
                aria-expanded={kids.length ? opened : undefined}
                aria-level={1}
                tabIndex={focusId === n.id ? 0 : -1}
                onFocus={() => setFocusId(n.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                onClick={() => onSelect(n.id, null)}
                onPointerEnter={() => chapters.setHoverId(n.id)}
                className={cn(
                  "relative z-10 grid h-9 cursor-default grid-cols-[1.75rem_minmax(0,1fr)_1rem] items-center gap-2 rounded-[10px] px-2 outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring/40",
                  on ? "text-foreground" : "text-foreground/70 hover:text-foreground",
                )}
              >
                <span className={cn("text-center font-garamond text-[0.95rem] tracking-wide tabular-nums", on ? "text-brand" : "text-muted-foreground")}>{n.mark}</span>
                <span className={cn("truncate", on && "font-medium")}>{n.label}</span>
                {kids.length > 0 && !openAll ? (
                  <span
                    aria-hidden
                    onClick={(e) => {
                      e.stopPropagation();
                      if (n.id !== chapter) toggle(n.id);
                    }}
                    className="grid size-4 place-items-center text-muted-foreground"
                  >
                    <Icon name="chevron-right" size="xs" className={cn("transition-transform duration-200", opened && "rotate-90")} />
                  </span>
                ) : (
                  <span />
                )}
              </div>
              {kids.length > 0 && (
                <div
                  role="group"
                  className={cn("grid transition-[grid-template-rows,opacity] duration-200 ease-out", opened ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="mb-1.5 ml-[1.375rem] mt-0.5 border-l border-border/70">
                      {kids.map((c) => {
                        const id = `${n.id}/${c.id}`;
                        const active = on && c.id === section;
                        const k = flat.findIndex((f) => f.id === id);
                        return (
                          <div
                            key={c.id}
                            ref={(el) => {
                              sections.registerItem(id, el);
                              if (el) rows.current.set(id, el);
                              else rows.current.delete(id);
                            }}
                            role="treeitem"
                            aria-selected={active}
                            aria-level={2}
                            tabIndex={opened && focusId === id ? 0 : -1}
                            onFocus={() => setFocusId(id)}
                            onKeyDown={(e) => k >= 0 && onKeyDown(e, k)}
                            onClick={() => onSelect(n.id, c.id)}
                            className={cn(
                              "relative z-10 flex min-h-7 cursor-default items-center gap-2 rounded-md py-1 pl-4 pr-2 text-[0.8125rem] outline-none transition-colors",
                              "before:absolute before:left-0 before:top-1/2 before:h-px before:w-2.5 before:bg-border/70",
                              "focus-visible:ring-2 focus-visible:ring-ring/40",
                              active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate">{c.label}</span>
                            {c.meta !== undefined && <span className="shrink-0 text-caption text-muted-foreground/80">{c.meta}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

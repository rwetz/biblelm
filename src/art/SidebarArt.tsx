// The vignette at the foot of the sidebar: one dithered plate that follows
// what you are doing. Reading, it is the latest scene of the book so far;
// on Home, the book of the verse of the day; in a notebook, its cover; on the
// other pages, one chosen so it never repeats the page's corner plate. A click
// opens the passage it depicts.

import { useMemo } from "react";
import { BOOKS } from "@/lib/canon";
import { PAGE_PLATES, plateUrl, SIDEBAR_PLATES, type Plate } from "@/lib/art";
import { useNotebooks } from "@/store/notebooks";
import { useStudy } from "@/store/study";
import { verseOfTheDay } from "@/features/home/HomeView";
import { cn } from "@nexis/design";
import { Dither, Ornament, usePlates } from "./Art";
import type { OrnamentName } from "./ornaments";

const ORDER = new Map(BOOKS.map((b, i) => [b.osis, i]));

/**
 * The latest scene so far: the last plate at or before this chapter, reading
 * the Bible in order, so a book with no plate of its own (most epistles) shows
 * the nearest scene before it. Before the first plate, the first. With
 * `before`, only plates of earlier chapters: the reader already sets this
 * chapter's own beside its verses, so the sidebar shows the scene that led here.
 */
export function plateSoFar(plates: Plate[], book: string, chapter: number, before = false): Plate | undefined {
  const at = (p: Plate) => (ORDER.get(p.ref!.book) ?? 999) * 1000 + p.ref!.chapter;
  const here = (ORDER.get(book) ?? 999) * 1000 + chapter;
  const placed = plates.filter((p) => p.ref).sort((a, b) => at(a) - at(b) || (a.ref!.verse ?? 0) - (b.ref!.verse ?? 0));
  return placed.filter((p) => (before ? at(p) < here : at(p) <= here)).pop() ?? placed[0];
}

function useSidebarPlate(): Plate | undefined {
  const page = useStudy((s) => s.page);
  const location = useStudy((s) => s.location);
  const cover = useNotebooks((s) => s.notebooks.find((b) => b.id === s.active)?.plate);
  const devPlate = useStudy((s) => (s.devMode ? s.devPlate : null));
  const plates = usePlates();
  const inText = useStudy((s) => s.illustrations === "full");
  return useMemo(() => {
    if (!plates.length) return undefined;
    const n = (k: number) => plates.find((p) => p.n === k);
    if (devPlate) return n(devPlate);
    const daily = verseOfTheDay();
    switch (page) {
      case "home":
        return plateSoFar(plates, daily.book, daily.chapter) ?? n(PAGE_PLATES.empty);
      case "read":
        return plateSoFar(plates, location.book, location.chapter, inText) ?? n(PAGE_PLATES.empty);
      case "notebooks":
        return plates.find((p) => p.id === cover) ?? n(SIDEBAR_PLATES.notebooks);
      default:
        return n(SIDEBAR_PLATES[page] ?? PAGE_PLATES.empty);
    }
  }, [plates, page, location.book, location.chapter, cover, devPlate, inText]);
}

export function SidebarArt() {
  const plate = useSidebarPlate();
  const pinned = useStudy((s) => s.devMode && s.devPlate !== null);
  const mode = useStudy((s) => s.illustrations);
  const read = useStudy((s) => s.read);
  if (!plate || mode === "off") return null;
  return (
    <button
      type="button"
      onClick={() => plate.ref && read(plate.ref, { select: true })}
      aria-label={`${plate.title}. Open the passage`}
      className="group absolute inset-x-0 bottom-0 z-20 block text-left outline-none [@media(max-height:680px)]:hidden"
    >
      <Dither
        key={plate.id}
        src={plateUrl(plate.full)}
        algo="floyd"
        dot={1}
        focusY={30}
        edges={{ top: 0.18 }}
        className="h-64 w-full text-sidebar-foreground opacity-85 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className="block truncate px-4 pb-3 font-garamond text-xs italic text-muted-foreground transition-colors group-hover:text-foreground group-focus-visible:text-foreground">
        {plate.title}
        {pinned && <span className="not-italic"> · pinned in Developer</span>}
      </span>
    </button>
  );
}

/** Each page's ornament: the mark beside its title and in the sidebar. */
export const PAGE_ORNAMENT: Record<string, OrnamentName> = {
  home: "ihs",
  read: "cross",
  search: "compass",
  topics: "chi-rho",
  atlas: "compass",
  gallery: "fleuron",
  daily: "sun",
  notebooks: "quill",
  lab: "ophan",
  settings: "urn",
};

/** Daily is the sun by day and the lamp after five. */
const pageOrnament = (page: string): OrnamentName => (page === "daily" && new Date().getHours() >= 17 ? "lamp" : PAGE_ORNAMENT[page] ?? "fleuron");

/**
 * The sidebar's ornament: the current page's mark, dithered large in the open
 * space between the nav and the vignette. Each move to another page dissolves
 * it and resolves the next, dot by dot.
 */
export function SidebarOrnament() {
  const page = useStudy((s) => s.page);
  return (
    // Centred in the gap between the nav (about 23rem tall) and the vignette (about 18.5rem); hidden when there is no gap.
    <div aria-hidden className="pointer-events-none absolute inset-x-0 flex -translate-y-1/2 justify-center [@media(max-height:820px)]:hidden" style={{ top: "calc(23rem + (100% - 41.5rem) / 2)" }}>
      <Ornament key={page} name={pageOrnament(page)} className="w-20 text-sidebar-foreground opacity-70" />
    </div>
  );
}

/** A page title's ornament, set before the blackletter. */
export function PageMark({ page, className }: { page: string; className?: string }) {
  return <Ornament name={pageOrnament(page)} className={cn("h-9 text-muted-foreground", className)} />;
}

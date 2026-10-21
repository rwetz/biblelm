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
import { Dither, usePlates } from "./Art";

const ORDER = new Map(BOOKS.map((b, i) => [b.osis, i]));

/**
 * The latest scene so far: the last plate at or before this chapter, reading
 * the Bible in order, so a book with no plate of its own (most epistles) shows
 * the nearest scene before it. Before the first plate, the first.
 */
export function plateSoFar(plates: Plate[], book: string, chapter: number): Plate | undefined {
  const at = (p: Plate) => (ORDER.get(p.ref!.book) ?? 999) * 1000 + p.ref!.chapter;
  const here = (ORDER.get(book) ?? 999) * 1000 + chapter;
  const placed = plates.filter((p) => p.ref).sort((a, b) => at(a) - at(b) || (a.ref!.verse ?? 0) - (b.ref!.verse ?? 0));
  return placed.filter((p) => at(p) <= here).pop() ?? placed[0];
}

function useSidebarPlate(): Plate | undefined {
  const page = useStudy((s) => s.page);
  const location = useStudy((s) => s.location);
  const cover = useNotebooks((s) => s.notebooks.find((b) => b.id === s.active)?.plate);
  const devPlate = useStudy((s) => (s.devMode ? s.devPlate : null));
  const plates = usePlates();
  return useMemo(() => {
    if (!plates.length) return undefined;
    const n = (k: number) => plates.find((p) => p.n === k);
    if (devPlate) return n(devPlate);
    const daily = verseOfTheDay();
    switch (page) {
      case "home":
        return plateSoFar(plates, daily.book, daily.chapter) ?? n(PAGE_PLATES.empty);
      case "read":
        return plateSoFar(plates, location.book, location.chapter) ?? n(PAGE_PLATES.empty);
      case "notebooks":
        return plates.find((p) => p.id === cover) ?? n(SIDEBAR_PLATES.notebooks);
      default:
        return n(SIDEBAR_PLATES[page] ?? PAGE_PLATES.empty);
    }
  }, [plates, page, location.book, location.chapter, cover, devPlate]);
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

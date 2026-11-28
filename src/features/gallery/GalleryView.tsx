// The Gallery: every picture in the app, in Bible order, each opening in Look
// beside the passage it shows. Paintings appear as painted (thumbnails, no
// dots); Doré's plates as engravings.

import { useMemo, useRef, useState } from "react";
import { Button, Icon, cn } from "@nexis/design";
import { DitherHero, Engraving, usePaintings, usePlates } from "@/art/Art";
import { byBibleOrder, pagePainting, paintingCredit, paintingUrl, plateCredit, type Painting, type Plate } from "@/lib/art";
import { bookName, formatRef } from "@/lib/canon";
import { useStudy } from "@/store/study";
import { PageMark } from "@/art/SidebarArt";
import { Sections } from "@/app/Sections";
import { Choice, SearchField } from "@/app/controls";

type Show = "paintings" | "plates";
const PAGE_SIZE = 12;
const DETAILS = new Set(["empty notebook", "ophan", "living creature"]);

export function GalleryView() {
  const paintings = usePaintings();
  const plates = usePlates();
  const [show, setShow] = useState<Show>("paintings");
  const rose = useStudy((s) => s.subRosa);
  const hero = paintings.find((p) => p.id === pagePainting("gallery", rose));
  const galleryPlates = useMemo(() => plates.filter((p) => !DETAILS.has(p.role ?? "")).sort(byBibleOrder), [plates]);
  const galleryPaintings = useMemo(() => [...paintings].sort(byBibleOrder), [paintings]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <DitherHero hero={hero} height="clamp(7rem, 17vh, 10rem)" clearLeft fadeFrom={36} caption={false}>
        <div className="mx-auto flex w-full max-w-6xl flex-1 items-end gap-4 px-(--gutter) pb-4">
          <div>
            <h1 className="flex items-center gap-3 font-blackletter text-5xl"><PageMark page="gallery" />Gallery</h1>
          </div>
        </div>
      </DitherHero>
      <div className="mx-auto w-full max-w-6xl px-(--gutter) pt-2">
        <Sections
          label="Gallery"
          value={show}
          onChange={setShow}
          sections={[
            { id: "paintings", name: "Paintings", gist: `${paintings.length} in oil, in colour`, mark: "lamp" },
            { id: "plates", name: "Engravings", gist: `${galleryPlates.length} plates and woodcuts`, mark: "fleuron" },
          ]}
        />
      </div>
      <GalleryCollection key={show} items={show === "paintings" ? galleryPaintings : galleryPlates} label={show === "paintings" ? "paintings" : "engravings"} />
    </div>
  );
}

function GalleryCollection({ items, label }: { items: (Painting | Plate)[]; label: string }) {
  const openLook = useStudy((s) => s.openLook);
  const top = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [book, setBook] = useState("");
  const [artist, setArtist] = useState("");
  const [page, setPage] = useState(1);

  const collection = useMemo(() => {
    const books = [...new Set(items.map((it) => it.ref?.book ?? "unlinked"))];
    const artists = [...new Set(items.map((it) => it.artist ?? "Gustave Doré"))].sort((a, b) => a.localeCompare(b));
    return {
      books: books.map((value) => ({ value, label: value === "unlinked" ? "Beside the Scriptures" : bookName(value) })),
      artists: artists.map((value) => ({ value, label: value })),
    };
  }, [items]);
  const search = query.trim().toLocaleLowerCase();
  const filtered = useMemo(() => items.filter((it) => {
    const maker = it.artist ?? "Gustave Doré";
    const match = `${it.title} ${maker} ${it.ref ? formatRef(it.ref) : ""}`.toLocaleLowerCase();
    return (!book || book === (it.ref?.book ?? "unlinked")) && (!artist || artist === maker) && (!search || match.includes(search));
  }), [items, book, artist, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const step = (next: number) => {
    setPage(next);
    top.current?.scrollIntoView({ block: "start" });
  };

  return (
    <div ref={top} className="mx-auto w-full max-w-6xl px-(--gutter) pb-12">
      <div data-glass-surface className="sticky top-0 z-10 space-y-2 border-b border-border bg-background py-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <SearchField size="sm" aria-label="Find artwork" placeholder="Find artwork" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          <Choice size="sm" className="w-full" label="Filter by book" value={book} options={[{ value: "", label: "All books" }, ...collection.books]} onChange={(value) => { setBook(value); setPage(1); }} />
          <Choice size="sm" className="w-full" label="Filter by artist" value={artist} options={[{ value: "", label: "All artists" }, ...collection.artists]} onChange={(value) => { setArtist(value); setPage(1); }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-ui text-muted-foreground" aria-live="polite">
            {filtered.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} ${filtered.length === 1 ? label.slice(0, -1) : label}` : `No ${label} found`}
          </p>
          {pages > 1 && (
            <nav aria-label="Gallery pages" className="flex items-center gap-2 text-ui tabular-nums">
              <Button size="icon-sm" variant="ghost" aria-label="Previous gallery page" disabled={current === 1} onClick={() => step(current - 1)}><Icon name="chevron-left" /></Button>
              <span>{current} / {pages}</span>
              <Button size="icon-sm" variant="ghost" aria-label="Next gallery page" disabled={current === pages} onClick={() => step(current + 1)}><Icon name="chevron-right" /></Button>
            </nav>
          )}
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-x-4 gap-y-5 pt-4">
        {filtered.slice(start, start + PAGE_SIZE).map((it) => {
          const painting = "medium" in it ? it : null;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => openLook({ kind: painting ? "painting" : "plate", id: it.id })}
              className="gallery-card group min-w-0 self-start rounded-md text-left focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="grid aspect-[4/3] place-items-center overflow-hidden rounded-md bg-muted/50">
                {painting ? (
                  <img src={paintingUrl(painting.thumb)} alt="" loading="lazy" decoding="async" className={cn("gallery-picture size-full object-contain", !painting.colour && "engraving")} />
                ) : (
                  <Engraving plate={it as Plate} size="thumb" className="size-full object-contain" />
                )}
              </span>
              <span className="mt-2 block font-garamond text-base leading-tight group-hover:underline">{it.title}</span>
              <span className="mt-0.5 block text-caption text-muted-foreground">
                {painting ? paintingCredit(painting) : plateCredit(it as Plate)}
                {it.ref && <> · {formatRef(it.ref)}</>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  Spinner,
  Toolbar,
  ToolbarSpacer,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@nexis/design";
import { DitherHero, Fleuron, PlateFigure, usePaintings, usePlates } from "@/art/Art";
import { paintingCredit, paintingsInChapter, platesInChapter, type Painting } from "@/lib/art";
import { loadTranslation, runs, type Run, type Translation, type Verse } from "@/lib/bible";
import { isHebrew, loadInterlinear, type BookWords } from "@/lib/interlinear";
import { BOOKS, book as bookOf, bookName, formatRef, SHELVES, type Ref } from "@/lib/canon";
import { useCatalog, useTranslations } from "@/lib/hooks";
import { noteCovers, useNotebooks } from "@/store/notebooks";
import { useStudy } from "@/store/study";
import { BookPicker } from "./BookPicker";
import { TranslationPicker } from "./TranslationPicker";
import { VersePanel } from "./VersePanel";

const FACES = { garamond: "var(--font-garamond)", fell: "var(--font-fell)", gothic: "var(--font-gothic)" };

/** Move a chapter forward or back, across books, within the enabled shelves. */
export async function chapterStep(delta: 1 | -1) {
  const s = useStudy.getState();
  const t = await loadTranslation(s.translation);
  const books = t.books().filter((b) => s.shelves.includes(bookOf(b)?.shelf ?? "protestant"));
  let bi = books.indexOf(s.location.book);
  if (bi < 0) bi = 0;
  const chapters = t.chapters(books[bi]);
  const ci = chapters.indexOf(s.location.chapter) + delta;
  if (ci >= 0 && ci < chapters.length) return s.read({ book: books[bi], chapter: chapters[ci], verse: 0 });
  const nb = books[bi + delta];
  if (!nb) return;
  const nc = t.chapters(nb);
  s.read({ book: nb, chapter: delta > 0 ? nc[0] : nc[nc.length - 1], verse: 0 });
}

/** The verse the panel last showed, so it can come back after it is closed. */
let lastSelected: Ref | null = null;

/** Show or hide the verse panel (`p`): back on the last verse, else this chapter's first. */
export function toggleVersePanel() {
  const s = useStudy.getState();
  if (s.selected) return s.select(null);
  const l = s.location;
  const last = lastSelected && lastSelected.book === l.book && lastSelected.chapter === l.chapter ? lastSelected : null;
  s.select(last ?? { book: l.book, chapter: l.chapter, verse: l.verse || 1 });
}

export function ReadView() {
  const { translation, parallel, location, shelves, face, textSize, columns, selected, interlinear, read, select, set } = useStudy();
  const ids = useMemo(() => [translation, ...parallel.filter((p) => p !== translation)], [translation, parallel]);
  const [ts, error] = useTranslations(ids);
  const main = ts?.[0];
  const plates = usePlates();
  const paintings = usePaintings();
  const scroller = useRef<HTMLDivElement>(null);
  if (selected) lastSelected = selected;

  // Keyboard: [ and ] turn chapters (unless typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "]") chapterStep(1);
      if (e.key === "[") chapterStep(-1);
      if (e.key === "Escape") select(null);
      if (e.key === "p" && !e.ctrlKey && !e.metaKey && !e.altKey) toggleVersePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  // Scroll to the verse we were sent to, or the top of a new chapter.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !main) return;
    if (location.verse) {
      requestAnimationFrame(() => el.querySelector(`[data-v="${location.verse}"]`)?.scrollIntoView({ block: "center" }));
    } else el.scrollTo({ top: 0 });
  }, [location.book, location.chapter, location.verse, main]);

  if (error) return <DataMissing message={error} />;
  if (!main) return <div className="grid flex-1 place-items-center"><Spinner /></div>;

  // A book missing from this translation (e.g. Tobit in the KJV-less ASV): fall back to its first book.
  const bookId = main.hasBook(location.book) ? location.book : main.books()[0];
  const verses = main.chapter(bookId, location.chapter);
  const chapterPlates = platesInChapter(plates, bookId, location.chapter);
  const chapterPaintings = paintingsInChapter(paintings, bookId, location.chapter);
  const b = bookOf(bookId);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <ReaderToolbar t={main} bookId={bookId} />
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          {chapterPaintings.length > 0 && <Frontispiece key={`${bookId}.${location.chapter}`} paintings={chapterPaintings} />}
          <article
            className="mx-auto px-8 pb-24 pt-10"
            style={{ maxWidth: ts!.length > 1 ? "none" : columns ? "68rem" : "42rem", ["--scripture-face" as string]: FACES[face], ["--scripture-size" as string]: `${textSize}px` }}
          >
            <header className="mb-8 text-center">
              {b && b.shelf !== "protestant" && (
                <Badge variant="outline" className="mb-3">{SHELVES.find((s) => s.id === b.shelf)?.label}</Badge>
              )}
              <h1 className="font-blackletter text-5xl leading-tight text-foreground">{bookName(bookId)}</h1>
              <p className="mt-2 font-garamond text-lg italic text-muted-foreground">
                {bookId === "Ps" ? `Psalm ${location.chapter}` : `Chapter ${location.chapter}`}
              </p>
            </header>

            {ts!.length > 1 ? (
              <Parallel ts={ts!} bookId={bookId} chapter={location.chapter} />
            ) : interlinear ? (
              <Interlinear verses={verses} bookId={bookId} chapter={location.chapter} selected={selected} onSelect={(v) => select({ book: v.book, chapter: v.chapter, verse: v.verse })} />
            ) : (
              <Chapter
                verses={verses}
                plates={chapterPlates}
                columns={columns}
                selected={selected}
                onSelect={(v) => select({ book: v.book, chapter: v.chapter, verse: v.verse })}
                onPlateRef={(r) => read(r, { select: true })}
              />
            )}

            <Fleuron />
            <nav className="flex items-center justify-between text-sm">
              <Button variant="ghost" size="sm" onClick={() => chapterStep(-1)}>
                <Icon name="chevron-left" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground">{main.meta.name}</span>
              <Button variant="ghost" size="sm" onClick={() => chapterStep(1)}>
                Next <Icon name="chevron-right" />
              </Button>
            </nav>
          </article>
        </div>
      </div>
      {selected && <VersePanel refSel={selected} translations={ts!} onClose={() => select(null)} shelves={shelves} onNavigate={(r) => read(r, { select: true })} onSetParallel={(p) => set({ parallel: p })} />}
    </div>
  );
}

/**
 * A chapter a painting depicts opens with it: the painting kept whole in the
 * middle, dissolving into the page above the chapter title. Several (Matthew
 * 26 has three) take turns by the dots under the caption.
 */
function Frontispiece({ paintings }: { paintings: Painting[] }) {
  const [i, setI] = useState(0);
  const openLook = useStudy((s) => s.openLook);
  const read = useStudy((s) => s.read);
  const p = paintings[Math.min(i, paintings.length - 1)];
  return (
    <div className="relative">
      <DitherHero hero={p} height="clamp(20rem, 54vh, 40rem)" width="72rem" fadeFrom={62} caption={false} />
      <div className="relative z-10 mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-8 text-center text-xs text-muted-foreground">
        <button type="button" className="font-garamond text-sm italic text-foreground hover:underline" onClick={() => openLook({ kind: "painting", id: p.id })}>
          {p.title}
        </button>
        <span>{paintingCredit(p)}</span>
        {p.ref && (
          <button type="button" className="underline-offset-2 hover:underline" onClick={() => read(p.ref!, { select: true })}>
            {formatRef(p.ref)}
          </button>
        )}
        <Button variant="ghost" size="xs" onClick={() => openLook({ kind: "painting", id: p.id })}>
          <Icon name="expand" size="xs" /> Look
        </Button>
        {paintings.length > 1 && (
          <span className="flex gap-1.5" role="tablist" aria-label="Paintings of this chapter">
            {paintings.map((q, k) => (
              <button
                key={q.id}
                type="button"
                role="tab"
                aria-selected={k === i}
                aria-label={q.title}
                onClick={() => setI(k)}
                className={cn("size-2 rounded-full", k === i ? "bg-brand" : "bg-muted-foreground/40 hover:bg-muted-foreground")}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

function Chapter({
  verses,
  plates,
  columns,
  selected,
  onSelect,
  onPlateRef,
}: {
  verses: Verse[];
  plates: ReturnType<typeof usePlates>;
  columns: boolean;
  selected: Ref | null;
  onSelect: (v: Verse) => void;
  onPlateRef: (r: Ref) => void;
}) {
  const notebook = useNotebooks((s) => s.active);
  const notes = useNotebooks((s) => s.notes);
  const highlights = useNotebooks((s) => s.highlights);
  const hl = useMemo(() => new Set(highlights.filter((h) => h.notebook === notebook).map((h) => h.ref)), [highlights, notebook]);

  // Paragraphs follow the pilcrows; a chapter without any is one paragraph.
  // A paragraph also breaks after a verse that has a plate, so the plate sits
  // right after the verse it depicts rather than at the end of a long block.
  const anchor = (p: (typeof plates)[number]) => p.ref?.verseEnd ?? p.ref?.verse;
  const plateVerses = useMemo(() => new Set(plates.map(anchor)), [plates]);
  const paras = useMemo(() => {
    const out: Verse[][] = [];
    let breakNext = false;
    for (const v of verses) {
      if (!out.length || ((v.para || breakNext) && out[out.length - 1].length)) out.push([]);
      out[out.length - 1].push(v);
      breakNext = plateVerses.has(v.verse);
    }
    return out;
  }, [verses, plateVerses]);

  // Plates sit after the paragraph holding the verse they depict.
  const platesAfter = (p: Verse[]) => plates.filter((pl) => pl.ref && p[p.length - 1]?.verse === anchor(pl));

  return (
    <div className={cn("scripture", columns && "columns")}>
      {paras.map((p, pi) => (
        <Fragment key={pi}>
          <p className="mb-4">
            {p.map((v, vi) => {
              const osis = `${v.book}.${v.chapter}.${v.verse}`;
              const first = pi === 0 && vi === 0;
              const hasNote = notebook && notes.some((n) => n.notebook === notebook && noteCovers(n, osis));
              return (
                <span
                  key={v.verse}
                  data-v={v.verse}
                  data-active={selected?.verse === v.verse && selected.chapter === v.chapter && selected.book === v.book}
                  data-hl={hl.has(osis)}
                  onClick={() => onSelect(v)}
                  className="cursor-pointer"
                >
                  {!first && <sup className="vnum">{v.verse}</sup>}
                  <VerseText raw={v.raw} dropcap={first} />
                  {hasNote && <Icon name="note" size="xs" className="mx-0.5 inline align-baseline text-brand" />}{" "}
                </span>
              );
            })}
          </p>
          {platesAfter(p).map((pl) => (
            <PlateFigure key={pl.id} plate={pl} onOpenRef={() => pl.ref && onPlateRef(pl.ref)} className="[column-span:all]" />
          ))}
        </Fragment>
      ))}
    </div>
  );
}

/**
 * Interlinear reading: each verse, then its Hebrew or Greek word by word with
 * a transliteration and an English gloss under each (STEPBible, CC BY).
 * Books without the original-language data (the deuterocanon) read plainly.
 */
function Interlinear({ verses, bookId, chapter, selected, onSelect }: { verses: Verse[]; bookId: string; chapter: number; selected: Ref | null; onSelect: (v: Verse) => void }) {
  const [words, setWords] = useState<BookWords | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setWords(undefined);
    loadInterlinear(bookId).then((w) => live && setWords(w));
    return () => {
      live = false;
    };
  }, [bookId]);
  if (words === undefined) return <div className="grid place-items-center py-10"><Spinner /></div>;
  return (
    <div className="scripture space-y-6">
      {!words && <p className="font-sans text-sm text-muted-foreground">No Hebrew or Greek for this book here: the interlinear covers the 66 books.</p>}
      {verses.map((v) => {
        const ws = words?.[`${chapter}.${v.verse}`] ?? [];
        const rtl = isHebrew(ws);
        return (
          <div key={v.verse} data-v={v.verse} data-active={selected?.verse === v.verse && selected.chapter === chapter} onClick={() => onSelect(v)} className="cursor-pointer">
            <p>
              <sup className="vnum">{v.verse}</sup>
              <VerseText raw={v.raw} />
            </p>
            {ws.length > 0 && (
              <div dir={rtl ? "rtl" : "ltr"} className="mt-2 flex flex-wrap gap-x-4 gap-y-3">
                {ws.map((w, i) => (
                  <span key={i} className="flex flex-col items-center text-center" title={`${w[3]} · ${w[4]}`}>
                    <span className={cn("leading-tight text-foreground", rtl ? "font-serif text-[1.35em]" : "text-[1.1em]")} lang={rtl ? "he" : "grc"}>{w[0]}</span>
                    <span dir="ltr" className="font-sans text-[0.62em] italic text-muted-foreground">{w[1]}</span>
                    <span dir="ltr" className="max-w-[9rem] font-sans text-[0.66em] text-foreground/80">{w[2]}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <p className="font-sans text-xs text-muted-foreground">Hebrew (Leningrad Codex) and Greek (NA28 base text) with glosses from STEPBible, Tyndale House, CC BY 4.0.</p>
    </div>
  );
}

function RunText({ r }: { r: Run }) {
  const body = r.supplied ? <em className="supplied">{r.text}</em> : r.text;
  return r.wj ? <span className="wj">{body}</span> : <>{body}</>;
}

/**
 * Printed text: the KJV's supplied words in italics, the words of Christ
 * marked (red when red letter is on), an optional drop cap.
 */
export function VerseText({ raw, dropcap = false }: { raw: string; dropcap?: boolean }) {
  const parts = runs(raw);
  if (dropcap && parts[0] && !parts[0].supplied && parts[0].text) {
    const [head, ...rest] = parts;
    return (
      <>
        <span className="dropcap" aria-hidden>{head.text[0]}</span>
        <span className="sr-only">{head.text[0]}</span>
        <RunText r={{ ...head, text: head.text.slice(1) }} />
        {rest.map((r, i) => <RunText key={i} r={r} />)}
      </>
    );
  }
  return <>{parts.map((r, i) => <RunText key={i} r={r} />)}</>;
}

function Parallel({ ts, bookId, chapter }: { ts: Translation[]; bookId: string; chapter: number }) {
  const select = useStudy((s) => s.select);
  const selected = useStudy((s) => s.selected);
  const nums = useMemo(() => {
    const set = new Set<number>();
    for (const t of ts) for (const v of t.chapter(bookId, chapter)) set.add(v.verse);
    return [...set].sort((a, b) => a - b);
  }, [ts, bookId, chapter]);
  const maps = ts.map((t) => new Map(t.chapter(bookId, chapter).map((v) => [v.verse, v])));
  return (
    <div className="scripture">
      <div className="grid gap-x-8 border-b border-border pb-2 font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground" style={{ gridTemplateColumns: `repeat(${ts.length}, minmax(0, 1fr))` }}>
        {ts.map((t) => (
          <span key={t.meta.id}>{t.meta.abbr} · {t.meta.language}</span>
        ))}
      </div>
      {nums.map((n) => (
        <div
          key={n}
          data-v={n}
          data-active={selected?.verse === n && selected.chapter === chapter}
          onClick={() => select({ book: bookId, chapter, verse: n })}
          className="grid cursor-pointer gap-x-8 border-b border-border/40 py-2"
          style={{ gridTemplateColumns: `repeat(${ts.length}, minmax(0, 1fr))` }}
        >
          {maps.map((m, i) => {
            const v = m.get(n);
            return (
              <div key={i} className="text-[0.92em]">
                <sup className="vnum">{n}</sup>
                {v ? <VerseText raw={v.raw} /> : <span className="text-muted-foreground">–</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ReaderToolbar({ t, bookId }: { t: Translation; bookId: string }) {
  const { location, shelves, translation, parallel, columns, selected, interlinear, read, set } = useStudy();
  const [catalog] = useCatalog();
  const books = t.books().filter((b) => shelves.includes(bookOf(b)?.shelf ?? "protestant"));

  return (
    <Toolbar className="border-b border-border/60 px-3">
      <BookPicker t={t} books={books} bookId={bookId} chapter={location.chapter} onGo={(b, c) => read({ book: b, chapter: c, verse: 0 })} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Previous chapter" onClick={() => chapterStep(-1)}><Icon name="chevron-left" /></Button>
        </TooltipTrigger>
        <TooltipContent>Previous chapter ( [ )</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Next chapter" onClick={() => chapterStep(1)}><Icon name="chevron-right" /></Button>
        </TooltipTrigger>
        <TooltipContent>Next chapter ( ] )</TooltipContent>
      </Tooltip>
      <ToolbarSpacer />
      <TranslationPicker catalog={catalog ?? []} value={translation} onChange={(id) => set({ translation: id })} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={parallel.length ? "secondary" : "ghost"} size="sm">
            <Icon name="split-vertical" /> Parallel{parallel.length ? ` (${parallel.length})` : ""}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Read side by side with</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(catalog ?? []).filter((m) => m.id !== translation).map((m) => (
            <DropdownMenuCheckboxItem
              key={m.id}
              checked={parallel.includes(m.id)}
              onCheckedChange={(on) => set({ parallel: on ? [...parallel, m.id] : parallel.filter((p) => p !== m.id) })}
            >
              {m.abbr} · {m.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant={selected ? "secondary" : "ghost"} size="icon-sm" aria-label="Verse panel" onClick={toggleVersePanel}>
            <Icon name="info" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Verse panel: notes, cross references, words ( p )</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant={interlinear ? "secondary" : "ghost"} size="icon-sm" aria-label="Interlinear" aria-pressed={interlinear} onClick={() => set({ interlinear: !interlinear })}>
            <Icon name="text" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Interlinear: the Hebrew and Greek under each verse</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant={columns ? "secondary" : "ghost"} size="icon-sm" aria-label="Two columns" onClick={() => set({ columns: !columns })}>
            <Icon name="layout-left" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Two columns, like a printed Bible</TooltipContent>
      </Tooltip>
    </Toolbar>
  );
}

export function DataMissing({ message }: { message: string }) {
  return (
    <div className="grid flex-1 place-items-center p-8">
      <div className="max-w-md text-center">
        <h2 className="font-blackletter text-3xl">The shelves are empty</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          The Bible texts have not been built yet. Run <code className="font-mono">pnpm data</code> in the project folder, then reload.
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground/70">{message}</p>
      </div>
    </div>
  );
}

export const ALL_BOOKS = BOOKS;

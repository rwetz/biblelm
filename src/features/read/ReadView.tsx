import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Dither, DitherHero, Engraving, Fleuron, Ornament, PlateFigure, usePaintings, usePlates } from "@/art/Art";
import { evangelistFor, paintingCredit, paintingsInChapter, platesInBook, platesInChapter, plateCredit, plateUrl, type Painting } from "@/lib/art";
import { loadTranslation, runs, type Run, type Translation, type Verse } from "@/lib/bible";
import { isHebrew, loadInterlinear, type BookWords } from "@/lib/interlinear";
import { BOOKS, book as bookOf, bookName, formatRef, SHELVES, type Ref } from "@/lib/canon";
import { useCatalog, useTranslations } from "@/lib/hooks";
import { noteEndsAt, useNotebooks } from "@/store/notebooks";
import { useStudy } from "@/store/study";
import { EVANGELIST, ORNAMENTS } from "@/art/ornaments";
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

/** A click on a verse: alone opens it; ctrl (cmd) and shift pick several, as in a file list. */
type OnPick = (v: { book: string; chapter: number; verse: number }, e: MouseEvent) => void;

/** Shift-click would otherwise drag a text selection across the verses. */
const noTextSelect = (e: MouseEvent) => {
  if (e.shiftKey || e.ctrlKey || e.metaKey) e.preventDefault();
};

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
  const { translation, parallel, location, shelves, face, textSize, columns, selected, selection, interlinear, read, select, pick, set } = useStudy();
  const ids = useMemo(() => [translation, ...parallel.filter((p) => p !== translation)], [translation, parallel]);
  const [ts, error] = useTranslations(ids);
  const main = ts?.[0];
  const plates = usePlates();
  const paintings = usePaintings();
  const scroller = useRef<HTMLDivElement>(null);
  if (selected) lastSelected = selected;
  const picked = useMemo(() => new Set(selected ? selection : []), [selected, selection]);
  const onPick: OnPick = (v, e) => pick({ book: v.book, chapter: v.chapter, verse: v.verse }, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });

  // Keyboard: [ and ] turn chapters (unless typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey) return; // with the modifier, [ and ] go back and forward (App)
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
  const chapters = main.chapters(bookId);
  // A headpiece opens a book and a tailpiece closes it, as in a printed Bible.
  const firstChapter = location.chapter === chapters[0];
  const lastChapter = location.chapter === chapters[chapters.length - 1];

  return (
    <div className="@container/reader relative flex min-h-0 flex-1">
      <div className="@container flex min-w-0 flex-1 flex-col">
        <ReaderToolbar t={main} bookId={bookId} />
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          {chapterPaintings.length > 0 && <Frontispiece key={`${bookId}.${location.chapter}`} paintings={chapterPaintings} />}
          <article
            className="mx-auto px-(--gutter) pb-24 pt-(--page-top)"
            style={{ maxWidth: columnsOf(ts!, bookId).length > 1 ? "none" : columns ? "68rem" : "42rem", ["--scripture-face" as string]: FACES[face], ["--scripture-size" as string]: `${textSize / 16}rem` }}
          >
            <header className="mb-8 text-center">
              {firstChapter && <BookHead bookId={bookId} plates={plates} />}
              {b && b.shelf !== "protestant" && (
                <Badge variant="outline" className="mb-3">{SHELVES.find((s) => s.id === b.shelf)?.label}</Badge>
              )}
              <h1 className="font-blackletter text-5xl leading-tight text-foreground">{bookName(bookId)}</h1>
              <div className="mt-2 flex items-center justify-center gap-3 font-garamond text-lg italic text-muted-foreground">
                {EVANGELIST[bookId] && <Ornament name={EVANGELIST[bookId]} label={ORNAMENTS[EVANGELIST[bookId]].title} className="h-11" />}
                {bookId === "Ps" ? `Psalm ${location.chapter}` : `Chapter ${location.chapter}`}
                {EVANGELIST[bookId] && <span className="w-11" />}
              </div>
            </header>

            {columnsOf(ts!, bookId).length > 1 ? (
              <Parallel ts={columnsOf(ts!, bookId)} bookId={bookId} chapter={location.chapter} picked={picked} onPick={onPick} />
            ) : interlinear ? (
              <Interlinear verses={verses} bookId={bookId} chapter={location.chapter} picked={picked} onPick={onPick} />
            ) : (
              <Chapter
                verses={verses}
                plates={chapterPlates}
                columns={columns}
                picked={picked}
                onPick={onPick}
                onPlateRef={(r) => read(r, { select: true })}
                capArt={platesInBook(plates, bookId)[0]?.thumb}
              />
            )}

            {lastChapter ? <Ornament name="urn" className="mx-auto my-10 h-20 text-muted-foreground" /> : <Fleuron />}
            <nav className="flex items-center justify-between text-sm">
              <Button variant="ghost" size="sm" onClick={() => chapterStep(-1)}>
                <Icon name="chevron-left" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground">{main.sourceOf(bookId).name}</span>
              <Button variant="ghost" size="sm" onClick={() => chapterStep(1)}>
                Next <Icon name="chevron-right" />
              </Button>
            </nav>
          </article>
        </div>
      </div>
      {selected && selection.length > 0 && <VersePanel refSel={selected} verses={selection} translations={ts!} onClose={() => select(null)} shelves={shelves} onNavigate={(r) => read(r, { select: true })} onSetParallel={(p) => set({ parallel: p })} />}
    </div>
  );
}

/**
 * A book's first chapter opens with a headpiece: the evangelist's portrait
 * over a Gospel (a sixteenth-century woodcut, each with his symbol), else the
 * vine.
 */
function BookHead({ bookId, plates }: { bookId: string; plates: ReturnType<typeof usePlates> }) {
  const evangelist = evangelistFor(plates, bookId);
  if (!evangelist) return <Ornament name="vine" className="mx-auto mb-5 w-full max-w-[26rem]" />;
  return (
    <figure className="mx-auto mb-5 w-36">
      <Engraving plate={evangelist} size="thumb" className="mx-auto w-full" />
      <figcaption className="mt-1 font-garamond text-xs italic text-muted-foreground">{evangelist.title}, {plateCredit(evangelist)}</figcaption>
    </figure>
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
      <DitherHero hero={p} height="clamp(15rem, 54vh, 40rem)" width="72rem" fadeFrom={62} caption={false} />
      <div className="relative z-10 mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-(--gutter) text-center text-xs text-muted-foreground">
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
  picked,
  onPick,
  onPlateRef,
  capArt,
}: {
  verses: Verse[];
  plates: ReturnType<typeof usePlates>;
  columns: boolean;
  picked: Set<number>;
  onPick: OnPick;
  onPlateRef: (r: Ref) => void;
  /** A plate of this book, dithered small under the chapter's initial. */
  capArt?: { file: string; dir?: string; width: number; height: number };
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
              // A note is marked once, where each of its runs of verses ends.
              const hasNote = notebook && notes.some((n) => n.notebook === notebook && noteEndsAt(n, osis));
              return (
                <span
                  key={v.verse}
                  data-v={v.verse}
                  data-active={picked.has(v.verse)}
                  data-hl={hl.has(osis)}
                  onMouseDown={noTextSelect}
                  onClick={(e) => onPick(v, e)}
                  className="cursor-pointer"
                >
                  {!first && <sup className="vnum">{v.verse}</sup>}
                  <VerseText raw={v.raw} dropcap={first} capArt={first && capArt ? plateUrl(capArt) : undefined} />
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
function Interlinear({ verses, bookId, chapter, picked, onPick }: { verses: Verse[]; bookId: string; chapter: number; picked: Set<number>; onPick: OnPick }) {
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
          <div key={v.verse} data-v={v.verse} data-active={picked.has(v.verse)} onMouseDown={noTextSelect} onClick={(e) => onPick(v, e)} className="cursor-pointer">
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
export function VerseText({ raw, dropcap = false, capArt }: { raw: string; dropcap?: boolean; capArt?: string }) {
  const parts = runs(raw);
  if (dropcap && parts[0] && !parts[0].supplied && parts[0].text) {
    const [head, ...rest] = parts;
    return (
      <>
        <span className={cn("dropcap", capArt && "relative isolate")} aria-hidden>
          {/* A drop cap over a tiny cut of the book's art, as early printers set them. */}
          {capArt && <Dither inline src={capArt} dot={1} reveal={false} focusY={35} className="absolute inset-x-[-0.05em] inset-y-[0.02em] -z-10 text-muted-foreground opacity-35" />}
          {head.text[0]}
        </span>
        <span className="sr-only">{head.text[0]}</span>
        <RunText r={{ ...head, text: head.text.slice(1) }} />
        {rest.map((r, i) => <RunText key={i} r={r} />)}
      </>
    );
  }
  return <>{parts.map((r, i) => <RunText key={i} r={r} />)}</>;
}

/** Parallel columns for a book: one per distinct text (every translation borrows 1 Enoch from the same one). */
function columnsOf(ts: Translation[], bookId: string): Translation[] {
  const seen = new Set<string>();
  return ts.filter((t) => t.hasBook(bookId) && !seen.has(t.sourceOf(bookId).id) && seen.add(t.sourceOf(bookId).id));
}

function Parallel({ ts, bookId, chapter, picked, onPick }: { ts: Translation[]; bookId: string; chapter: number; picked: Set<number>; onPick: OnPick }) {
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
          <span key={t.meta.id}>{t.sourceOf(bookId).abbr} · {t.sourceOf(bookId).language}</span>
        ))}
      </div>
      {nums.map((n) => (
        <div
          key={n}
          data-v={n}
          data-active={picked.has(n)}
          onMouseDown={noTextSelect}
          onClick={(e) => onPick({ book: bookId, chapter, verse: n }, e)}
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
    <Toolbar className="min-w-0 gap-1 overflow-hidden border-b border-border/60 px-3 @xl:gap-2">
      <BookPicker t={t} books={books} bookId={bookId} chapter={location.chapter} onGo={(b, c) => read({ book: b, chapter: c, verse: 0 })} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="hidden @md:inline-flex" aria-label="Previous chapter" onClick={() => chapterStep(-1)}><Icon name="chevron-left" /></Button>
        </TooltipTrigger>
        <TooltipContent>Previous chapter ( [ )</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="hidden @md:inline-flex" aria-label="Next chapter" onClick={() => chapterStep(1)}><Icon name="chevron-right" /></Button>
        </TooltipTrigger>
        <TooltipContent>Next chapter ( ] )</TooltipContent>
      </Tooltip>
      <ToolbarSpacer />
      <TranslationPicker catalog={catalog ?? []} value={translation} onChange={(id) => set({ translation: id })} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={parallel.length ? "secondary" : "ghost"} size="sm" aria-label="Parallel">
            <Icon name="split-vertical" /> <span className="hidden @lg:inline">Parallel</span>{parallel.length ? ` (${parallel.length})` : ""}
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
          <Button variant={interlinear ? "secondary" : "ghost"} size="icon-sm" className="hidden @xl:inline-flex" aria-label="Interlinear" aria-pressed={interlinear} onClick={() => set({ interlinear: !interlinear })}>
            <Icon name="text" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Interlinear: the Hebrew and Greek under each verse</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant={columns ? "secondary" : "ghost"} size="icon-sm" className="hidden @xl:inline-flex" aria-label="Two columns" onClick={() => set({ columns: !columns })}>
            <Icon name="layout-left" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Two columns, like a printed Bible</TooltipContent>
      </Tooltip>
      {/* A narrow column (the verse panel open in a small window) folds the rest in here. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="@xl:hidden" aria-label="More reading options">
            <Icon name="more" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => chapterStep(-1)}>
            <Icon name="chevron-left" /> Previous chapter
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => chapterStep(1)}>
            <Icon name="chevron-right" /> Next chapter
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem checked={interlinear} onCheckedChange={(on) => set({ interlinear: on })}>
            Interlinear (Hebrew and Greek)
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={columns} onCheckedChange={(on) => set({ columns: on })}>
            Two columns
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
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

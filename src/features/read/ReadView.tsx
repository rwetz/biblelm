import { Fragment, useEffect, useMemo, useRef } from "react";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Spinner,
  Toolbar,
  ToolbarSpacer,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@nexis/design";
import { Fleuron, PlateFigure, usePlates } from "@/art/Art";
import { platesInBook, platesInChapter } from "@/lib/art";
import { loadTranslation, runs, type Run, type Translation, type Verse } from "@/lib/bible";
import { BOOKS, book as bookOf, bookName, SHELVES, type Ref } from "@/lib/canon";
import { useCatalog, useTranslations } from "@/lib/hooks";
import { noteCovers, useNotebooks } from "@/store/notebooks";
import { useStudy } from "@/store/study";
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

export function ReadView() {
  const { translation, parallel, location, shelves, face, textSize, columns, selected, read, select, set } = useStudy();
  const ids = useMemo(() => [translation, ...parallel.filter((p) => p !== translation)], [translation, parallel]);
  const [ts, error] = useTranslations(ids);
  const main = ts?.[0];
  const plates = usePlates();
  const scroller = useRef<HTMLDivElement>(null);

  // Keyboard: [ and ] turn chapters (unless typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "]") chapterStep(1);
      if (e.key === "[") chapterStep(-1);
      if (e.key === "Escape") select(null);
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
  const tail = chapterPlates.length ? undefined : nearestPlate(plates, bookId, location.chapter);
  const b = bookOf(bookId);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <ReaderToolbar t={main} bookId={bookId} />
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          <article
            className="mx-auto px-8 pb-24 pt-10"
            style={{ maxWidth: ts!.length > 1 ? "none" : columns ? "68rem" : "42rem", ["--scripture-face" as string]: FACES[face], ["--scripture-size" as string]: `${textSize}px` }}
          >
            <header className="mb-8 text-center">
              {b && b.shelf !== "protestant" && (
                <Badge variant="outline" className="mb-3">{SHELVES.find((s) => s.id === b.shelf)?.label}</Badge>
              )}
              <h1 className="font-blackletter text-5xl leading-tight text-foreground">{bookName(bookId)}</h1>
              <p className="mt-2 font-gothic text-lg tracking-wide text-muted-foreground">
                {bookId === "Ps" ? `Psalm ${location.chapter}` : `Chapter ${location.chapter}`}
              </p>
            </header>

            {ts!.length > 1 ? (
              <Parallel ts={ts!} bookId={bookId} chapter={location.chapter} />
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

            {tail && (
              <div className="mx-auto mt-10 max-w-xs opacity-80">
                <PlateFigure plate={tail} onOpenRef={() => tail.ref && read(tail.ref, { select: true })} />
              </div>
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

function nearestPlate(plates: ReturnType<typeof usePlates>, book: string, chapter: number) {
  const inBook = platesInBook(plates, book);
  if (!inBook.length) return undefined;
  return inBook.reduce((a, b) => (Math.abs(b.ref!.chapter - chapter) < Math.abs(a.ref!.chapter - chapter) ? b : a));
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
  const { location, shelves, translation, parallel, columns, read, set } = useStudy();
  const [catalog] = useCatalog();
  const books = t.books().filter((b) => shelves.includes(bookOf(b)?.shelf ?? "protestant"));
  const chapters = t.chapters(bookId);
  const groups: { label: string; ids: string[] }[] = [
    { label: "Old Testament", ids: books.filter((b) => bookOf(b)?.testament === "OT" && bookOf(b)?.shelf === "protestant") },
    { label: "Deuterocanon", ids: books.filter((b) => bookOf(b)?.shelf === "deuterocanon") },
    { label: "Apocrypha", ids: books.filter((b) => bookOf(b)?.shelf === "apocrypha") },
    { label: "New Testament", ids: books.filter((b) => bookOf(b)?.testament === "NT") },
  ].filter((g) => g.ids.length);

  return (
    <Toolbar className="border-b border-border/60 px-3">
      <Select value={bookId} onValueChange={(b) => read({ book: b, chapter: t.chapters(b)[0] ?? 1, verse: 0 })}>
        <SelectTrigger size="sm" className="w-44" aria-label="Book">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[70vh]">
          {groups.map((g) => (
            <SelectGroup key={g.label}>
              <SelectLabel>{g.label}</SelectLabel>
              {g.ids.map((b) => (
                <SelectItem key={b} value={b}>{bookName(b)}</SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(location.chapter)} onValueChange={(c) => read({ book: bookId, chapter: +c, verse: 0 })}>
        <SelectTrigger size="sm" className="w-20" aria-label="Chapter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[60vh]">
          {chapters.map((c) => (
            <SelectItem key={c} value={String(c)}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
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
      <Select value={translation} onValueChange={(id) => set({ translation: id })}>
        <SelectTrigger size="sm" className="w-56" aria-label="Translation">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(catalog ?? []).map((m) => (
            <SelectItem key={m.id} value={m.id}>{m.abbr} · {m.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
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

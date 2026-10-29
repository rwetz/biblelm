import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Icon, ScrollArea, SectionLabel, Spinner, Textarea, toast, Tooltip, TooltipContent, TooltipTrigger, cn } from "@nexis/design";
import { listTranslations, loadTranslation, type Translation, type VerseIndex } from "@/lib/bible";
import { book as bookOf, formatRef, osisOf, parseOsis, type Ref, type Shelf } from "@/lib/canon";
import { useCatalog, useGraph, useIndex } from "@/lib/hooks";
import { useFlip } from "@/lib/flip";
import { rankXrefs, XREF_LEVELS, type XrefRanking } from "@/lib/jev";
import { moreLikeThis, type Hit } from "@/lib/semantic";
import { topicsForVerse, type Topic } from "@/lib/topics";
import { noteCovers, noteSpans, spanFields, spansLabel, spansOf, useNotebooks, type Span } from "@/store/notebooks";
import { useStudy } from "@/store/study";
import { VerseText } from "./ReadView";
import { wordDiff } from "./diff";
import { StrongsEntry, VerseWords } from "./WordStudy";
import { VerseReading } from "@/features/search/JevReading";
import { usePaintings, usePlates } from "@/art/Art";
import { depicts, paintingCredit, paintingUrl, plateCredit, plateUrl } from "@/lib/art";
import { PlacesAndPeople } from "@/features/atlas/VerseAtlas";
import { NoteBody } from "@/features/notebooks/NoteBody";
import { companionLinks } from "@/lib/companions";

// Beside the text while the reader is wide enough to hold both; on a narrower
// one (a small laptop, a half-screen window) it floats over the text instead
// of squeezing it to a ribbon (the reader is the `reader` container).
const PANEL = cn(
  "flex w-[clamp(18rem,34vw,25rem)] shrink-0 flex-col border-l border-border/60 bg-card/60",
  "@max-[60rem]/reader:absolute @max-[60rem]/reader:inset-y-0 @max-[60rem]/reader:right-0 @max-[60rem]/reader:z-30 @max-[60rem]/reader:bg-card @max-[60rem]/reader:shadow-xl",
);

const label = (osis: string) => {
  const r = parseOsis(osis);
  return r ? formatRef(r) : osis;
};

type PanelProps = {
  refSel: Ref;
  translations: Translation[];
  shelves: Shelf[];
  onClose: () => void;
  onNavigate: (r: Ref) => void;
  onSetParallel: (ids: string[]) => void;
};

/** The verse panel: one verse in full, or the passage of several picked verses with their notes. */
export function VersePanel({ verses, ...props }: PanelProps & { verses: number[] }) {
  const { book, chapter } = props.refSel;
  if (verses.length > 1) return <PassagePanel book={book} chapter={chapter} verses={verses} translations={props.translations} onClose={props.onClose} />;
  return <OneVerse {...props} refSel={{ book, chapter, verse: verses[0] ?? props.refSel.verse }} />;
}

/**
 * Several verses picked with ctrl and shift click (Romans 8:2-5, 9-11): the
 * passage as one reading, and notes that cover all of it.
 */
function PassagePanel({ book, chapter, verses, translations, onClose }: { book: string; chapter: number; verses: number[]; translations: Translation[]; onClose: () => void }) {
  const main = translations[0];
  const spans = useMemo(() => spansOf(book, chapter, verses), [book, chapter, verses]);
  const osisList = useMemo(() => verses.map((v) => `${book}.${chapter}.${v}`), [book, chapter, verses]);
  const title = spansLabel(spans, label);
  const ranges = spans.map((s) => ({ book, chapter, verse: +s.start.split(".")[2], verseEnd: s.end ? +s.end.split(".")[2] : undefined }));
  const { active, highlights, toggleHighlight } = useNotebooks();
  const lit = new Set(highlights.filter((h) => h.notebook === active).map((h) => h.ref));
  const allLit = !!active && osisList.every((o) => lit.has(o));
  const copy = () => {
    const text = ranges.map((r) => main.range(r).map((v) => v.text).join(" ")).join(" ... ");
    navigator.clipboard?.writeText(`${text} (${title}, ${main.meta.abbr})`);
    toast.success("Copied");
  };

  return (
    <aside className={PANEL}>
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border/60 px-4">
        <h2 className="min-w-0 truncate font-garamond text-xl" title={title}>{title}</h2>
        <span className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={allLit ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Highlight these verses"
              aria-pressed={allLit}
              disabled={!active}
              onClick={() => active && osisList.filter((o) => lit.has(o) === allLit).forEach((o) => toggleHighlight(active, o))}
            >
              <Icon name="format-highlight" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{active ? (allLit ? "Remove the highlights" : "Highlight these verses in this notebook") : "Open a notebook to highlight"}</TooltipContent>
        </Tooltip>
        {spans.length === 1 && <MemoryButton osis={spans[0].start} end={spans[0].end} />}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Copy passage" onClick={copy}>
              <Icon name="copy" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy with reference</TooltipContent>
        </Tooltip>
        <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
          <Icon name="close" />
        </Button>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-4">
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{main.meta.abbr} · {verses.length} verses</p>
            <div className="scripture mt-1 space-y-2 !text-base !leading-7">
              {ranges.map((r, i) => (
                <p key={r.verse}>
                  {i > 0 && <span className="mr-1 text-muted-foreground">…</span>}
                  {main.range(r).map((v) => (
                    <span key={v.verse}>
                      <sup className="vnum">{v.verse}</sup>
                      <VerseText raw={v.raw} />{" "}
                    </span>
                  ))}
                </p>
              ))}
            </div>
          </section>
          <Notes spans={spans} verses={osisList} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Ctrl-click a verse to add or drop it, shift-click to take every verse from the last one clicked. Click one verse alone for its cross references and words.
          </p>
        </div>
      </ScrollArea>
    </aside>
  );
}

/** Everything about one verse: other translations, cross references, topics, similar verses, your notes. */
function OneVerse({ refSel, translations, shelves, onClose, onNavigate }: PanelProps) {
  const osis = osisOf(refSel);
  const one = useMemo(() => [osis], [osis]);
  const [index] = useIndex();
  const vi = index?.of(osis);
  const main = translations[0];
  const v = main.verse(refSel);
  const { openWalk, openTopic } = useStudy();
  // Word study reads the first open translation that carries Strong's tags.
  const tagged = translations.find((t) => t.meta.strongs);
  const [study, setStudy] = useState<string | null>(null);
  useEffect(() => setStudy(null), [osis]);

  return (
    <aside className={PANEL}>
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border/60 px-4">
        <h2 className="font-garamond text-xl">{formatRef(refSel)}</h2>
        <span className="flex-1" />
        <HighlightButton osis={osis} />
        <MemoryButton osis={osis} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copy verse"
              onClick={() => {
                navigator.clipboard?.writeText(`${v?.text ?? ""} (${formatRef(refSel)}, ${main.meta.abbr})`);
                toast.success("Copied");
              }}
            >
              <Icon name="copy" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy with reference</TooltipContent>
        </Tooltip>
        <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
          <Icon name="close" />
        </Button>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-4">
          <section className="space-y-3">
            {translations.filter((t, i) => i === 0 || t.sourceOf(refSel.book) === t.meta).map((t) => {
              const tv = t.verse(refSel);
              return (
                <div key={t.meta.id}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t.sourceOf(refSel.book).abbr}</p>
                  <p className="scripture mt-1 !text-base !leading-7">{tv ? <VerseText raw={tv.raw} /> : <span className="text-muted-foreground">Not in this translation.</span>}</p>
                </div>
              );
            })}
            {v && <VerseReading reference={formatRef(refSel)} text={v.text} translation={main.meta.id} />}
            {main.sourceOf(refSel.book) === main.meta && <CompareAll refSel={refSel} base={main} />}
          </section>

          <SeenInArt refSel={refSel} />
          <PlacesAndPeople osis={osis} />
          <BeyondCanon refSel={refSel} main={main} onNavigate={onNavigate} />

          {tagged && <VerseWords osis={osis} t={tagged} onStudy={setStudy} />}
          {tagged && study && (
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="mb-2 flex justify-end">
                <Button variant="ghost" size="icon-xs" aria-label="Close word study" onClick={() => setStudy(null)}>
                  <Icon name="close" size="xs" />
                </Button>
              </div>
              <StrongsEntry code={study} t={tagged} onNavigate={onNavigate} onStudy={setStudy} />
            </div>
          )}

          <Notes spans={[{ start: osis }]} verses={one} />

          {vi !== undefined && index && (
            <>
              <CrossRefs vi={vi} index={index} main={main} onNavigate={onNavigate} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openWalk(refSel)}>
                  <Icon name="nodes" /> Study walk from here
                </Button>
              </div>
              <Topics vi={vi} onOpen={(t) => openTopic(t.name)} />
              <Similar vi={vi} index={index} main={main} shelves={shelves} onNavigate={onNavigate} />
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

/** Paintings and plates that show this verse, each opening in Look. */
const KIND = { quoted: ["Quotes", "Quoted in"], echoed: ["Echoes", "Echoed in"], retold: ["Retold in", "Retells"] } as const;

/**
 * Where this verse touches the Pseudepigrapha shelf (src/lib/companions.ts): the passage on the
 * other side, as printed, and a labelled study note on how they are related.
 * Shown whether or not the Pseudepigrapha shelf is on; its badge says which
 * side is off the canon.
 */
function BeyondCanon({ refSel, main, onNavigate }: { refSel: Ref; main: Translation; onNavigate: (r: Ref) => void }) {
  const links = companionLinks(refSel);
  if (!links.length) return null;
  return (
    <section className="space-y-3">
      <SectionLabel>Beyond the canon</SectionLabel>
      {links.map(({ link, other }) => {
        const beyond = bookOf(other.book)?.shelf === "pseudepigrapha";
        const text = main.range(other).map((v) => v.text).join(" ");
        return (
          <div key={formatRef(other)}>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {KIND[link.kind][beyond ? 0 : 1]}
              <button type="button" className="font-semibold text-brand hover:underline" onClick={() => onNavigate(other)}>{formatRef(other)}</button>
              {beyond && <Badge variant="outline">Pseudepigrapha</Badge>}
            </p>
            {text && <p className="mt-1 font-garamond text-[15px] leading-relaxed">{text}</p>}
            <p className="mt-1 text-xs italic text-muted-foreground">Study note: {link.note}</p>
          </div>
        );
      })}
    </section>
  );
}

function SeenInArt({ refSel }: { refSel: Ref }) {
  const paintings = usePaintings();
  const plates = usePlates();
  const openLook = useStudy((s) => s.openLook);
  const v = refSel.verse ?? 0;
  const shown = [
    ...paintings.filter((p) => depicts(p.ref, refSel.book, refSel.chapter, v)).map((p) => ({ kind: "painting" as const, id: p.id, title: p.title, by: paintingCredit(p), src: paintingUrl(p.thumb), colour: p.colour })),
    ...plates.filter((p) => depicts(p.ref, refSel.book, refSel.chapter, v)).map((p) => ({ kind: "plate" as const, id: p.id, title: p.title, by: plateCredit(p), src: plateUrl(p.thumb), colour: false })),
  ];
  if (!shown.length) return null;
  return (
    <section>
      <SectionLabel>Seen in art</SectionLabel>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {shown.map((a) => (
          <button key={a.id} type="button" className="group text-left" onClick={() => openLook({ kind: a.kind, id: a.id })}>
            <img src={a.src} alt="" loading="lazy" decoding="async" className={cn("aspect-[4/3] w-full rounded-sm object-cover", !a.colour && "engraving")} />
            <span className="mt-1 block font-garamond text-sm leading-tight group-hover:underline">{a.title}</span>
            <span className="text-[11px] text-muted-foreground">{a.by}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Learn this verse by heart (Daily, By heart); again stops. */
function MemoryButton({ osis, end }: { osis: string; end?: string }) {
  // `?? []`: a store loaded before notes version 2 (a dev window left open) has none.
  const memory = useNotebooks((s) => s.memory) ?? [];
  const toggleMemory = useNotebooks((s) => s.toggleMemory);
  const on = memory.some((c) => c.ref === osis && c.end === end);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={on ? "secondary" : "ghost"} size="icon-sm" aria-label="Learn by heart" aria-pressed={on} onClick={() => toggleMemory(osis, end)}>
          <Icon name="star" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{on ? "Learning by heart (Daily). Click to stop" : "Learn by heart"}</TooltipContent>
    </Tooltip>
  );
}

function HighlightButton({ osis }: { osis: string }) {
  const { active, highlights, toggleHighlight } = useNotebooks();
  const on = !!active && highlights.some((h) => h.notebook === active && h.ref === osis);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={on ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label="Highlight"
          disabled={!active}
          onClick={() => active && toggleHighlight(active, osis)}
        >
          <Icon name="format-highlight" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{active ? (on ? "Remove highlight" : "Highlight in this notebook") : "Open a notebook to highlight"}</TooltipContent>
    </Tooltip>
  );
}

function CompareAll({ refSel, base }: { refSel: Ref; base: Translation }) {
  const [all, setAll] = useState<Translation[] | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => setAll(null), [refSel.book, refSel.chapter, refSel.verse]);
  if (!all)
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          const metas = await listTranslations();
          setAll(await Promise.all(metas.map((m) => loadTranslation(m.id))));
          setLoading(false);
        }}
      >
        {loading ? <Spinner /> : <Icon name="git-compare" />} Compare every translation
      </Button>
    );
  const baseText = base.verse(refSel)?.text ?? "";
  return (
    <div className="space-y-3 rounded-lg bg-muted/40 p-3">
      <SectionLabel>Every translation, differences from the {base.meta.abbr} marked</SectionLabel>
      {all
        .filter((t) => t.meta.id !== base.meta.id)
        .map((t) => {
          const tv = t.verse(refSel);
          return (
            <div key={t.meta.id}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t.meta.abbr} · {t.meta.language}</p>
              <p className="mt-0.5 font-garamond text-[15px] leading-6">
                {tv
                  ? t.meta.language === base.meta.language
                    ? wordDiff(baseText, tv.text).map((d, i) => (
                        <span key={i} className={cn(d.kind === "add" && "rounded-sm bg-brand/12 text-foreground", d.kind === "del" && "hidden")}>{d.text}</span>
                      ))
                    : tv.text
                  : <span className="text-muted-foreground">{missing(t, refSel.book)}</span>}
              </p>
            </div>
          );
        })}
    </div>
  );
}

/** Why a translation has nothing for a verse: no such book, or a different numbering. */
function missing(t: Translation, book: string): string {
  if (t.hasBook(book)) return "Not in this translation (or numbered differently).";
  const nt = bookOf(book)?.testament === "NT";
  if (nt && !t.books().some((b) => bookOf(b)?.testament === "NT")) return `The ${t.meta.abbr} is the Old Testament only.`;
  return `This book is not in the ${t.meta.abbr}.`;
}

/** Notes on the open verse or passage: those touching any of its verses, and a new one on all of it. */
function Notes({ spans, verses }: { spans: Span[]; verses: string[] }) {
  const { active, notebooks, notes, addNote, updateNote, deleteNote, createNotebook } = useNotebooks();
  const study = useStudy();
  const [catalog] = useCatalog();
  // Content addresses: which exact edition of each translation a note was written against.
  const hashOf = (id?: string) => catalog?.find((m) => m.id === id)?.hash;
  const [draft, setDraft] = useState("");
  const mine = useMemo(() => notes.filter((n) => n.notebook === active && verses.some((o) => noteCovers(n, o))), [notes, active, verses]);
  const nb = notebooks.find((b) => b.id === active);
  const many = verses.length > 1;
  const add = (extra: { translation?: string; textHash?: string } = {}) => {
    if (!nb || !draft.trim()) return;
    addNote({ notebook: nb.id, ...spanFields(spans), body: draft.trim(), ...extra });
    setDraft("");
  };

  if (!nb)
    return (
      <section className="space-y-2">
        <SectionLabel>Notes</SectionLabel>
        <p className="text-xs text-muted-foreground">Notes live in a notebook, one per study.</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => createNotebook({ title: "My study", description: "", translations: [study.translation, ...study.parallel], shelves: study.shelves })}
        >
          <Icon name="add" /> Start a notebook
        </Button>
      </section>
    );

  return (
    <section className="space-y-2">
      <SectionLabel>Notes in {nb.title}</SectionLabel>
      {mine.map((n) => (
        <div key={n.id} className="group border-l-2 border-brand/40 bg-muted/30 py-1.5 pl-3 pr-2 transition-colors focus-within:border-brand focus-within:bg-muted/50">
          <NoteBody
            value={n.body}
            onChange={(body) => updateNote(n.id, { body })}
            className="p-1 font-garamond text-[15px] leading-relaxed"
            editClassName="min-h-16 resize-y rounded-none border-none bg-transparent p-1 font-garamond text-[15px] leading-relaxed shadow-none focus-visible:border-none focus-visible:ring-0"
          />
          <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
            {(many || n.end || n.more) && <span className="font-garamond text-xs text-brand">{spansLabel(noteSpans(n), label)}</span>}
            {n.translation && <Badge variant="outline">{n.translation.toUpperCase()} wording</Badge>}
            {n.textHash && hashOf(n.translation) && n.textHash !== hashOf(n.translation) && (
              <span title={`Written against edition ${n.textHash}; this one is ${hashOf(n.translation)}`}>the text has changed since</span>
            )}
            <span className="flex-1" />
            <button type="button" className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" onClick={() => deleteNote(n.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={many ? "Write a note on these verses. Markdown is fine." : "Write a note on this verse. Markdown is fine."}
        className="min-h-20 font-garamond text-[15px] focus-visible:border-foreground/30 focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
        }}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="brand" disabled={!draft.trim()} onClick={() => add()}>
          Add note
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!draft.trim()}
          onClick={() => add({ translation: study.translation, textHash: hashOf(study.translation) })}
        >
          About the {study.translation.toUpperCase()} wording
        </Button>
      </div>
    </section>
  );
}

function CrossRefs({ vi, index, main, onNavigate }: { vi: number; index: VerseIndex; main: Translation; onNavigate: (r: Ref) => void }) {
  const [g] = useGraph();
  const [all, setAll] = useState(false);
  const [byJev, setByJev] = useState(true);
  // Keyed by verse: for one render after moving to a new verse the old
  // verse's ordering is still in state, and its indices do not fit this list.
  const [jevFor, setJev] = useState<{ vi: number; r: XrefRanking<number> } | null>(null);
  const jev = jevFor?.vi === vi ? jevFor.r : null;
  const [asking, setAsking] = useState(false);
  const links = useMemo(() => (g ? g.out(vi) : []), [g, vi]);
  const top = links.slice(0, 12);
  const item = (l: (typeof links)[number]) => {
    const r = index.ref(l.to);
    const end = l.toEnd !== l.to ? index.ref(l.toEnd) : null;
    return { r, label: formatRef(end && end.chapter === r.chapter ? { ...r, verseEnd: end.verse } : r), text: main.verse(r)?.text ?? "" };
  };

  // Jev reads the top twelve against this verse as soon as the panel opens.
  useEffect(() => {
    setJev(null);
    if (!top.length) return;
    let live = true;
    const src = index.ref(vi);
    setAsking(true);
    rankXrefs(`${main.meta.id}:${vi}`, { ref: formatRef(src), text: main.verse(src)?.text ?? "" }, top.map((l) => ({ ref: item(l).label, text: item(l).text }))).then((r) => {
      if (!live) return;
      setAsking(false);
      setJev(r ? { vi, r } : null);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vi, links, main]);

  const ranked = jev && byJev;
  const levels = new Map(jev?.ranked.map((x) => [x.item, x.level]) ?? []);
  const order = ranked ? [...jev!.ranked.map((x) => top[x.item]).filter((l): l is (typeof links)[number] => !!l), ...links.slice(12)] : links;
  const shown = all ? order : order.slice(0, 8);
  const flip = useFlip(shown.map((l) => `${l.to}-${l.toEnd}`).join());
  if (!links.length) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <SectionLabel className="flex-1">Cross references · {links.length}</SectionLabel>
        {(jev || asking) && (
          <button
            type="button"
            disabled={!jev}
            onClick={() => setByJev(!byJev)}
            className="rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            title={byJev ? "Order by reader votes instead" : "Order by closeness to this verse"}
          >
            {asking ? "Ordering…" : byJev ? "Closest first" : "Most voted"}
          </button>
        )}
      </div>
      {shown.map((l) => {
        const { r, label, text } = item(l);
        const i = top.indexOf(l);
        const level = ranked && i >= 0 ? levels.get(i) : undefined;
        return (
          <button key={`${l.to}-${l.toEnd}`} ref={flip(`${l.to}-${l.toEnd}`)} type="button" onClick={() => onNavigate(r)} className="block w-full rounded-md p-1.5 text-left transition-colors hover:bg-foreground/5">
            <span className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand">{label}</span>
              {ranked && level !== undefined ? (
                <span className="flex gap-0.5" title={level === null ? "Unsure" : XREF_LEVELS[Math.round(level)]}>
                  {[1, 2, 3].map((k) => (
                    <span key={k} className={cn("size-1.5 rounded-full", level !== null && level >= k - 0.5 ? "bg-foreground/70" : "bg-foreground/15")} />
                  ))}
                </span>
              ) : (
                <span className="font-mono text-[10px] text-muted-foreground">{l.votes}</span>
              )}
            </span>
            {text && <span className="mt-0.5 line-clamp-2 block font-garamond text-sm text-foreground/85">{text}</span>}
          </button>
        );
      })}
      {links.length > 8 && (
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setAll(!all)}>
          {all ? "Fewer" : `All ${links.length}`}
        </Button>
      )}
      <p className="text-[10px] text-muted-foreground/70">
        References and votes from OpenBible.info readers (CC-BY).{ranked ? " The top twelve are ordered by how closely each speaks to this verse." : ""}
      </p>
    </section>
  );
}

function Topics({ vi, onOpen }: { vi: number; onOpen: (t: Topic) => void }) {
  const [topics, setTopics] = useState<{ topic: Topic; score: number }[] | null>(null);
  useEffect(() => {
    let live = true;
    topicsForVerse(vi).then((t) => live && setTopics(t), () => live && setTopics([]));
    return () => {
      live = false;
    };
  }, [vi]);
  if (!topics?.length) return null;
  return (
    <section className="space-y-2">
      <SectionLabel>Topics</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {topics.map(({ topic }) => (
          <button key={topic.name} type="button" onClick={() => onOpen(topic)} className="rounded-full bg-muted px-2.5 py-0.5 text-xs capitalize text-foreground/85 hover:bg-accent">
            {topic.name}
          </button>
        ))}
      </div>
    </section>
  );
}

function Similar({ vi, index, main, shelves, onNavigate }: { vi: number; index: VerseIndex; main: Translation; shelves: Shelf[]; onNavigate: (r: Ref) => void }) {
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setHits(null);
    setError(null);
  }, [vi]);
  return (
    <section className="space-y-2">
      <SectionLabel>Like this verse</SectionLabel>
      {!hits && !error && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => moreLikeThis(vi, new Set(shelves)).then(setHits, (e) => setError(String(e.message ?? e)))}
        >
          <Icon name="sparkle" /> Find verses that say something similar
        </Button>
      )}
      {error && <p className="text-xs text-muted-foreground">The semantic index is not built ({error}). Run <code className="font-mono">pnpm data:embed</code>.</p>}
      {hits?.map((h) => {
        const r = index.ref(h.verse);
        return (
          <button key={h.verse} type="button" onClick={() => onNavigate(r)} className="block w-full rounded-md p-1.5 text-left hover:bg-muted">
            <span className="text-xs font-semibold text-brand">{formatRef(r)}</span>
            <span className="mt-0.5 line-clamp-2 block font-garamond text-sm text-foreground/85">{main.verse(r)?.text}</span>
          </button>
        );
      })}
      {hits && <p className="text-[10px] text-muted-foreground/70">Found by meaning with a small embedding model, run on this computer. The verses are the text; the ranking is the machine's.</p>}
    </section>
  );
}

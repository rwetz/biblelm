import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Icon, ScrollArea, SectionLabel, Spinner, Textarea, toast, Tooltip, TooltipContent, TooltipTrigger, cn } from "@nexis/design";
import { listTranslations, loadTranslation, type Translation, type VerseIndex } from "@/lib/bible";
import { formatRef, osisOf, type Ref, type Shelf } from "@/lib/canon";
import { useCatalog, useGraph, useIndex } from "@/lib/hooks";
import { useFlip } from "@/lib/flip";
import { rankXrefs, XREF_LEVELS, type XrefRanking } from "@/lib/jev";
import { moreLikeThis, type Hit } from "@/lib/semantic";
import { topicsForVerse, type Topic } from "@/lib/topics";
import { noteCovers, useNotebooks } from "@/store/notebooks";
import { useStudy } from "@/store/study";
import { VerseText } from "./ReadView";
import { wordDiff } from "./diff";
import { StrongsEntry, VerseWords } from "./WordStudy";
import { VerseReading } from "@/features/search/JevReading";
import { usePaintings, usePlates } from "@/art/Art";
import { depicts, paintingCredit, paintingUrl, plateUrl } from "@/lib/art";
import { PlacesAndPeople } from "@/features/atlas/VerseAtlas";

/** Everything about one verse: other translations, cross references, topics, similar verses, your notes. */
export function VersePanel({
  refSel,
  translations,
  shelves,
  onClose,
  onNavigate,
}: {
  refSel: Ref;
  translations: Translation[];
  shelves: Shelf[];
  onClose: () => void;
  onNavigate: (r: Ref) => void;
  onSetParallel: (ids: string[]) => void;
}) {
  const osis = osisOf(refSel);
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
    <aside className="flex w-[25rem] shrink-0 flex-col border-l border-border/60 bg-card/60">
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
            {translations.map((t) => {
              const tv = t.verse(refSel);
              return (
                <div key={t.meta.id}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t.meta.abbr}</p>
                  <p className="scripture mt-1 !text-base !leading-7">{tv ? <VerseText raw={tv.raw} /> : <span className="text-muted-foreground">Not in this translation.</span>}</p>
                </div>
              );
            })}
            {v && <VerseReading reference={formatRef(refSel)} text={v.text} translation={main.meta.id} />}
            <CompareAll refSel={refSel} base={main} />
          </section>

          <SeenInArt refSel={refSel} />
          <PlacesAndPeople osis={osis} />

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

          <Notes osis={osis} />

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
function SeenInArt({ refSel }: { refSel: Ref }) {
  const paintings = usePaintings();
  const plates = usePlates();
  const openLook = useStudy((s) => s.openLook);
  const v = refSel.verse ?? 0;
  const shown = [
    ...paintings.filter((p) => depicts(p.ref, refSel.book, refSel.chapter, v)).map((p) => ({ kind: "painting" as const, id: p.id, title: p.title, by: paintingCredit(p), src: paintingUrl(p.thumb), colour: p.colour })),
    ...plates.filter((p) => depicts(p.ref, refSel.book, refSel.chapter, v)).map((p) => ({ kind: "plate" as const, id: p.id, title: p.title, by: "Doré, 1866", src: plateUrl(p.thumb), colour: false })),
  ];
  if (!shown.length) return null;
  return (
    <section>
      <SectionLabel>Seen in art</SectionLabel>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {shown.map((a) => (
          <button key={a.id} type="button" className="group text-left" onClick={() => openLook({ kind: a.kind, id: a.id })}>
            <img src={a.src} alt="" loading="lazy" className={cn("aspect-[4/3] w-full rounded-sm object-cover", !a.colour && "engraving")} />
            <span className="mt-1 block font-garamond text-sm leading-tight group-hover:underline">{a.title}</span>
            <span className="text-[11px] text-muted-foreground">{a.by}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Learn this verse by heart (Daily, By heart); again stops. */
function MemoryButton({ osis }: { osis: string }) {
  // `?? []`: a store loaded before notes version 2 (a dev window left open) has none.
  const memory = useNotebooks((s) => s.memory) ?? [];
  const toggleMemory = useNotebooks((s) => s.toggleMemory);
  const on = memory.some((c) => c.ref === osis && !c.end);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={on ? "secondary" : "ghost"} size="icon-sm" aria-label="Learn by heart" aria-pressed={on} onClick={() => toggleMemory(osis)}>
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
                  : <span className="text-muted-foreground">Not in this translation (or numbered differently).</span>}
              </p>
            </div>
          );
        })}
    </div>
  );
}

function Notes({ osis }: { osis: string }) {
  const { active, notebooks, notes, addNote, updateNote, deleteNote, createNotebook } = useNotebooks();
  const study = useStudy();
  const [catalog] = useCatalog();
  // Content addresses: which exact edition of each translation a note was written against.
  const hashOf = (id?: string) => catalog?.find((m) => m.id === id)?.hash;
  const [draft, setDraft] = useState("");
  const mine = useMemo(() => notes.filter((n) => n.notebook === active && noteCovers(n, osis)), [notes, active, osis]);
  const nb = notebooks.find((b) => b.id === active);

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
          <Textarea
            value={n.body}
            onChange={(e) => updateNote(n.id, { body: e.target.value })}
            className="min-h-16 resize-y rounded-none border-none bg-transparent p-1 font-garamond text-[15px] leading-relaxed shadow-none focus-visible:border-none focus-visible:ring-0"
          />
          <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
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
        placeholder="Write a note on this verse. Markdown is fine."
        className="min-h-20 font-garamond text-[15px] focus-visible:border-foreground/30 focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim()) {
            addNote({ notebook: nb.id, start: osis, body: draft.trim() });
            setDraft("");
          }
        }}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="brand" disabled={!draft.trim()} onClick={() => { addNote({ notebook: nb.id, start: osis, body: draft.trim() }); setDraft(""); }}>
          Add note
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!draft.trim()}
          onClick={() => { addNote({ notebook: nb.id, start: osis, body: draft.trim(), translation: study.translation, textHash: hashOf(study.translation) }); setDraft(""); }}
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
  const [jev, setJev] = useState<XrefRanking<number> | null>(null);
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
      setJev(r);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vi, links, main]);

  const ranked = jev && byJev;
  const levels = new Map(jev?.ranked.map((x) => [x.item, x.level]) ?? []);
  const order = ranked ? [...jev!.ranked.map((x) => top[x.item]), ...links.slice(12)] : links;
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

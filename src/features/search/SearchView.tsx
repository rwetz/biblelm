import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Icon, Input, ResultArrival, SectionLabel, Spinner, Stat, cn } from "@nexis/design";
import { CornerPlate, usePagePlate } from "@/art/Art";
import { PAGE_PLATES } from "@/lib/art";
import type { Translation, Verse, VerseIndex } from "@/lib/bible";
import { bookName, formatRef, type Ref } from "@/lib/canon";
import { useIndex, useTopics, useTranslation } from "@/lib/hooks";
import { search, type SearchResult } from "@/lib/search";
import { semanticSearch, type Hit } from "@/lib/semantic";
import { findTopics } from "@/lib/topics";
import { jevAvailable, rerank, routeQuery } from "@/lib/jev";
import { useStudy, shelfSet } from "@/store/study";
import { DataMissing, VerseText } from "@/features/read/ReadView";
import { StrongsEntry } from "@/features/read/WordStudy";
import { parseCode } from "@/lib/strongs";
import { loadTranslation, type Translation as T2 } from "@/lib/bible";

const EXAMPLES = [
  "John 3:16",
  "Psalm 23",
  "fear not",
  "verses about forgiveness",
  "how many times does grace appear",
  "shortest verse",
  "angels",
  "when I feel anxious",
  "G26",
];

export function SearchView() {
  const { translation, shelves, query, searchFor, read } = useStudy();
  const [t, error] = useTranslation(translation);
  const [index] = useIndex();
  const [topics] = useTopics();
  const [q, setQ] = useState(query);
  const [submitted, setSubmitted] = useState(query);
  const input = useRef<HTMLInputElement>(null);
  const plate = usePagePlate(PAGE_PLATES.search);

  useEffect(() => {
    const focus = () => input.current?.focus();
    window.addEventListener("biblelm:focus-search", focus);
    focus();
    return () => window.removeEventListener("biblelm:focus-search", focus);
  }, []);
  useEffect(() => {
    setQ(query);
    setSubmitted(query);
  }, [query]);

  const shelfs = useMemo(() => shelfSet(shelves), [shelves]);
  const exact = useMemo<SearchResult | null>(() => (t && submitted ? search(t, submitted, shelfs) : null), [t, submitted, shelfs]);
  const topicHits = useMemo(() => (topics && submitted ? findTopics(topics, submitted.replace(/^(verses?|find|search)\s+(about|on|for)?\s*/i, ""), 8) : []), [topics, submitted]);
  const wantsMeaning = exact?.kind === "search" || exact?.kind === "no_results";

  if (error) return <DataMissing message={error} />;

  const submit = (text: string) => {
    setQ(text);
    setSubmitted(text);
    searchFor(text);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <CornerPlate plate={plate} corner="br" />
      <div className="relative mx-auto w-full max-w-3xl px-8 pb-24 pt-12">
        <h1 className="font-blackletter text-4xl">Search the Scriptures</h1>
        <p className="mt-1 text-sm text-muted-foreground">A reference, a word, a question, or what you are looking for in your own words.</p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(q.trim());
          }}
        >
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="John 3:16, fear not, verses about patience…" className="h-11 pl-9 text-base" />
          </div>
          <Button type="submit" variant="brand" className="h-11" disabled={!q.trim()}>
            Search
          </Button>
        </form>
        {!submitted && (
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => submit(ex)} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {ex}
              </button>
            ))}
          </div>
        )}

        {t && index && parseCode(submitted) && <StrongsSearch code={parseCode(submitted)!} t={t} onOpen={(r) => read(r, { select: true })} />}

        {t && exact && index && !parseCode(submitted) && (
          <ResultArrival replayKey={submitted} className="mt-8 space-y-8">
            <Exact r={exact} t={t} onOpen={(r) => read(r, { select: true })} />
            {topicHits.length > 0 && (
              <section>
                <SectionLabel>Topics</SectionLabel>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {topicHits.map((tp) => (
                    <button key={tp.name} type="button" onClick={() => useStudy.getState().openTopic(tp.name)} className="rounded-full bg-muted px-3 py-1 text-xs capitalize hover:bg-accent">
                      {tp.name} <span className="text-muted-foreground">· {tp.p.length / 3}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {wantsMeaning && <Meaning query={submitted} t={t} index={index} onOpen={(r) => read(r, { select: true })} />}
          </ResultArrival>
        )}
      </div>
    </div>
  );
}

function VerseRow({ v, onOpen, label }: { v: Verse; onOpen: (r: Ref) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onOpen(v)} className="block w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60">
      <span className="text-xs font-semibold text-brand">{label ?? formatRef(v)}</span>
      <span className="scripture mt-0.5 block !text-[17px] !leading-7"><VerseText raw={v.raw} /></span>
    </button>
  );
}

function Exact({ r, t, onOpen }: { r: SearchResult; t: Translation; onOpen: (r: Ref) => void }) {
  switch (r.kind) {
    case "passage":
      return (
        <section className="rounded-xl bg-card p-6 ring-1 ring-foreground/6">
          <h2 className="font-gothic text-2xl">{formatRef(r.ref)}</h2>
          <div className="scripture mt-3">
            {r.verses.map((v) => (
              <span key={v.verse}>
                <sup className="vnum">{v.verse}</sup>
                <VerseText raw={v.raw} />{" "}
              </span>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="-ml-2 mt-3" onClick={() => onOpen({ ...r.ref, verse: r.ref.verse || 1 })}>
            Read in context <Icon name="arrow-right" />
          </Button>
        </section>
      );
    case "superlative":
      return (
        <section>
          <SectionLabel>{r.label}</SectionLabel>
          <VerseRow v={r.verse} onOpen={onOpen} />
        </section>
      );
    case "search":
      return (
        <section>
          <SectionLabel>
            {r.count.toLocaleString()} {r.count === 1 ? "verse contains" : "verses contain"} “{r.word}” in the {t.meta.abbr}
          </SectionLabel>
          <div className="mt-2">
            {r.results.slice(0, 50).map((v) => (
              <VerseRow key={`${v.book}${v.chapter}.${v.verse}`} v={v} onOpen={onOpen} />
            ))}
            {r.count > 50 && <p className="px-3 text-xs text-muted-foreground">Showing the first 50.</p>}
          </div>
          {r.other.length > 0 && (
            <details className="mt-4 rounded-lg bg-muted/40 p-3">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Also found in books on shelves you have hidden ({r.other.length}{r.other.length === 20 ? "+" : ""})
              </summary>
              <div className="mt-2">
                {r.other.map((v) => (
                  <div key={`${v.book}${v.chapter}.${v.verse}`} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-2.5 shrink-0">{bookName(v.book)}</Badge>
                    <VerseRow v={v} onOpen={onOpen} />
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      );
    case "count_verses":
      return (
        <section className="space-y-3">
          <Stat label={`verses contain “${r.word}”`} value={r.count.toLocaleString()} />
          {r.sample.map((v) => <VerseRow key={`${v.book}${v.chapter}.${v.verse}`} v={v} onOpen={onOpen} />)}
        </section>
      );
    case "word_frequency":
      return <Stat label={`times “${r.word}” appears in the ${t.meta.abbr}`} value={r.count.toLocaleString()} />;
    case "book_verse_count":
      return <Stat label={`verses in ${bookName(r.book)}`} value={r.count.toLocaleString()} />;
    case "book_chapter_count":
      return <Stat label={`chapters in ${bookName(r.book)}`} value={r.count.toLocaleString()} />;
    case "total_verses":
      return <Stat label="verses on your shelves" value={r.count.toLocaleString()} />;
    case "total_chapters":
      return <Stat label="chapters on your shelves" value={r.count.toLocaleString()} />;
    case "total_words":
      return <Stat label={`words in the ${t.meta.abbr}`} value={r.count.toLocaleString()} />;
    case "total_books":
      return (
        <section className="space-y-3">
          <Stat label="books on your shelves" value={r.count} />
          <p className="font-garamond text-sm leading-6 text-muted-foreground">{r.books.map(bookName).join(" · ")}</p>
        </section>
      );
    case "not_found":
    case "no_results":
      return <p className="text-sm text-muted-foreground">{r.message}</p>;
  }
}

function Meaning({ query, t, index, onOpen }: { query: string; t: Translation; index: VerseIndex; onOpen: (r: Ref) => void }) {
  const shelves = useStudy((s) => s.shelves);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<string | null>(null);
  const [jev, setJev] = useState(false);
  const [levels, setLevels] = useState<Map<number, number | null> | null>(null);
  const [ranking, setRanking] = useState(false);
  useEffect(() => {
    jevAvailable().then(setJev);
  }, []);
  useEffect(() => {
    let live = true;
    setHits(null);
    setError(null);
    setLevels(null);
    semanticSearch(query, new Set(shelves), 24).then((h) => live && setHits(h), (e) => live && setError(String(e.message ?? e)));
    routeQuery(query).then((r) => live && setRoute(r));
    return () => {
      live = false;
    };
  }, [query, shelves]);
  return (
    <section>
      <div className="flex items-center gap-2">
        <SectionLabel className="flex-1">By meaning{route ? ` · ${route}` : ""}</SectionLabel>
        {jev && hits && !levels && (
          <Button
            variant="ghost"
            size="sm"
            disabled={ranking}
            onClick={async () => {
              setRanking(true);
              const r = await rerank(query, hits.slice(0, 20), (h) => {
                const ref = index.ref(h.verse);
                return { ref: formatRef(ref), text: t.verse(ref)?.text ?? "" };
              });
              setRanking(false);
              if (!r) return;
              setLevels(new Map(r.map((x) => [x.item.verse, x.level])));
              setHits([...r.map((x) => x.item), ...hits.slice(20)]);
            }}
          >
            {ranking ? <Spinner /> : <Icon name="filter" />} Rank with Jev
          </Button>
        )}
      </div>
      {!hits && !error && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner /> Loading the embedding model (first search only)
        </div>
      )}
      {error && <p className="mt-2 text-xs text-muted-foreground">The semantic index is not built yet ({error}). Run <code className="font-mono">pnpm data:embed</code>.</p>}
      <div className="mt-2">
        {hits?.map((h) => {
          const r = index.ref(h.verse);
          const v = t.verse(r);
          const level = levels?.get(h.verse);
          return v ? (
            <div key={h.verse} className="flex items-start gap-1">
              {levels && <span className="mt-2.5 w-6 shrink-0 text-center font-mono text-[10px] text-muted-foreground" title="Jev relevance, 0 to 3">{level ?? "?"}</span>}
              <VerseRow v={v} onOpen={onOpen} />
            </div>
          ) : null;
        })}
      </div>
      {hits && (
        <p className={cn("mt-2 px-3 text-[11px] text-muted-foreground/70")}>
          Ranked by a small embedding model on this computer, which matches meaning rather than words. It can be wrong; the verses are the text.
        </p>
      )}
    </section>
  );
}

/** A Strong's number typed into search: the entry and its concordance. */
function StrongsSearch({ code, t, onOpen }: { code: string; t: T2; onOpen: (r: Ref) => void }) {
  // The reading translation if it is tagged, else the KJV.
  const [tagged, setTagged] = useState<T2 | null>(t.meta.strongs ? t : null);
  const [c, setC] = useState(code);
  useEffect(() => setC(code), [code]);
  useEffect(() => {
    if (t.meta.strongs) setTagged(t);
    else loadTranslation("kjv").then(setTagged, () => setTagged(null));
  }, [t]);
  if (!tagged) return <div className="mt-8"><Spinner /></div>;
  return (
    <section className="mt-8 rounded-xl bg-card p-6 ring-1 ring-foreground/6">
      <StrongsEntry code={c} t={tagged} onNavigate={onOpen} onStudy={setC} />
    </section>
  );
}

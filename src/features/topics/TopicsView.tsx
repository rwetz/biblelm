import { useEffect, useMemo, useState } from "react";
import { Button, Icon, Input, SectionLabel, Segmented, Spinner, VirtualList, cn } from "@nexis/design";
import { CornerPlate, usePagePlate } from "@/art/Art";
import { PAGE_PLATES } from "@/lib/art";
import type { Translation, VerseIndex } from "@/lib/bible";
import { formatRef, parseRef, type Ref } from "@/lib/canon";
import { useGraph, useIndex, useTopics, useTranslation } from "@/lib/hooks";
import { passages, type Topic } from "@/lib/topics";
import { connect, studyWalk } from "@/lib/xrefs";
import { useStudy } from "@/store/study";
import { DataMissing } from "@/features/read/ReadView";
import { ScriptureMap } from "./ScriptureMap";
import { Structure } from "./Structure";

type Tab = "topics" | "walk" | "map" | "structure";

export function TopicsView() {
  const { topic, walk, translation } = useStudy();
  const [tab, setTab] = useState<Tab>(walk ? "walk" : "topics");
  const [t, error] = useTranslation(translation);
  const [index] = useIndex();
  const plate = usePagePlate(PAGE_PLATES.topics);
  useEffect(() => {
    if (walk) setTab("walk");
    else if (topic) setTab("topics");
  }, [walk, topic]);

  if (error) return <DataMissing message={error} />;
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {tab !== "map" && <CornerPlate plate={plate} corner="br" />}
      <div className="flex items-end gap-4 border-b border-border/60 px-8 pb-3 pt-8">
        <div>
          <h1 className="font-blackletter text-4xl">Topics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Themes across Scripture, the paths cross references draw, and the shape of a passage.</p>
        </div>
        <span className="flex-1" />
        <Segmented
          label="View"
          value={tab}
          onChange={setTab}
          segments={[
            { id: "topics", label: "Index", icon: "list-bullet" },
            { id: "walk", label: "Walk", icon: "nodes" },
            { id: "map", label: "Map", icon: "map" },
            { id: "structure", label: "Structure", icon: "grid" },
          ]}
        />
      </div>
      {!t || !index ? (
        <div className="grid flex-1 place-items-center"><Spinner /></div>
      ) : tab === "topics" ? (
        <TopicIndex t={t} index={index} />
      ) : tab === "walk" ? (
        <Walk t={t} index={index} />
      ) : tab === "map" ? (
        <ScriptureMap t={t} index={index} />
      ) : (
        <Structure t={t} index={index} />
      )}
    </div>
  );
}

function PassageRow({ t, index, start, end, extra }: { t: Translation; index: VerseIndex; start: number; end: number; extra?: React.ReactNode }) {
  const read = useStudy((s) => s.read);
  const a = index.ref(start);
  const z = index.ref(end);
  const ref: Ref = z.chapter === a.chapter && z.book === a.book && z.verse > a.verse ? { ...a, verseEnd: z.verse } : a;
  const text = t.range(ref).map((v) => v.text).join(" ");
  return (
    <button type="button" onClick={() => read(a, { select: true })} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted/60">
      <span className="text-xs font-semibold text-brand">{formatRef(ref)}</span>
      {extra}
      <span className="mt-0.5 line-clamp-3 block font-garamond text-[16px] leading-7 text-foreground/90">{text || <span className="text-muted-foreground">Not in the {t.meta.abbr}.</span>}</span>
    </button>
  );
}

function TopicIndex({ t, index }: { t: Translation; index: VerseIndex }) {
  const [topics] = useTopics();
  const selectedName = useStudy((s) => s.topic);
  const [filter, setFilter] = useState("");
  const [sel, setSel] = useState<string | null>(selectedName);
  useEffect(() => setSel(selectedName), [selectedName]);
  const list = useMemo(() => {
    if (!topics) return [];
    const f = filter.trim().toLowerCase();
    const l = f ? topics.filter((x) => x.name.includes(f)) : [...topics].sort((a, b) => b.p.length - a.p.length);
    return l;
  }, [topics, filter]);
  const current = topics?.find((x) => x.name === sel) ?? null;
  if (!topics) return <div className="grid flex-1 place-items-center"><Spinner /></div>;
  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-72 shrink-0 flex-col border-r border-border/60">
        <div className="p-3">
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Filter ${topics.length.toLocaleString()} topics`} />
        </div>
        <VirtualList
          label="Topics"
          count={list.length}
          rowHeight={30}
          className="min-h-0 flex-1"
          renderRow={(i) => {
            const x = list[i];
            return (
              <button
                type="button"
                onClick={() => setSel(x.name)}
                className={cn("flex h-[30px] w-full items-center gap-2 px-4 text-left text-sm capitalize hover:bg-muted", sel === x.name && "bg-accent text-foreground")}
              >
                <span className="flex-1 truncate">{x.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{x.p.length / 3}</span>
              </button>
            );
          }}
        />
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
        {current ? <TopicDetail topic={current} t={t} index={index} /> : <p className="text-sm text-muted-foreground">Choose a topic. The list is OpenBible.info's topical Bible (CC-BY), ranked by reader votes.</p>}
      </div>
    </div>
  );
}

function TopicDetail({ topic, t, index }: { topic: Topic; t: Translation; index: VerseIndex }) {
  const ps = useMemo(() => passages(topic), [topic]);
  const [n, setN] = useState(25);
  return (
    <div className="max-w-3xl">
      <h2 className="font-gothic text-3xl capitalize">{topic.name}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{ps.length} passages, most endorsed first</p>
      <div className="mt-4">
        {ps.slice(0, n).map((p) => (
          <PassageRow key={`${p.start}-${p.end}`} t={t} index={index} start={p.start} end={p.end} />
        ))}
      </div>
      {ps.length > n && (
        <Button variant="ghost" size="sm" onClick={() => setN(n + 50)}>
          More
        </Button>
      )}
    </div>
  );
}

function Walk({ t, index }: { t: Translation; index: VerseIndex }) {
  const seed = useStudy((s) => s.walk);
  const [g] = useGraph();
  const [from, setFrom] = useState(seed ? formatRef(seed) : "John 3:16");
  const [to, setTo] = useState("Genesis 22:8");
  const [walkFrom, setWalkFrom] = useState<number | null>(null);
  const [chain, setChain] = useState<number[] | null | undefined>(undefined);

  useEffect(() => {
    if (seed) {
      setFrom(formatRef(seed));
      setWalkFrom(index.of(`${seed.book}.${seed.chapter}.${seed.verse || 1}`) ?? null);
    }
  }, [seed, index]);

  const resolve = (s: string) => {
    const r = parseRef(s);
    return r ? index.of(`${r.book}.${r.chapter}.${r.verse || 1}`) : undefined;
  };
  const results = useMemo(() => (g && walkFrom !== null ? studyWalk(g, [walkFrom]) : null), [g, walkFrom]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
      <div className="grid max-w-5xl gap-10 lg:grid-cols-2">
        <section>
          <SectionLabel>Study walk</SectionLabel>
          <p className="mt-2 text-sm text-muted-foreground">
            Start at a verse and follow where Scripture keeps pointing. A random walk over 341,000 cross references that keeps returning to your verse
            (personalised PageRank) ranks the passages most bound up with it.
          </p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const i = resolve(from); setWalkFrom(i ?? null); }}>
            <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="A verse, e.g. Isaiah 53:5" />
            <Button type="submit" variant="brand" disabled={!g}>{g ? "Walk" : <Spinner />}</Button>
          </form>
          <div className="mt-4">
            {results?.map((r, i) => (
              <PassageRow key={r.verse} t={t} index={index} start={r.verse} end={r.verse} extra={<span className="ml-2 font-mono text-[10px] text-muted-foreground">#{i + 1}</span>} />
            ))}
            {walkFrom === null && results === null && from && <p className="text-xs text-muted-foreground">Type a verse reference to begin.</p>}
          </div>
        </section>
        <section>
          <SectionLabel>Connect two passages</SectionLabel>
          <p className="mt-2 text-sm text-muted-foreground">
            The strongest chain of cross references from one passage to another (shortest path, where well-attested links cost less). A way to see typology:
            how the Old Testament points to the New.
          </p>
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const a = resolve(from), b = resolve(to);
              setChain(g && a !== undefined && b !== undefined ? connect(g, a, b) : null);
            }}
          >
            <div className="flex items-center gap-2">
              <Input value={from} onChange={(e) => setFrom(e.target.value)} />
              <Icon name="arrow-right" className="shrink-0 text-muted-foreground" />
              <Input value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button type="submit" variant="outline" disabled={!g}>Connect</Button>
          </form>
          <div className="mt-4">
            {chain === null && <p className="text-sm text-muted-foreground">No chain of cross references links these two (links run one way, as readers entered them).</p>}
            {chain && (
              <ol className="relative space-y-1 border-l border-border pl-4">
                {chain.map((v, i) => (
                  <li key={v} className="relative">
                    <span className="absolute -left-[21px] top-3 size-2.5 rounded-full bg-brand" />
                    <PassageRow t={t} index={index} start={v} end={v} extra={<span className="ml-2 font-mono text-[10px] text-muted-foreground">step {i}</span>} />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

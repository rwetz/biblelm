import { useEffect, useMemo, useState } from "react";
import { Button, Icon, Input, SectionLabel,Spinner, VirtualList, cn } from "@nexis/design";
import { CornerPlate, DitherHero, usePagePlate, usePaintings } from "@/art/Art";
import { PAGE_PAINTINGS, PAGE_PLATES } from "@/lib/art";
import type { Translation, VerseIndex } from "@/lib/bible";
import { formatRef, parseRef, type Ref } from "@/lib/canon";
import { useGraph, useIndex, useTopics, useTranslation } from "@/lib/hooks";
import { loadTopicKinds, passages, topicPlaces, type Topic, type TopicKinds, type TopicPlace } from "@/lib/topics";
import { genreOf } from "@/lib/jev";
import { connect, studyWalk } from "@/lib/xrefs";
import { shelfSet, useStudy } from "@/store/study";
import { between } from "@/lib/semantic";
import { DataMissing } from "@/features/read/ReadView";
import { ScriptureMap } from "./ScriptureMap";
import { Structure } from "./Structure";
import { Words } from "./Words";
import { Links } from "./Links";
import { Echoes } from "./Echoes";
import { Studies } from "./Studies";
import { SearchField } from "@/app/controls";
import { PageMark } from "@/art/SidebarArt";
import { Sections } from "@/app/Sections";

type Tab = "topics" | "studies" | "walk" | "map" | "structure" | "words" | "links" | "echoes";

export function TopicsView() {
  const { topic, walk, studies, translation } = useStudy();
  const [tab, setTab] = useState<Tab>(walk ? "walk" : studies !== null ? "studies" : "topics");
  const [t, error] = useTranslation(translation);
  const [index] = useIndex();
  const plate = usePagePlate(PAGE_PLATES.topics);
  // The Seven Works of Mercy: Matthew 25 acted out in a Naples street.
  const mercy = usePaintings().find((p) => p.id === PAGE_PAINTINGS.topics);
  useEffect(() => {
    if (walk) setTab("walk");
    else if (studies !== null) setTab("studies");
    else if (topic) setTab("topics");
  }, [walk, topic, studies]);

  if (error) return <DataMissing message={error} />;
  return (
    <div className="relative isolate flex min-h-0 flex-1 flex-col">
      {/* The plate keeps the empty index company; once a topic opens, its verses run where the plate would be. */}
      {tab === "topics" && !topic && <CornerPlate plate={plate} corner="br" />}
      <DitherHero hero={mercy} height="8.5rem" clearLeft fadeFrom={30} caption={false}>
      <div className="mx-auto flex h-full w-full max-w-6xl items-end gap-4 px-8 pb-3 pt-8">
        <div>
          <h1 className="flex items-center gap-3 font-blackletter text-4xl"><PageMark page="topics" />Topics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Themes across Scripture, the paths cross references draw, and the shape of a passage.</p>
        </div>
      </div>
      </DitherHero>
      <div className="relative z-10 border-b border-border/60">
        <div className="mx-auto w-full max-w-6xl px-8 py-2">
          <Sections
            label="Topics"
            value={tab}
            onChange={setTab}
            sections={[
              { id: "topics", name: "Index", gist: "6,712 themes", mark: "ihs" },
              { id: "studies", name: "Studies", gist: "for young men", mark: "cross" },
              { id: "walk", name: "Walk", gist: "where verses lead", mark: "compass" },
              { id: "map", name: "Map", gist: "Scripture by meaning", mark: "sun" },
              { id: "structure", name: "Structure", gist: "a passage's shape", mark: "urn" },
              { id: "words", name: "Words", gist: "a book's own words", mark: "quill" },
              { id: "links", name: "Links", gist: "chapters bound together", mark: "wheels" },
              { id: "echoes", name: "Echoes", gist: "the Old in the New", mark: "eagle" },
            ]}
          />
        </div>
      </div>
      {!t || !index ? (
        <div className="grid flex-1 place-items-center"><Spinner /></div>
      ) : tab === "topics" ? (
        <TopicIndex t={t} index={index} />
      ) : tab === "studies" ? (
        <Studies t={t} index={index} />
      ) : tab === "walk" ? (
        <Walk t={t} index={index} />
      ) : tab === "map" ? (
        <ScriptureMap t={t} index={index} />
      ) : tab === "words" ? (
        <Words t={t} />
      ) : tab === "links" ? (
        <Links t={t} index={index} />
      ) : tab === "echoes" ? (
        <Echoes t={t} index={index} />
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

const KIND_LABELS: Record<string, string> = {
  person: "People",
  place: "Places",
  god: "God and Christ",
  virtue: "Virtues",
  sin: "Sins",
  practice: "Practices",
  life: "Everyday life",
  feeling: "Feelings",
  event: "Events",
  thing: "Things",
  modern: "Today",
};
const WHERE: [string, string][] = [
  ["", "Anywhere"],
  ["ot", "Old Testament"],
  ["nt", "New Testament"],
  ["Law", "Law"],
  ["History", "History"],
  ["Wisdom and poetry", "Wisdom and poetry"],
  ["Prophets", "Prophets"],
  ["Gospels", "Gospels"],
  ["Epistles", "Epistles"],
];
type Size = "any" | "broad" | "focused";
type Sort = "passages" | "az";

/** A to Z with names that start with a letter first, so the index opens on "Abba", not "10 Commandments" and "2012". */
const lettersFirst = (a: Topic, b: Topic) => Number(!/^[a-z]/i.test(a.name)) - Number(!/^[a-z]/i.test(b.name)) || a.name.localeCompare(b.name);

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs transition-colors",
        on ? "bg-foreground text-background" : "bg-muted/70 text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function TopicIndex({ t, index }: { t: Translation; index: VerseIndex }) {
  const [topics] = useTopics();
  const selectedName = useStudy((s) => s.topic);
  const openTopic = useStudy((s) => s.openTopic);
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  const [where, setWhere] = useState("");
  const [size, setSize] = useState<Size>("any");
  const [sort, setSort] = useState<Sort>("az");
  const [more, setMore] = useState(false);
  const [kinds, setKinds] = useState<TopicKinds | null>(null);
  const [sel, setSel] = useState<string | null>(selectedName);
  useEffect(() => setSel(selectedName), [selectedName]);
  useEffect(() => {
    loadTopicKinds().then(setKinds);
  }, []);
  const places = useMemo(() => (topics ? topicPlaces(topics, index.refs, genreOf) : null), [topics, index]);

  // Each kind's count under the other filters, so a chip says what it holds.
  const { list, perKind } = useMemo(() => {
    const perKind = new Map<string, number>();
    const list: Topic[] = [];
    if (!topics || !places) return { list, perKind };
    const f = filter.trim().toLowerCase();
    for (const x of topics) {
      if (f && !x.name.includes(f)) continue;
      const n = x.p.length / 3;
      if (size === "broad" && n < 40) continue;
      if (size === "focused" && n > 12) continue;
      if (where) {
        const pl = places.get(x.name);
        if (!pl) continue;
        if (where === "ot" || where === "nt" ? pl.testament !== where : pl.genre !== where || pl.share < 0.4) continue;
      }
      const k = kinds?.tags[x.name]?.[0];
      if (k) perKind.set(k, (perKind.get(k) ?? 0) + 1);
      if (kind && k !== kind) continue;
      list.push(x);
    }
    // Names that start with what was typed come first, then the chosen order.
    const lead = (x: Topic) => (f && x.name.startsWith(f) ? 1 : 0);
    list.sort((a, b) => lead(b) - lead(a) || (sort === "az" ? lettersFirst(a, b) : b.p.length - a.p.length));
    return { list, perKind };
  }, [topics, places, kinds, filter, kind, where, size, sort]);

  const current = topics?.find((x) => x.name === sel) ?? null;
  const extra = Number(!!where) + Number(size !== "any") + Number(sort !== "az");
  const clear = () => {
    setFilter("");
    setKind(null);
    setWhere("");
    setSize("any");
    setSort("az");
  };
  if (!topics) return <div className="grid flex-1 place-items-center"><Spinner /></div>;
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1">
      <div className="flex w-80 shrink-0 flex-col border-r border-border/60">
        <div className="space-y-3 p-3">
          <SearchField value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Search ${topics.length.toLocaleString()} topics`} />
          {kinds && (
            <div className="flex flex-wrap gap-1.5">
              {kinds.kinds.map((k) => (
                <Chip key={k} on={kind === k} onClick={() => setKind(kind === k ? null : k)}>
                  {KIND_LABELS[k] ?? k} <span className="opacity-60">{(perKind.get(k) ?? 0).toLocaleString()}</span>
                </Chip>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setMore(!more)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Icon name={more ? "chevron-down" : "chevron-right"} size="xs" />
            More filters{extra ? ` · ${extra} on` : ""}
          </button>
          {more && (
            <div className="space-y-3 rounded-lg bg-muted/30 p-2.5">
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Mostly found in</p>
                <div className="flex flex-wrap gap-1.5">
                  {WHERE.map(([id, label]) => (
                    <Chip key={id} on={where === id} onClick={() => setWhere(id)}>
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Size</p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip on={size === "any"} onClick={() => setSize("any")}>Any</Chip>
                  <Chip on={size === "broad"} onClick={() => setSize("broad")}>Broad, 40+ passages</Chip>
                  <Chip on={size === "focused"} onClick={() => setSize("focused")}>Focused, up to 12</Chip>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Order</p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip on={sort === "az"} onClick={() => setSort("az")}>A to Z</Chip>
                  <Chip on={sort === "passages"} onClick={() => setSort("passages")}>Most passages</Chip>
                </div>
              </div>
            </div>
          )}
          <p className="flex items-center text-[11px] text-muted-foreground">
            <span className="flex-1">
              {list.length.toLocaleString()} {list.length === 1 ? "topic" : "topics"}
            </span>
            {(kind || extra > 0 || filter) && (
              <button type="button" className="hover:text-foreground" onClick={clear}>
                Clear
              </button>
            )}
          </p>
        </div>
        <VirtualList
          label="Topics"
          count={list.length}
          rowHeight={30}
          className="min-h-0 flex-1 border-t border-border/40"
          renderRow={(i) => {
            const x = list[i];
            return (
              <button
                type="button"
                onClick={() => openTopic(x.name)}
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
        {current ? (
          <TopicDetail topic={current} t={t} index={index} kind={kinds?.tags[current.name]?.[0]} place={places?.get(current.name)} />
        ) : (
          <p className="text-sm text-muted-foreground">Choose a topic. The list is OpenBible.info's topical Bible (CC-BY), with its passages ranked by reader votes.</p>
        )}
      </div>
    </div>
  );
}

function TopicDetail({ topic, t, index, kind, place }: { topic: Topic; t: Translation; index: VerseIndex; kind?: string; place?: TopicPlace }) {
  const ps = useMemo(() => passages(topic), [topic]);
  const [n, setN] = useState(25);
  return (
    <div className="max-w-3xl">
      <h2 className="font-garamond text-3xl capitalize">{topic.name}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {kind && <span className="text-foreground/80">{KIND_LABELS[kind] ?? kind}</span>}
        {kind && " · "}
        {ps.length} passages, most endorsed first
        {place && place.share >= 0.4 && place.genre !== "Other" ? ` · mostly in ${place.genre === "Wisdom and poetry" ? "wisdom and poetry" : `the ${place.genre}`}` : ""}
      </p>
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
  /** What was typed when it could not be read as a verse. */
  const [unread, setUnread] = useState<string | null>(null);
  const [connectUnread, setConnectUnread] = useState<string | null>(null);
  const [chain, setChain] = useState<number[] | null | undefined>(undefined);
  const [idea, setIdea] = useState<number[] | "loading" | "error" | null>(null);
  const shelves = useStudy((s) => s.shelves);

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
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-8 py-6 lg:grid-cols-2">
        <section>
          <SectionLabel>Study walk</SectionLabel>
          <p className="mt-2 text-sm text-muted-foreground">
            Start at a verse and follow where Scripture keeps pointing. A random walk over 341,000 cross references that keeps returning to your verse
            (personalised PageRank) ranks the passages most bound up with it.
          </p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const i = resolve(from); setWalkFrom(i ?? null); setUnread(i === undefined ? from.trim() : null); }}>
            <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="A verse, e.g. Isaiah 53:5" />
            <Button type="submit" variant="brand" disabled={!g}>{g ? "Walk" : <Spinner />}</Button>
          </form>
          <div className="mt-4">
            {results?.map((r, i) => (
              <PassageRow key={r.verse} t={t} index={index} start={r.verse} end={r.verse} extra={<span className="ml-2 font-mono text-[10px] text-muted-foreground">#{i + 1}</span>} />
            ))}
            {unread ? (
              <p className="text-xs text-muted-foreground">Could not read “{unread}” as a verse. Try a reference such as Isaiah 53:5 or ps 23:1.</p>
            ) : (
              walkFrom === null && results === null && from && <p className="text-xs text-muted-foreground">Type a verse reference to begin.</p>
            )}
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
              const bad = a === undefined ? from.trim() : b === undefined ? to.trim() : null;
              setConnectUnread(bad);
              setChain(bad !== null ? undefined : g && a !== undefined && b !== undefined ? connect(g, a, b) : null);
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
            {connectUnread !== null && <p className="text-xs text-muted-foreground">Could not read “{connectUnread}” as a verse. Try a reference such as Isaiah 53:5 or ps 23:1.</p>}
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
          <SectionLabel className="mt-10">Between two ideas</SectionLabel>
          <p className="mt-2 text-sm text-muted-foreground">
            Not by links but by meaning: walk the straight line between the two verses and stop at the nearest verse at each step, so one idea turns into the
            other one passage at a time.
          </p>
          <Button
            variant="outline"
            className="mt-3"
            disabled={idea === "loading"}
            onClick={async () => {
              const a = resolve(from), b = resolve(to);
              if (a === undefined || b === undefined) return setIdea("error");
              setIdea("loading");
              try {
                setIdea([a, ...(await between(a, b, shelfSet(shelves))).map((h) => h.verse), b]);
              } catch {
                setIdea("error");
              }
            }}
          >
            {idea === "loading" ? <Spinner /> : <Icon name="sparkle" />} Walk between them
          </Button>
          <div className="mt-4">
            {idea === "error" && <p className="text-sm text-muted-foreground">Meaning search needs the verse embeddings (pnpm data:embed) and two verse references.</p>}
            {Array.isArray(idea) && (
              <ol className="relative space-y-1 border-l border-dashed border-border pl-4">
                {idea.map((v) => (
                  <li key={v} className="relative">
                    <span className="absolute -left-[21px] top-3 size-2.5 rounded-full border border-brand bg-background" />
                    <PassageRow t={t} index={index} start={v} end={v} />
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

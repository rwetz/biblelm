// Studies for young men fighting temptation (src/lib/studies.ts): pick a
// struggle and get a study to work through, alone or with other men. The
// ideas, questions and stories are chosen by hand; the readers' passages come
// from OpenBible's votes and the "keep reading" list from a study walk over
// the cross references, seeded with every verse in the study.

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Icon, SectionLabel, Spinner, toast, cn } from "@nexis/design";
import { Ornament } from "@/art/Art";
import type { Translation, VerseIndex } from "@/lib/bible";
import { formatRef, osisOf, type Ref } from "@/lib/canon";
import { useGraph, useTopics } from "@/lib/hooks";
import { readersPassages, STRUGGLES, studyRef, TO_YOUNG_MEN, type Struggle } from "@/lib/studies";
import { studyWalk } from "@/lib/xrefs";
import { useNotebooks } from "@/store/notebooks";
import { useStudy } from "@/store/study";

/** The verse numbers of a ref in the index, start to end. */
function verseIds(index: VerseIndex, r: Ref): number[] {
  const out: number[] = [];
  for (let v = r.verse; v <= (r.verseEnd ?? r.verse); v++) {
    const i = index.of(`${r.book}.${r.chapter}.${v}`);
    if (i !== undefined) out.push(i);
  }
  return out;
}

export function Studies({ t, index }: { t: Translation; index: VerseIndex }) {
  const asked = useStudy((st) => st.studies);
  const [id, setId] = useState(asked || STRUGGLES[0].id);
  useEffect(() => {
    if (asked) setId(asked);
  }, [asked]);
  const s = STRUGGLES.find((x) => x.id === id) ?? STRUGGLES[0];
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-8 py-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div>
            <SectionLabel>Studies for young men</SectionLabel>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              For men around 18 to 25 fighting temptation. Pick what you are up against; each study has ideas to work through, the stories where
              Scripture shows it, and where readers keep turning.
            </p>
          </div>
          <nav className="space-y-0.5" aria-label="Struggles">
            {STRUGGLES.map((x) => (
              <button
                key={x.id}
                type="button"
                aria-current={x.id === s.id}
                onClick={() => setId(x.id)}
                className={cn("block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60", x.id === s.id && "bg-muted font-medium")}
              >
                {x.title}
              </button>
            ))}
          </nav>
          <YoungMen t={t} />
        </aside>
        <Study key={s.id} s={s} t={t} index={index} />
      </div>
    </div>
  );
}

function Study({ s, t, index }: { s: Struggle; t: Translation; index: VerseIndex }) {
  const [topics] = useTopics();
  const [g] = useGraph();
  const read = useStudy((st) => st.read);
  const ideas = useMemo(() => s.ideas.map((i) => ({ ...i, rs: i.refs.map(studyRef).filter((r): r is Ref => !!r) })), [s]);
  const stories = useMemo(() => s.stories.map((x) => ({ ...x, r: studyRef(x.ref) })).filter((x): x is typeof x & { r: Ref } => !!x.r), [s]);
  // Every verse the study already quotes: the seeds of the walk, and left out of the lists below.
  const quoted = useMemo(() => [...ideas.flatMap((i) => i.rs), ...stories.map((x) => x.r)].flatMap((r) => verseIds(index, r)), [ideas, stories, index]);
  const skip = useMemo(() => new Set(quoted), [quoted]);
  const readers = useMemo(() => (topics ? readersPassages(topics, s, skip) : null), [topics, s, skip]);
  const [walking, setWalking] = useState(false);
  const walk = useMemo(() => (walking && g ? studyWalk(g, quoted, { limit: 60 }).filter((h) => !skip.has(h.verse)).slice(0, 12) : null), [walking, g, quoted, skip]);

  return (
    <article className="min-w-0">
      <header className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-garamond text-4xl">{s.title}</h2>
          <p className="mt-1 text-[15px] text-muted-foreground">{s.lede}</p>
        </div>
        <NotebookButton s={s} ideas={ideas} />
      </header>

      <section className="mt-8 space-y-8">
        {ideas.map((i, k) => (
          <div key={i.title} className="grid gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
            <span className="font-blackletter text-3xl leading-none text-muted-foreground">{k + 1}</span>
            <div className="min-w-0">
              <h3 className="font-garamond text-2xl">{i.title}</h3>
              <div className="mt-2 space-y-3">
                {i.rs.map((r) => (
                  <Quote key={osisOf(r) + (r.verseEnd ?? "")} r={r} t={t} onOpen={() => read(r, { select: true })} />
                ))}
              </div>
              <p className="mt-3 border-l-2 border-brand/40 pl-3 text-sm leading-relaxed">
                <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Question</span>
                {i.question}
              </p>
            </div>
          </div>
        ))}
      </section>

      <Ornament name="fleuron" className="mx-auto my-10 h-5 text-muted-foreground" />

      <div className="grid gap-10 md:grid-cols-2">
        <section>
          <SectionLabel>Stories</SectionLabel>
          <div className="mt-2 space-y-1">
            {stories.map((x) => (
              <button key={x.ref} type="button" onClick={() => read(x.r, { select: true })} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted/60">
                <span className="font-garamond text-lg">{x.title}</span>
                <span className="ml-2 text-xs font-semibold text-brand">{formatRef(x.r)}</span>
                <span className="mt-0.5 line-clamp-2 block font-garamond text-[15px] text-foreground/80">{t.range(x.r).map((v) => v.text).join(" ")}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>Where readers keep turning</SectionLabel>
          <p className="mt-1 text-[11px] text-muted-foreground">
            From OpenBible.info's topics {s.topics.slice(0, 4).join(", ")} and more, ordered by readers' votes (CC-BY).
          </p>
          <div className="mt-2 space-y-1">
            {!readers ? <Spinner /> : readers.map(([a, z]) => <IndexRow key={a} t={t} index={index} start={a} end={z} />)}
          </div>
        </section>
      </div>

      <section className="mt-10">
        <div className="flex items-center gap-3">
          <SectionLabel className="flex-1">Keep reading</SectionLabel>
          {!walking && (
            <Button variant="outline" size="sm" onClick={() => setWalking(true)}>
              <Icon name="nodes" /> Follow the cross references
            </Button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          A study walk over 341,000 cross references, starting from every verse in this study at once: the passages most bound up with all of them.
        </p>
        {walking && !walk && <Spinner className="mt-3" />}
        {walk && (
          <div className="mt-2 grid gap-1 md:grid-cols-2">
            {walk.map((h) => <IndexRow key={h.verse} t={t} index={index} start={h.verse} end={h.verse} />)}
          </div>
        )}
      </section>
    </article>
  );
}

function Quote({ r, t, onOpen }: { r: Ref; t: Translation; onOpen: () => void }) {
  return (
    <blockquote>
      <button type="button" onClick={onOpen} className="text-xs font-semibold text-brand hover:underline">{formatRef(r)}</button>
      <p className="scripture !text-[16px] !leading-7">
        {t.range(r).map((v) => (
          <span key={v.verse}>
            {r.verseEnd && <sup className="vnum">{v.verse}</sup>}
            {v.text}{" "}
          </span>
        ))}
      </p>
    </blockquote>
  );
}

function IndexRow({ t, index, start, end }: { t: Translation; index: VerseIndex; start: number; end: number }) {
  const read = useStudy((s) => s.read);
  const a = index.ref(start);
  const z = index.ref(end);
  const r: Ref = z.book === a.book && z.chapter === a.chapter && z.verse > a.verse ? { ...a, verseEnd: z.verse } : a;
  return (
    <button type="button" onClick={() => read(a, { select: true })} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted/60">
      <span className="text-xs font-semibold text-brand">{formatRef(r)}</span>
      <span className="mt-0.5 line-clamp-2 block font-garamond text-[15px] text-foreground/85">{t.range(r).map((v) => v.text).join(" ")}</span>
    </button>
  );
}

/** Scripture written to young men, beside every study. */
function YoungMen({ t }: { t: Translation }) {
  const read = useStudy((s) => s.read);
  const refs = TO_YOUNG_MEN.map(studyRef).filter((r): r is Ref => !!r);
  return (
    <section className="rounded-xl bg-muted/40 p-3">
      <SectionLabel>Written to young men</SectionLabel>
      <div className="mt-2 space-y-2">
        {refs.map((r) => (
          <button key={osisOf(r)} type="button" onClick={() => read(r, { select: true })} className="block w-full text-left hover:underline" title={t.range(r).map((v) => v.text).join(" ")}>
            <span className="text-xs font-semibold text-brand">{formatRef(r)}</span>
            <span className="line-clamp-2 block font-garamond text-[13px] leading-5 text-foreground/80">{t.range(r).map((v) => v.text).join(" ")}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * The study as a notebook to work in: one note per idea, on its first
 * passage, holding the heading and question for you to answer under.
 */
function NotebookButton({ s, ideas }: { s: Struggle; ideas: { title: string; question: string; rs: Ref[] }[] }) {
  const { createNotebook, addNote, notebooks, setActive } = useNotebooks();
  const study = useStudy();
  const title = `Study: ${s.title}`;
  const existing = notebooks.find((b) => b.title === title);
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button
        variant={existing ? "outline" : "brand"}
        size="sm"
        onClick={() => {
          if (existing) {
            setActive(existing.id);
            study.go("notebooks");
            return;
          }
          const nb = createNotebook({ title, description: s.lede, translations: [study.translation, ...study.parallel], shelves: study.shelves });
          for (const i of ideas) {
            const r = i.rs[0];
            if (!r) continue;
            addNote({
              notebook: nb,
              start: `${r.book}.${r.chapter}.${r.verse}`,
              ...(r.verseEnd ? { end: `${r.book}.${r.chapter}.${r.verseEnd}` } : {}),
              body: `**${i.title}**\n\n${i.question}\n\n`,
              tags: ["study", s.id],
            });
          }
          toast.success("Notebook started", { description: `${title}: a note for each question, ready to answer.` });
        }}
      >
        <Icon name={existing ? "document" : "add"} /> {existing ? "Open its notebook" : "Work through it in a notebook"}
      </Button>
      {!existing && <Badge variant="outline" className="text-[10px]">A note per question</Badge>}
    </div>
  );
}

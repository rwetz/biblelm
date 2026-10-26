// Search as you type. Four lanes answer every keystroke from the local data
// (verses with these words, topics, people and stories, passages by meaning),
// and Jev's reading of the query decides their order: the lane it thinks you
// mean rises to the top, its sigil forms, and a dithered plate beside the box
// resolves as clearly as the reading is sure. The lanes are always real verses
// and real topics; Jev only arranges them, and is never named on screen.

import { useEffect, useMemo, useState } from "react";
import { cn } from "@nexis/design";
import { useFlip } from "@/lib/flip";
import { Dither, usePlates } from "@/art/Art";
import { plateUrl, type Plate } from "@/lib/art";
import type { Translation, Verse, VerseIndex } from "@/lib/bible";
import { formatRef, parseRef, type Ref, type Shelf } from "@/lib/canon";
import { find } from "@/lib/search";
import { semanticSearch, type Hit } from "@/lib/semantic";
import { findTopics, type Topic } from "@/lib/topics";
import { VerseText } from "@/features/read/ReadView";
import { INTENTS, type QueryState } from "./JevReading";
import { Sigil } from "@/art/Sigil";

type Lane = "words" | "theme" | "story" | "question";
const LANES: Lane[] = ["words", "theme", "story", "question"];
const TITLES: Record<Lane, string> = {
  words: "Verses with these words",
  theme: "Topics",
  story: "People and stories",
  question: "Passages by meaning",
};
/** The plate for each reading: what that kind of search looks like. */
const LENS: Record<Lane, number> = {
  words: 116, // Ezra Reading the Law in the Hearing of the People
  theme: 164, // The Sermon on the Mount
  story: 21, // Jacob's Dream, unless a plate names the person
  question: 195, // Jesus With the Doctors
};
const SIGIL = Object.fromEntries(INTENTS.map(([id, , sigil]) => [id, sigil])) as Record<Lane, (typeof INTENTS)[number][2]>;

/** Plates whose title holds every word typed (three letters or more). */
export function platesFor(plates: Plate[], q: string, limit = 4): Plate[] {
  const words = q.toLowerCase().split(/\W+/).filter((w) => w.length >= 3);
  if (!words.length) return [];
  return plates.filter((p) => words.every((w) => p.title.toLowerCase().includes(w))).slice(0, limit);
}

export function LiveSearch({
  query,
  jev,
  t,
  index,
  topics,
  shelves,
  onOpen,
  onTopic,
  onSubmit,
}: {
  query: string;
  jev: QueryState;
  t: Translation;
  index: VerseIndex;
  topics: Topic[] | null;
  shelves: ReadonlySet<Shelf>;
  onOpen: (r: Ref) => void;
  onTopic: (name: string) => void;
  onSubmit: () => void;
}) {
  const q = query.trim();
  const plates = usePlates();
  const ref = parseRef(q);

  const words = useMemo(() => {
    if (ref && t.hasBook(ref.book)) {
      const verses = t.chapter(ref.book, ref.chapter).filter((v) => !ref.verse || (v.verse >= ref.verse && v.verse <= (ref.verseEnd ?? ref.verse)));
      return { passage: ref, verses: verses.slice(0, 3), count: verses.length };
    }
    if (q.length < 2) return { passage: null, verses: [] as Verse[], count: 0 };
    const r = find(t, q, shelves, 4);
    return { passage: null, verses: r.results, count: r.count };
  }, [q, t, shelves, ref?.book, ref?.chapter, ref?.verse, ref?.verseEnd]);
  const topicHits = useMemo(() => {
    if (!topics || q.length < 2) return [];
    const whole = findTopics(topics, q.replace(/^(verses?|find|search)\s+(about|on|for)?\s*/i, ""), 8);
    if (whole.length) return whole;
    // "when I feel anxious": try the longer words by their stems ("anxio" finds anxiety).
    const seen = new Set<string>();
    return q
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 5)
      .flatMap((w) => findTopics(topics, w.slice(0, Math.max(4, w.length - 3)), 4))
      .filter((tp) => !seen.has(tp.name) && seen.add(tp.name))
      .slice(0, 8);
  }, [topics, q]);
  const people = useMemo(() => platesFor(plates, q), [plates, q]);

  // By meaning, from the local embedding model, a moment after typing stops.
  const [meaning, setMeaning] = useState<Hit[] | null>(null);
  useEffect(() => {
    if (q.length < 4 || ref) {
      setMeaning(null);
      return;
    }
    let live = true;
    const timer = window.setTimeout(() => {
      semanticSearch(q, shelves, 4).then((h) => live && setMeaning(h), () => live && setMeaning([]));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q, shelves, ref]);

  const r = jev.reading;
  const odds = (l: Lane) => r?.probabilities[l] ?? 0;
  const has: Record<Lane, boolean> = {
    words: words.verses.length > 0,
    theme: topicHits.length > 0,
    story: people.length > 0,
    question: true,
  };
  // Lanes with something to show come first; among those, Jev's odds decide.
  const order = [...LANES].sort((a, b) => Number(has[b]) - Number(has[a]) || (r ? odds(b) - odds(a) : 0));
  const flip = useFlip(order.join());
  const top = r && has[r.choice as Lane] ? (r.choice as Lane) : order[0];
  const lensPlate = (top === "story" && people[0]) || plates.find((p) => p.n === LENS[top]);
  // The plate resolves as far as Jev's odds on its own reading.
  const sure = r ? (r.probabilities[r.choice] ?? r.confidence) : 0;
  const level = r ? Math.max(0.12, sure) : jev.on ? 0.15 : 1;

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_11rem]">
      <div className="space-y-3">
        {order.map((lane) => {
          const p = odds(lane);
          const lead = lane === top;
          return (
            <section
              key={lane}
              ref={flip(lane)}
              className={cn(
                "rounded-xl px-4 py-3 ring-1 transition-[background-color,opacity] duration-200",
                lead ? "bg-card ring-brand/30" : "bg-card/50 ring-foreground/6",
                !has[lane] && "opacity-60",
              )}
            >
              <header className="flex items-center gap-2.5">
                <Sigil name={SIGIL[lane]} size={18} level={r ? Math.max(0.12, p) : 0.5} className={lead ? "text-foreground" : "text-muted-foreground"} />
                <h3 className={cn("text-xs font-medium uppercase tracking-wider", lead ? "text-foreground" : "text-muted-foreground")}>{TITLES[lane]}</h3>
              </header>
              <div className="mt-2">
                {lane === "words" &&
                  (words.verses.length ? (
                    <>
                      {words.passage ? (
                        <p className="mb-1 text-xs text-muted-foreground">{formatRef(words.passage)}</p>
                      ) : (
                        <p className="mb-1 text-xs text-muted-foreground">
                          {words.count.toLocaleString()} {words.count === 1 ? "verse" : "verses"} in {t.textsOf(words.verses)}
                        </p>
                      )}
                      {words.verses.map((v) => (
                        <LiveVerse key={`${v.book}.${v.chapter}.${v.verse}`} v={v} onOpen={onOpen} />
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No verse has these exact words.</p>
                  ))}
                {lane === "theme" &&
                  (topicHits.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {topicHits.map((tp) => (
                        <button key={tp.name} type="button" onClick={() => onTopic(tp.name)} className="rounded-full bg-muted px-3 py-1 text-xs capitalize transition-colors hover:bg-foreground/10">
                          {tp.name} <span className="text-muted-foreground">· {tp.p.length / 3}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No topic by that name.</p>
                  ))}
                {lane === "story" &&
                  (people.length ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {people.map((pl) => (
                        <button key={pl.id} type="button" onClick={() => pl.ref && onOpen(pl.ref)} className="group text-left">
                          <Dither src={plateUrl(pl.thumb)} algo="floyd" dot={1} focusY={30} className="aspect-[4/5] w-full rounded-md text-foreground/85 transition-opacity group-hover:opacity-100" />
                          <span className="mt-1 block truncate font-garamond text-[13px] leading-tight">{pl.title}</span>
                          {pl.ref && <span className="block text-[11px] text-muted-foreground">{formatRef(pl.ref)}</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No illustrated story matches yet.</p>
                  ))}
                {lane === "question" &&
                  (meaning && meaning.length ? (
                    meaning.map((h) => {
                      const v = t.verse(index.ref(h.verse));
                      return v ? <LiveVerse key={h.verse} v={v} onOpen={onOpen} /> : null;
                    })
                  ) : (
                    <button type="button" onClick={onSubmit} className="text-sm text-muted-foreground hover:text-foreground">
                      {q.length < 4 ? "Keep typing, or press Enter to search by meaning." : "Finding passages by meaning…"}
                    </button>
                  ))}
              </div>
            </section>
          );
        })}
      </div>

      <aside className="hidden md:block">
        {lensPlate && (
          <figure className="sticky top-4">
            <Dither src={plateUrl(lensPlate.full)} algo="floyd" dot={1} focusY={30} level={level} className="aspect-[4/5] w-full text-foreground" label={`${lensPlate.title}, after ${lensPlate.artist ?? "Gustave Doré"}`} />
            <figcaption className="mt-2 font-garamond text-[13px] italic leading-snug text-muted-foreground">{lensPlate.title}</figcaption>
          </figure>
        )}
      </aside>
    </div>
  );
}

function LiveVerse({ v, onOpen }: { v: Verse; onOpen: (r: Ref) => void }) {
  return (
    <button type="button" onClick={() => onOpen(v)} className="-mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-1 text-left transition-colors hover:bg-foreground/5">
      <span className="text-xs font-semibold text-brand">{formatRef(v)}</span>{" "}
      <span className="font-garamond text-[15px] leading-6">
        <VerseText raw={v.raw} />
      </span>
    </button>
  );
}

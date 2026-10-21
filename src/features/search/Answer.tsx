// A question typed into search, answered by choosing, never by writing: the
// passages found by meaning are put to Jev with the question, and it picks
// the ones that answer and the words in each that do. When the question is
// about the Bible as a book ("why is LORD in capitals?"), it may pick one of
// the hand-written notes instead. Every word shown is Scripture or a note we
// wrote, labelled as such; nothing is generated, and Jev is not named.

import { useEffect, useState } from "react";
import { cn } from "@nexis/design";
import { plainText, type Translation, type VerseIndex } from "@/lib/bible";
import { formatRef, parseOsis, type Ref, type Shelf } from "@/lib/canon";
import { clauses, findAnswer, jevAvailable, readQuery, type AnswerPick } from "@/lib/jev";
import { NOTES, noteById } from "@/lib/notes";
import { semanticSearch } from "@/lib/semantic";
import { Sigil } from "@/art/Sigil";

const CANDIDATES = 8;
const NOTE_INDEX = NOTES.map((n) => ({ id: n.id, about: n.about }));

/** Asked as a question: the reading says so, or the words do. */
function looksLikeQuestion(q: string): boolean {
  return /\?\s*$/.test(q) || /^(who|whom|whose|what|when|where|why|how|is|are|was|were|does|do|did|can|could|should|will|would)\b/i.test(q.trim());
}

type Found = { pick: AnswerPick; passages: { ref: Ref; text: string; clauses: string[] }[] };

export function Answer({ query, t, index, shelves, onOpen }: { query: string; t: Translation; index: VerseIndex; shelves: ReadonlySet<Shelf>; onOpen: (r: Ref) => void }) {
  const [found, setFound] = useState<Found | null>(null);

  useEffect(() => {
    let live = true;
    setFound(null);
    (async () => {
      if (!(await jevAvailable())) return;
      const reading = await readQuery(query);
      const asked = reading ? reading.choice === "question" && (reading.probabilities.question ?? 0) >= 0.5 : false;
      if (!asked && !looksLikeQuestion(query)) return;
      const hits = await semanticSearch(query, shelves, CANDIDATES);
      const passages = hits
        .map((h) => {
          const ref = index.ref(h.verse);
          const v = t.verse(ref);
          if (!v) return null;
          const text = plainText(v.raw).replace(/^¶\s*/, "");
          return { ref, text, clauses: clauses(text) };
        })
        .filter((p): p is NonNullable<typeof p> => !!p);
      const pick = await findAnswer(
        query,
        passages.map((p) => ({ ref: formatRef(p.ref), text: p.text, clauses: p.clauses })),
        NOTE_INDEX,
      );
      if (live && pick && (pick.note || pick.passages.length)) setFound({ pick, passages });
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [query, t, index, shelves]);

  if (!found) return null;
  const note = found.pick.note ? noteById(found.pick.note.id) : undefined;
  return (
    <section className="space-y-4">
      {note && (
        <article className="rounded-2xl bg-card px-6 py-5 ring-1 ring-foreground/8">
          <header className="flex items-center gap-3">
            <Sigil name="scroll" size={22} className="text-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">A note on the text</p>
              <h3 className="font-garamond text-2xl leading-tight">{note.title}</h3>
            </div>
          </header>
          <div className="mt-3 space-y-2.5 font-garamond text-[17px] leading-7 text-foreground/90">
            {note.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {note.see && (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              See
              {note.see.map((o) => {
                const r = parseOsis(o);
                return r ? (
                  <button key={o} type="button" onClick={() => onOpen(r)} className="font-semibold text-brand hover:underline">
                    {formatRef(r)}
                  </button>
                ) : null;
              })}
            </p>
          )}
          <p className="mt-3 border-t border-border/50 pt-2 text-[11px] text-muted-foreground/80">Written for BibleLM about the Bible as a book. It is not Scripture.</p>
        </article>
      )}
      {found.pick.passages.length > 0 && (
        <article className="rounded-2xl bg-card px-6 py-5 ring-1 ring-foreground/8">
          <header className="flex items-center gap-3">
            <Sigil name="key" size={22} className="text-foreground" />
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Where Scripture speaks to this</p>
          </header>
          <div className="mt-3 space-y-3">
            {found.pick.passages.map(({ i, clause, level }) => {
              const p = found.passages[i];
              return (
                <button key={i} type="button" onClick={() => onOpen(p.ref)} className="-mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-foreground/5">
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand">{formatRef(p.ref)}</span>
                    <span className="flex gap-0.5" aria-hidden>
                      {[1, 2, 3].map((k) => (
                        <span key={k} className={cn("size-1 rounded-full", level >= k - 0.5 ? "bg-foreground/60" : "bg-foreground/15")} />
                      ))}
                    </span>
                  </span>
                  <span className="mt-1 block font-garamond text-[17px] leading-7">
                    {p.clauses.map((c, j) => (
                      <span key={j} className={cn(clause === null || j === clause ? "text-foreground" : "text-muted-foreground")}>
                        {j === clause ? <mark className="rounded-sm bg-foreground/10 px-0.5 text-foreground">{c}</mark> : c}{" "}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </article>
      )}
    </section>
  );
}

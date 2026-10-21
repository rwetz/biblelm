// Echoes: where the New Testament quotes the Old. Found the way DNA is
// aligned (Smith-Waterman over words, scripts/data/graph.mjs), so these are
// shared wording, word for word, in the KJV. Paraphrase and allusion without
// shared words is left to the "More like this" of each verse.

import { useEffect, useMemo, useState } from "react";
import { SectionLabel, Spinner, cn } from "@nexis/design";
import type { Translation, VerseIndex } from "@/lib/bible";
import { BOOKS, bookName, formatRef } from "@/lib/canon";
import { loadAllusions, type Allusion } from "@/lib/xrefs";
import { useStudy } from "@/store/study";

export function Echoes({ t, index }: { t: Translation; index: VerseIndex }) {
  const [all, setAll] = useState<Allusion[] | null | undefined>(undefined);
  const [ot, setOt] = useState<string | null>(null);
  const read = useStudy((s) => s.read);
  useEffect(() => {
    loadAllusions().then(setAll, () => setAll(null));
  }, []);
  const quoted = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of all ?? []) {
      const b = index.ref(a[1]).book;
      m.set(b, (m.get(b) ?? 0) + 1);
    }
    return BOOKS.filter((b) => m.has(b.osis)).map((b) => [b.osis, m.get(b.osis)!] as const).sort((x, y) => y[1] - x[1]);
  }, [all, index]);
  const shown = useMemo(() => (all ?? []).filter((a) => !ot || index.ref(a[1]).book === ot), [all, ot, index]);
  const max = quoted[0]?.[1] ?? 1;

  if (all === undefined) return <div className="grid flex-1 place-items-center"><Spinner /></div>;
  if (all === null) return <p className="p-8 text-sm text-muted-foreground">Not built yet: run node scripts/data/graph.mjs.</p>;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-8 py-6 lg:grid-cols-[16rem_1fr]">
        <section>
          <SectionLabel>Which books the New Testament quotes</SectionLabel>
          <p className="mt-1 text-xs text-muted-foreground">Shared runs of words between a New Testament verse and an Old, found by local alignment.</p>
          <ul className="mt-3 space-y-1">
            <li>
              <button type="button" onClick={() => setOt(null)} className={cn("text-sm hover:underline", !ot && "font-semibold")}>All {all.length}</button>
            </li>
            {quoted.map(([b, n]) => (
              <li key={b}>
                <button type="button" onClick={() => setOt(b)} className={cn("flex w-full items-center gap-2 text-left text-sm", ot === b && "font-semibold")}>
                  <span className="w-28 shrink-0 font-garamond text-base hover:underline">{bookName(b)}</span>
                  <span className="h-1.5 rounded-full bg-foreground/50" style={{ width: `${(n / max) * 100}%` }} />
                  <span className="text-xs text-muted-foreground">{n}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-3">
          {shown.slice(0, 200).map(([n, o, , words]) => {
            const rn = index.ref(n), ro = index.ref(o);
            return (
              <div key={`${n}-${o}`} className="grid gap-4 rounded-lg border border-border/60 p-4 md:grid-cols-2">
                <Quote r={rn} text={t.verse(rn)?.text ?? ""} words={words} onRead={() => read(rn, { select: true })} />
                <Quote r={ro} text={t.verse(ro)?.text ?? ""} words={words} onRead={() => read(ro, { select: true })} />
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

/**
 * A verse with the shared run underlined: the aligned words matched in order
 * (a greedy subsequence, allowing the few words alignment skipped over).
 */
function Quote({ r, text, words, onRead }: { r: ReturnType<VerseIndex["ref"]>; text: string; words: string; onRead: () => void }) {
  const parts = text.split(/(\s+)/);
  const key = parts.map((w) => w.toLowerCase().replace(/[^a-z]/g, ""));
  const want = words.split(" ");
  // Start where the run's first two words first appear together, then follow it.
  let best = new Set<number>();
  for (let s = 0; s < parts.length; s++) {
    if (key[s] !== want[0]) continue;
    const got = new Set<number>();
    let j = 0;
    for (let i = s; i < parts.length && j < want.length; i++) {
      if (!key[i]) continue;
      if (key[i] === want[j]) {
        got.add(i);
        j++;
      } else if (key[i] === want[j + 1]) {
        got.add(i);
        j += 2;
      }
    }
    if (got.size > best.size) best = got;
  }
  return (
    <div>
      <button type="button" onClick={onRead} className="text-xs font-semibold text-brand hover:underline">{formatRef(r)}</button>
      <p className="mt-1 font-garamond text-[16px] leading-7">
        {parts.map((w, i) => (best.has(i) ? <span key={i} className="underline decoration-brand/60 decoration-1 underline-offset-4">{w}</span> : <span key={i}>{w}</span>))}
      </p>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Button, Icon, SectionLabel, Spinner, cn } from "@nexis/design";
import type { Translation } from "@/lib/bible";
import { formatRef, parseOsis, type Ref } from "@/lib/canon";
import { isHebrew, loadConcordance, loadLexicon, loadTags, relatedCodes, renderings, type LexEntry, type Tagged } from "@/lib/strongs";

/** The tagged words of one verse; pick one to study its Hebrew or Greek. */
export function VerseWords({ osis, t, onStudy }: { osis: string; t: Translation; onStudy: (code: string) => void }) {
  const [words, setWords] = useState<Tagged[] | null>(null);
  useEffect(() => {
    let live = true;
    setWords(null);
    loadTags(t.meta.id).then((all) => live && setWords(all[osis] ?? []), () => live && setWords([]));
    return () => {
      live = false;
    };
  }, [osis, t.meta.id]);
  if (!t.meta.strongs || !words?.length) return null;
  return (
    <section className="space-y-2">
      <SectionLabel>Word study · {t.meta.abbr}</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {words.map(([w, c], i) => (
          <button key={i} type="button" onClick={() => onStudy(c)} className="rounded-md bg-muted px-2 py-0.5 text-xs hover:bg-accent">
            {w} <span className="font-mono text-[10px] text-muted-foreground">{c}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** One Strong's number: the lemma, its meaning, and every verse that uses it. */
export function StrongsEntry({
  code,
  t,
  onNavigate,
  onStudy,
  className,
}: {
  code: string;
  t: Translation;
  onNavigate: (r: Ref) => void;
  onStudy: (code: string) => void;
  className?: string;
}) {
  const [entry, setEntry] = useState<LexEntry | null | undefined>(undefined);
  const [hits, setHits] = useState<{ osis: string; words: string[] }[] | null>(null);
  const [n, setN] = useState(20);
  useEffect(() => {
    let live = true;
    setEntry(undefined);
    setHits(null);
    setN(20);
    loadLexicon().then((lex) => live && setEntry(lex[code] ?? null), () => live && setEntry(null));
    loadConcordance(t.meta.id).then((c) => live && setHits(c.get(code) ?? []), () => live && setHits([]));
    return () => {
      live = false;
    };
  }, [code, t.meta.id]);
  const used = useMemo(() => (hits ? renderings(hits) : []), [hits]);

  if (entry === undefined) return <Spinner />;
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline gap-3">
        <span dir={isHebrew(code) ? "rtl" : "ltr"} className="font-garamond text-3xl" lang={isHebrew(code) ? "he" : "grc"}>
          {entry?.l || code}
        </span>
        <span className="font-garamond text-lg italic text-muted-foreground">{entry?.t}</span>
        <span className="font-mono text-xs text-muted-foreground">{code}</span>
      </div>
      {entry ? (
        <>
          <p className="font-garamond text-[16px] leading-7">{entry.d}</p>
          {entry.k && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">KJV renders</span> {entry.k}
            </p>
          )}
          {entry.o && (
            <p className="text-xs text-muted-foreground">
              {entry.o}{" "}
              {relatedCodes(entry.o).map((c) => (
                <button key={c} type="button" onClick={() => onStudy(c)} className="ml-1 font-mono text-brand hover:underline">
                  {c}
                </button>
              ))}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">No dictionary entry for {code}.</p>
      )}
      {hits && (
        <>
          <SectionLabel>
            {hits.length.toLocaleString()} {hits.length === 1 ? "verse" : "verses"} in the {t.meta.abbr}
          </SectionLabel>
          {used.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Rendered as {used.slice(0, 8).map(([w, c]) => `“${w}” ${c}`).join(", ")}
              {used.length > 8 ? ", …" : ""}
            </p>
          )}
          <div>
            {hits.slice(0, n).map((h) => {
              const r = parseOsis(h.osis);
              if (!r) return null;
              const text = t.verse(r)?.text;
              return (
                <button key={h.osis} type="button" onClick={() => onNavigate(r)} className="block w-full rounded-md p-1.5 text-left hover:bg-muted">
                  <span className="text-xs font-semibold text-brand">{formatRef(r)}</span>
                  <span className="ml-2 text-[11px] text-muted-foreground">{h.words.join(", ")}</span>
                  {text && <span className="mt-0.5 line-clamp-2 block font-garamond text-sm text-foreground/85">{highlight(text, h.words)}</span>}
                </button>
              );
            })}
          </div>
          {hits.length > n && (
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setN(n + 40)}>
              <Icon name="chevron-down" /> More
            </Button>
          )}
        </>
      )}
      <p className="text-[10px] text-muted-foreground/70">Strong's Exhaustive Concordance (1890), in the Open Scriptures JSON edition (CC-BY-SA).</p>
    </div>
  );
}

function highlight(text: string, words: string[]) {
  const set = words.map((w) => w.toLowerCase());
  const parts = text.split(/(\s+)/);
  return parts.map((p, i) => {
    const bare = p.toLowerCase().replace(/[^\p{L}’'-]/gu, "");
    return set.some((w) => w === bare || (w.includes(" ") && w.split(" ").includes(bare))) ? (
      <mark key={i} className="rounded-sm bg-brand/12 text-foreground">{p}</mark>
    ) : (
      p
    );
  });
}

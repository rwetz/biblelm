// Honest statistics: small lessons that keep computation in service of truth.
//   Zipf's law     word frequency against rank on log axes is nearly a line,
//                  in Scripture as in every language.
//   Bible codes    the equidistant-letter search, run on Genesis and on
//                  Moby-Dick side by side, against what chance predicts.
// Both run in the app from the text itself; no model and no Python.

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Panel, SectionLabel, Spinner, cn } from "@nexis/design";
import { bookLetters, expectedEls, findEls, loadMoby, type ElsHit } from "@/lib/els";
import { useTranslation } from "@/lib/hooks";
import { zipf } from "@/lib/words";
import { useStudy } from "@/store/study";
import { LabSection } from "../LabSection";

export function LessonsView() {
  const translation = useStudy((s) => s.translation);
  const [t] = useTranslation(translation);
  if (!t) return <div className="grid place-items-center py-16"><Spinner /></div>;
  return (
    <>
      <LabSection
        title="Zipf's law"
        lede={`Count every word in the ${t.meta.abbr}, rank them from commonest down, and plot both on logarithmic axes: a nearly straight line, falling about one decade for each decade of rank. The same law holds in every language, and in Moby-Dick too.`}
      >
        <Zipf words={t} />
      </LabSection>
      <LabSection
        title="The Bible codes, honestly"
        lede="Take every n-th letter and words appear: in 1994 a paper found names hidden this way in Genesis. Then McKay and colleagues found just as many in Moby-Dick. Search both here, with the count that chance alone predicts."
      >
        <Codes t={t} />
      </LabSection>
    </>
  );
}

function Zipf({ words }: { words: Parameters<typeof zipf>[0] }) {
  const z = useMemo(() => zipf(words), [words]);
  const W = 640, H = 300, pad = 36;
  const maxR = Math.log10(z.ranks.length), maxF = Math.log10(z.ranks[0]);
  const px = (r: number) => pad + (Math.log10(r) / maxR) * (W - pad - 8);
  const py = (f: number) => H - pad - (Math.log10(f) / maxF) * (H - pad - 8);
  const all = z.ranks.map((f, i) => [i + 1, f] as const).filter(([r]) => r <= 50 || r % Math.ceil(z.ranks.length / 400) === 0);
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_16rem]">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-foreground" role="img" aria-label="Word frequency against rank, log-log">
        <line x1={pad} y1={H - pad} x2={W - 8} y2={H - pad} stroke="currentColor" strokeOpacity="0.3" />
        <line x1={pad} y1={8} x2={pad} y2={H - pad} stroke="currentColor" strokeOpacity="0.3" />
        {[1, 10, 100, 1000, 10000].filter((r) => r <= z.ranks.length).map((r) => (
          <text key={r} x={px(r)} y={H - pad + 14} fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.6">{r.toLocaleString()}</text>
        ))}
        {[1, 10, 100, 1000, 10000].filter((f) => f <= z.ranks[0]).map((f) => (
          <text key={f} x={pad - 4} y={py(f) + 3} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.6">{f.toLocaleString()}</text>
        ))}
        {all.map(([r, f]) => (
          <circle key={r} cx={px(r)} cy={py(f)} r={1.6} fill="currentColor" opacity="0.75" />
        ))}
        <text x={W - 10} y={H - pad - 6} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.6">rank</text>
        <text x={pad + 14} y={16} fontSize="10" fill="currentColor" opacity="0.6">times used</text>
      </svg>
      <div className="text-sm">
        <SectionLabel>The commonest</SectionLabel>
        <p className="mt-1 font-garamond text-lg leading-7">{z.words.slice(0, 20).join(", ")}</p>
        <p className="mt-4 text-muted-foreground">
          Slope of the line between ranks 10 and 1,000: <span className="font-mono text-foreground">{z.slope.toFixed(2)}</span>. Zipf's ideal is exactly
          -1. {z.ranks.length.toLocaleString()} different words in all.
        </p>
      </div>
    </div>
  );
}

export function Codes({ t }: { t: NonNullable<ReturnType<typeof useTranslation>[0]> }) {
  const [word, setWord] = useState("GOD");
  const [skip, setSkip] = useState(250);
  const [moby, setMoby] = useState<string | null | undefined>(undefined);
  const [run, setRun] = useState<{ word: string; skip: number } | null>(null);
  useEffect(() => {
    loadMoby().then(setMoby, () => setMoby(null));
  }, []);
  const genesis = useMemo(() => bookLetters(t, ["Gen"]), [t]);
  // The same number of letters from each, so the comparison is fair.
  const n = Math.min(genesis.length, moby?.length ?? genesis.length);
  const result = useMemo(() => {
    if (!run || !moby) return null;
    const a = genesis.slice(0, n), b = moby.slice(0, n);
    return {
      gen: findEls(a, run.word, run.skip),
      moby: findEls(b, run.word, run.skip),
      expectGen: expectedEls(a, run.word, run.skip),
      expectMoby: expectedEls(b, run.word, run.skip),
      a,
      b,
    };
  }, [run, moby, genesis, n]);

  if (moby === undefined) return <Spinner />;
  if (moby === null) return <p className="text-sm text-muted-foreground">The control text is not built yet: run node scripts/data/daily.mjs.</p>;
  return (
    <div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setRun({ word, skip });
        }}
      >
        <label className="text-xs text-muted-foreground">
          A word
          <Input value={word} onChange={(e) => setWord(e.target.value)} className="mt-1 h-8 w-40 font-mono uppercase" />
        </label>
        <label className="text-xs text-muted-foreground">
          Largest skip
          <Input type="number" min={2} max={2000} value={skip} onChange={(e) => setSkip(Math.max(2, Math.min(2000, +e.target.value || 2)))} className="mt-1 h-8 w-28" />
        </label>
        <Button type="submit" variant="brand" size="sm">Search both</Button>
        <span className="text-xs text-muted-foreground">{n.toLocaleString()} letters of each: Genesis ({t.meta.abbr}) and the opening of Moby-Dick.</span>
      </form>
      {result && run && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ElsPanel title="Genesis" text={result.a} hits={result.gen} expected={result.expectGen} word={run.word} />
          <ElsPanel title="Moby-Dick" text={result.b} hits={result.moby} expected={result.expectMoby} word={run.word} />
          <p className="text-sm text-muted-foreground md:col-span-2">
            Both texts give about what chance predicts from their letter frequencies alone. Any long enough text "hides" any short word; what made the 1994 result
            look meaningful was the freedom to choose words, spellings and skips after looking. That is the look-elsewhere effect.
          </p>
        </div>
      )}
    </div>
  );
}

function ElsPanel({ title, text, hits, expected, word }: { title: string; text: string; hits: ElsHit[]; expected: number; word: string }) {
  const h = hits[0];
  return (
    <Panel className="p-4">
      <div className="flex items-baseline gap-2">
        <p className="font-garamond text-xl">{title}</p>
        <span className="flex-1" />
        <span className="font-mono text-sm">{hits.length.toLocaleString()}{hits.length >= 200_000 ? "+" : ""} found</span>
      </div>
      <p className="text-xs text-muted-foreground">Chance predicts about {Math.round(expected).toLocaleString()}.</p>
      {h && <LetterGrid text={text} hit={h} len={word.replace(/[^A-Za-z]/g, "").length} />}
    </Panel>
  );
}

/** The first hit as a grid of letters `skip` wide, so the word stands in a column: the classic picture. */
function LetterGrid({ text, hit, len }: { text: string; hit: ElsHit; len: number }) {
  const d = Math.abs(hit.skip);
  const cols = 15, half = Math.floor(cols / 2);
  const rows = len + 2;
  const top = hit.skip > 0 ? hit.start - d : hit.start + hit.skip * (len - 1) - d;
  const on = new Set(Array.from({ length: len }, (_, k) => hit.start + hit.skip * k));
  return (
    <div className="mt-3 overflow-x-auto font-mono text-[12px] leading-5">
      {Array.from({ length: rows }, (_, r) => {
        const centre = top + r * d;
        return (
          <div key={r} className="flex">
            {Array.from({ length: cols }, (_, c) => {
              const i = centre - half + c;
              return (
                <span key={c} className={cn("w-4 text-center", on.has(i) ? "font-bold text-brand" : "text-muted-foreground/70")}>
                  {text[i] ?? " "}
                </span>
              );
            })}
          </div>
        );
      })}
      <p className="mt-1 font-sans text-[11px] text-muted-foreground">Every {d}th letter{hit.skip < 0 ? ", read backwards" : ""}.</p>
    </div>
  );
}

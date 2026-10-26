import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, resolveCssColor, SectionLabel, Spinner, useTheme } from "@nexis/design";
import type { Translation, VerseIndex } from "@/lib/bible";
import { formatRef, parseRef, type Ref } from "@/lib/canon";
import { chiasmScan, similarityMatrix } from "@/lib/semantic";
import { useStudy } from "@/store/study";

// The shape of a passage. Every pair of verses is compared by meaning; the
// grid shows how alike they are. Repetition shows as bright squares off the
// diagonal; a chiasm (A B C B' A'), a favourite Hebrew structure, shows as a
// bright anti-diagonal across a block. The scan ranks candidate centres.

export function Structure({ t, index }: { t: Translation; index: VerseIndex }) {
  const location = useStudy((s) => s.location);
  const [input, setInput] = useState(formatRef({ ...location, verse: 0 }));
  const [ref, setRef] = useState<Ref>({ ...location, verse: 0 });
  const [m, setM] = useState<Float32Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { paletteEpoch } = useTheme();

  const verses = useMemo(() => t.range(ref), [t, ref]);
  const ids = useMemo(() => verses.map((v) => index.of(`${v.book}.${v.chapter}.${v.verse}`)).filter((x): x is number => x !== undefined), [verses, index]);
  const n = ids.length;

  useEffect(() => {
    setM(null);
    setError(null);
    if (n < 4) return;
    similarityMatrix(ids).then(setM, (e) => setError(String(e.message ?? e)));
  }, [ids, n]);

  const scan = useMemo(() => (m ? chiasmScan(m, n) : null), [m, n]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !m) return;
    const size = Math.min(560, cv.parentElement!.clientWidth);
    const dpr = window.devicePixelRatio || 1;
    cv.width = size * dpr;
    cv.height = size * dpr;
    cv.style.width = cv.style.height = `${size}px`;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const cell = size / n;
    const ink = resolveCssColor("var(--brand)");
    let lo = Infinity, hi = -Infinity;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b) { lo = Math.min(lo, m[a * n + b]); hi = Math.max(hi, m[a * n + b]); }
    ctx.clearRect(0, 0, size, size);
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++) {
        ctx.globalAlpha = a === b ? 0.15 : Math.pow((m[a * n + b] - lo) / (hi - lo || 1), 2);
        ctx.fillStyle = ink;
        ctx.fillRect(b * cell, a * cell, Math.ceil(cell), Math.ceil(cell));
      }
    ctx.globalAlpha = 1;
  }, [m, n, paletteEpoch]);

  const v = (i: number) => verses[i];
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-(--gutter) py-6">
      <form className="flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); const r = parseRef(input); if (r) setRef(r.verse ? r : { ...r, verse: 0 }); }}>
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="A chapter or passage, e.g. Psalm 67" />
        <Button type="submit" variant="brand">Analyse</Button>
      </form>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Each square compares two verses by meaning. Bright squares off the diagonal are echoes; a bright line running across the other diagonal is a mirror,
        the A B C B′ A′ shape Hebrew writers used to put the centre of a passage at its centre. Try Psalm 67, Genesis 17 or Matthew 13.
      </p>
      {n > 0 && n < 4 && <p className="mt-4 text-sm text-muted-foreground">Pick a passage of at least four verses.</p>}
      {error && <p className="mt-4 text-sm text-muted-foreground">The semantic index is not built ({error}).</p>}
      {n >= 4 && !m && !error && <div className="mt-8"><Spinner /></div>}
      {m && (
        <div className="mt-6 flex flex-wrap gap-8">
          <div className="relative">
            <canvas
              ref={canvas}
              className="rounded-md ring-1 ring-foreground/8"
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setHover([Math.floor(((e.clientY - r.top) / r.height) * n), Math.floor(((e.clientX - r.left) / r.width) * n)]);
              }}
              onMouseLeave={() => setHover(null)}
            />
            {hover && v(hover[0]) && v(hover[1]) && (
              <p className="mt-2 max-w-[560px] text-xs text-muted-foreground">
                v{v(hover[0]).verse} and v{v(hover[1]).verse}: similarity {m[hover[0] * n + hover[1]].toFixed(2)}
              </p>
            )}
          </div>
          <div className="min-w-0 max-w-md flex-1 space-y-4">
            <SectionLabel>Possible mirrors</SectionLabel>
            {scan?.centres.slice(0, 4).map((c) => {
              const lo = Math.ceil(c.centre - c.arms), hi = Math.floor(c.centre + c.arms);
              return (
                <div key={c.centre} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    Centre at {Number.isInteger(c.centre) ? `verse ${v(c.centre)?.verse}` : `verses ${v(Math.floor(c.centre))?.verse} and ${v(Math.ceil(c.centre))?.verse}`},{" "}
                    {c.arms} pairs, {Math.round(c.lift * 100)} points above the passage's average likeness
                  </p>
                  <ol className="mt-2 space-y-1 font-garamond text-sm">
                    {verses.slice(lo, hi + 1).map((x, i) => {
                      const depth = Math.min(i, hi - lo - i);
                      return (
                        <li key={x.verse} style={{ paddingLeft: `${depth * 14}px` }} className="line-clamp-1">
                          <span className="mr-1 font-sans text-[10px] font-semibold text-brand">{String.fromCharCode(65 + depth)}</span>
                          <sup className="mr-1 text-[10px] text-muted-foreground">{x.verse}</sup>
                          {x.text}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
            <p className="text-[11px] text-muted-foreground/70">
              A statistical hint, not a finding: likeness by a small model can echo vocabulary rather than design. Read the passage, then the commentaries.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

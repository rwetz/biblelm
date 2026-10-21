// The corpus in figures a person can feel: the model's whole alphabet laid
// out like a printer's type case, how long the text would take to read aloud,
// and BibleLM beside GPT-3 as one dot in a field of them.

import { useEffect, useRef, useState } from "react";
import { Panel, resolveCssColor, Tooltip, TooltipContent, TooltipTrigger, useTheme } from "@nexis/design";
import { invoke } from "@/lib/backend";

interface Corpus {
  id: string;
  name: string;
  sizeBytes?: number;
  charCount?: number;
  wordCount?: number;
  vocabSize?: number;
}

const SHOWN: Record<string, string> = { " ": "␣", "\n": "↵", "\t": "⇥" };
const NAMED: Record<string, string> = { " ": "the space", "\n": "a line break", "\t": "a tab" };

/** Three facts in human terms. */
export function Reading({ t }: { t: Corpus }) {
  const chars = t.charCount ?? 0;
  const words = t.wordCount ?? 0;
  const hours = words / 150 / 60; // reading aloud at 150 words a minute
  const figures = [
    { value: Math.round(hours).toLocaleString(), unit: "hours", note: "to read it aloud, at an easy pace. The model reads all of it in each pass of training." },
    { value: Math.round(words / 550).toLocaleString(), unit: "pages", note: `as a printed book: ${words.toLocaleString()} words.` },
    {
      value: chars >= 1e6 ? (chars / 1e6).toFixed(1) : chars.toLocaleString(),
      unit: chars >= 1e6 ? "million letters" : "letters",
      note: "and each one is a token. The model reads letter by letter, never by word.",
    },
  ];
  return (
    <div className="grid gap-px overflow-hidden rounded-xl bg-border/60 ring-1 ring-border/60 sm:grid-cols-3">
      {figures.map((f) => (
        <div key={f.unit} className="bg-card px-5 py-5">
          <p className="font-garamond leading-none [font-variant-numeric:lining-nums_tabular-nums]">
            <span className="text-[2.6rem] text-foreground">{f.value}</span> <span className="text-lg italic text-muted-foreground">{f.unit}</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.note}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * The whole vocabulary as a type case: one sort per symbol, commonest first,
 * each inked as heavily as it is used.
 */
export function TypeCase({ t }: { t: Corpus }) {
  const [symbols, setSymbols] = useState<[string, number][] | null>(null);
  useEffect(() => {
    let live = true;
    setSymbols(null);
    invoke<[string, number][]>("corpus_alphabet", { version: t.id }).then(
      (s) => live && setSymbols(s),
      () => live && setSymbols([]),
    );
    return () => {
      live = false;
    };
  }, [t.id]);

  const total = symbols?.reduce((a, [, n]) => a + n, 0) ?? 0;
  const top = symbols?.[0]?.[1] ?? 1;
  const commonest = symbols?.find(([c]) => /\p{L}/u.test(c));
  return (
    <Panel title="Its whole alphabet" meta={symbols?.length ? `${symbols.length} symbols` : t.name}>
      {symbols === null ? (
        <p className="text-sm text-muted-foreground">Counting every letter…</p>
      ) : symbols.length === 0 ? (
        <p className="text-sm text-muted-foreground">Download the translation to see its letters.</p>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.6rem,1fr))] gap-1">
            {symbols.map(([c, n]) => {
              // Ink by use, on a square-root scale so the rare sorts still show.
              const ink = 0.32 + 0.68 * Math.sqrt(n / top);
              return (
                <Tooltip key={c}>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      className="relative grid aspect-square place-items-center rounded-md bg-foreground/[0.035] ring-1 ring-foreground/6 transition-colors hover:bg-foreground/10"
                    >
                      <span className="font-garamond text-2xl leading-none text-foreground" style={{ opacity: ink }}>
                        {SHOWN[c] ?? c}
                      </span>
                      <span className="absolute inset-x-1.5 bottom-1 h-0.5 rounded-full bg-foreground/10">
                        <span className="block h-full rounded-full bg-foreground/45" style={{ width: `${Math.max(4, (n / top) * 100)}%` }} />
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {NAMED[c] ?? `“${c}”`}: {n.toLocaleString()} times, {((n / total) * 100).toFixed(n / total < 0.001 ? 3 : 1)}%
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Every symbol the model can ever write, most used first. It learns which follows which, and nothing else.
            {commonest && total ? ` One letter in ${Math.round(total / commonest[1])} is “${commonest[0]}”.` : ""}
          </p>
        </>
      )}
    </Panel>
  );
}

const BIBLELM_PARAMS = 10.8e6;
const GPT3_PARAMS = 175e9;

/** BibleLM as one dot; GPT-3 as the square of all of them. */
export function ScaleField({ dataMb, vocabSize }: { dataMb: number; vocabSize?: number }) {
  const ratio = Math.round(GPT3_PARAMS / BIBLELM_PARAMS);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const { paletteEpoch, resolvedMode } = useTheme();

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !width) return;
    const dpr = window.devicePixelRatio || 1;
    // A dot and a gap, in whole device pixels, so every one of them shows.
    const pitch = Math.max(2, Math.round(2 * dpr));
    const dot = pitch - Math.max(1, Math.round(dpr / 2));
    const cols = Math.floor((width * dpr) / pitch);
    const rows = Math.ceil(ratio / cols);
    cv.width = cols * pitch;
    cv.height = rows * pitch;
    cv.style.width = `${(cols * pitch) / dpr}px`;
    cv.style.height = `${(rows * pitch) / dpr}px`;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = resolveCssColor("var(--foreground)");
    ctx.globalAlpha = resolvedMode === "dark" ? 0.4 : 0.45;
    for (let i = 1; i < ratio; i++) ctx.fillRect((i % cols) * pitch, Math.floor(i / cols) * pitch, dot, dot);
    ctx.globalAlpha = 1;
    ctx.fillStyle = resolveCssColor("var(--brand)");
    ctx.fillRect(0, 0, dot, dot);
  }, [width, ratio, paletteEpoch, resolvedMode]);

  const rows: [string, string, string][] = [
    ["Parameters", "10.8M", "175B"],
    ["Layers", "6", "96"],
    ["Embedding width", "384", "12,288"],
    ["Context window", "256", "2,048"],
    ["Vocabulary", vocabSize ? vocabSize.toLocaleString() : "–", "50,257"],
    ["Training text", `${dataMb.toFixed(1)} MB`, "~570 GB"],
  ];
  return (
    <Panel title="To scale" meta="BibleLM beside GPT-3">
      <div ref={box} className="relative">
        <canvas ref={canvas} aria-label={`One dot among ${ratio.toLocaleString()}`} role="img" className="block" style={{ imageRendering: "pixelated" }} />
        <span aria-hidden className="pointer-events-none absolute -left-1 -top-1 size-3 rounded-full ring-1 ring-brand" />
      </div>
      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <p className="text-sm leading-relaxed text-muted-foreground">
          The ringed dot in the corner is BibleLM. Every dot in the field together, <span className="font-medium text-foreground">{ratio.toLocaleString()}</span> of them,
          is GPT-3, which also read about 130,000 times the text. BibleLM is teaching scale: small enough to train in minutes and watch it learn.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-1.5 text-left font-normal" />
              <th className="pb-1.5 text-right font-medium text-foreground">BibleLM</th>
              <th className="pb-1.5 text-right font-normal">GPT-3</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, a, b]) => (
              <tr key={label} className="border-t border-border/40">
                <td className="py-1.5 text-muted-foreground">{label}</td>
                <td className="py-1.5 text-right font-mono tabular-nums text-foreground">{a}</td>
                <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

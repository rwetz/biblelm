// Links: the cross-reference graph seen whole.
//   Arcs         every chapter of the 66 books along a line, an arc for each
//                strongly linked pair of chapters (after Chris Harrison's 2008
//                visualisation, here live: hover a book to light its arcs).
//   Communities  clusters of passages that keep pointing at each other
//                (Louvain with Leiden's connectivity guarantee, built offline).

import { useEffect, useMemo, useRef, useState } from "react";
import { SectionLabel, Spinner, useTheme } from "@nexis/design";
import { cssColor } from "@/art/painting";
import type { Translation, VerseIndex } from "@/lib/bible";
import { BOOKS, bookName, formatRef } from "@/lib/canon";
import { useGraph } from "@/lib/hooks";
import { chapterArcs, loadCommunities, type Community } from "@/lib/xrefs";
import { useStudy } from "@/store/study";

export function Links({ t, index }: { t: Translation; index: VerseIndex }) {
  const [g] = useGraph();
  const [comms, setComms] = useState<Community[] | null | undefined>(undefined);
  const [open, setOpen] = useState<number | null>(null);
  const read = useStudy((s) => s.read);
  useEffect(() => {
    loadCommunities().then(setComms, () => setComms(null));
  }, []);

  // Chapters of the 66 books in order, and each verse's chapter.
  const { chapters, chapterOf } = useMemo(() => {
    const canon = new Set(BOOKS.filter((b) => b.shelf === "protestant").map((b) => b.osis));
    const chapters: { book: string; chapter: number }[] = [];
    const key = new Map<string, number>();
    const chapterOf = new Int32Array(index.refs.length).fill(-1);
    index.refs.forEach((r, i) => {
      const [b, c] = r.split(".");
      if (!canon.has(b)) return;
      const k = `${b}.${c}`;
      let n = key.get(k);
      if (n === undefined) {
        n = chapters.length;
        key.set(k, n);
        chapters.push({ book: b, chapter: +c });
      }
      chapterOf[i] = n;
    });
    return { chapters, chapterOf };
  }, [index]);
  const arcs = useMemo(() => (g ? chapterArcs(g, chapterOf) : null), [g, chapterOf]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-8 py-6">
        <SectionLabel>Every cross reference at once</SectionLabel>
        <p className="mt-1 text-sm text-muted-foreground">
          The {chapters.length.toLocaleString()} chapters from Genesis to Revelation along the line; each arc joins two chapters readers linked. Hover a book to light its links; click to read.
        </p>
        {arcs ? <ArcDiagram arcs={arcs} chapters={chapters} onRead={(c) => read({ book: c.book, chapter: c.chapter, verse: 0 })} /> : <div className="grid h-72 place-items-center"><Spinner /></div>}

        <SectionLabel className="mt-10">Communities</SectionLabel>
        <p className="mt-1 text-sm text-muted-foreground">
          Passages that keep pointing at each other, found without anyone naming them (Louvain clustering, every community kept connected as Leiden requires).
          The topic beside each is the readers' topic that best covers it.
        </p>
        {comms === undefined ? (
          <Spinner />
        ) : comms === null ? (
          <p className="mt-2 text-sm text-muted-foreground">Not built yet: run node scripts/data/graph.mjs.</p>
        ) : (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {comms.slice(0, 60).map((c) => (
              <div key={c.id} className="rounded-lg border border-border/60 p-3">
                <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} className="w-full text-left">
                  <span className="font-garamond text-lg">{c.books.slice(0, 3).map(([b]) => bookName(b)).join(", ")}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.size} verses{c.topic ? ` · readers' topic: ${c.topic}` : ""}
                  </span>
                </button>
                {open === c.id && (
                  <ul className="mt-2 space-y-1">
                    {c.verses.slice(0, 12).map((v) => {
                      const r = index.ref(v);
                      return (
                        <li key={v}>
                          <button type="button" onClick={() => read(r, { select: true })} className="block w-full rounded px-1 py-0.5 text-left hover:bg-muted/60">
                            <span className="text-xs font-semibold text-brand">{formatRef(r)}</span>{" "}
                            <span className="font-garamond text-[15px]">{t.verse(r)?.text ?? ""}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArcDiagram({ arcs, chapters, onRead }: { arcs: [number, number, number][]; chapters: { book: string; chapter: number }[]; onRead: (c: { book: string; chapter: number }) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [hover, setHover] = useState<string | null>(null);
  const { paletteEpoch } = useTheme();
  const H = 340;
  const books = useMemo(() => {
    const out: { book: string; from: number; to: number }[] = [];
    chapters.forEach((c, i) => {
      const last = out[out.length - 1];
      if (last?.book === c.book) last.to = i;
      else out.push({ book: c.book, from: i, to: i });
    });
    return out;
  }, [chapters]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const x = (i: number) => 8 + (i / (chapters.length - 1)) * (width - 16);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = width * dpr;
    cv.height = H * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, H);
    const [r, g, b] = cssColor(cv, "var(--foreground)");
    const [br, bg, bb] = cssColor(cv, "var(--brand)");
    const base = H - 24;
    const max = arcs[0]?.[2] ?? 1;
    const lit = hover ? books.find((k) => k.book === hover) : null;
    const isLit = (c: number) => !!lit && c >= lit.from && c <= lit.to;
    // Long arcs (Old to New) above, drawn faint; lit ones on top.
    for (const pass of [0, 1]) {
      for (const [a, z, v] of arcs) {
        const on = isLit(a) || isLit(z);
        if ((pass === 1) !== on) continue;
        const xa = x(a), xz = x(z);
        const alpha = on ? 0.25 + 0.6 * Math.sqrt(v / max) : (hover ? 0.015 : 0.03) + 0.25 * Math.sqrt(v / max);
        ctx.strokeStyle = on ? `rgba(${br},${bg},${bb},${alpha})` : `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = on ? 0.9 : 0.6;
        // Arcs as half-ellipses, heights scaled so Genesis to Revelation just fits.
        const rx = Math.abs(xz - xa) / 2;
        ctx.beginPath();
        ctx.ellipse((xa + xz) / 2, base, rx, (rx / ((width - 16) / 2)) * (base - 6), 0, Math.PI, 2 * Math.PI);
        ctx.stroke();
      }
    }
    // The baseline, a tick per book, testament divide.
    ctx.fillStyle = `rgba(${r},${g},${b},0.6)`;
    for (const k of books) ctx.fillRect(x(k.from), base + 2, Math.max(1, x(k.to) - x(k.from)), k.book === hover ? 4 : 2);
  }, [arcs, books, width, hover, paletteEpoch]);

  const at = (e: React.MouseEvent) => {
    const rect = canvas.current!.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left - 8) / (width - 16)) * (chapters.length - 1));
    return chapters[Math.max(0, Math.min(chapters.length - 1, i))];
  };

  return (
    <div ref={box} className="relative mt-4">
      <canvas
        ref={canvas}
        style={{ width, height: H }}
        className="cursor-pointer"
        onMouseMove={(e) => setHover(at(e).book)}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => onRead(at(e))}
        role="img"
        aria-label="Arc diagram of cross references between chapters"
      />
      <div className="pointer-events-none absolute bottom-0 left-0 h-5 w-full text-[10px] text-muted-foreground">
        <span className="absolute left-2">Genesis</span>
        <span className="absolute -translate-x-1/2" style={{ left: x(books.find((b) => b.book === "Matt")?.from ?? 0) }}>Matthew</span>
        <span className="absolute right-2">Revelation</span>
        {hover && (
          <span className="absolute -translate-x-1/2 font-medium text-brand" style={{ left: x(((books.find((b) => b.book === hover)?.from ?? 0) + (books.find((b) => b.book === hover)?.to ?? 0)) / 2), top: -14 }}>
            {bookName(hover)}
          </span>
        )}
      </div>
    </div>
  );
}

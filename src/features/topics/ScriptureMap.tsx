import { useEffect, useMemo, useRef, useState } from "react";
import { resolveCssColor, Spinner, useTheme } from "@nexis/design";
import { getBinary, type Translation, type VerseIndex } from "@/lib/bible";
import { book, formatRef } from "@/lib/canon";
import { genreOf } from "@/lib/jev";
import { useStudy } from "@/store/study";

// Every verse as a star, placed by meaning: the embedding vectors projected to
// 2D with UMAP (scripts/data/embed.mjs). Verses that say similar things sit
// together, whatever book they are in. Colours mark genre.

const GENRES = ["Law", "History", "Wisdom and poetry", "Prophets", "Gospels", "Acts", "Epistles", "Apocalyptic"];
const TONES = ["--brand", "--warning", "--success", "--info", "--terminal-ansi-magenta", "--terminal-ansi-cyan", "--primary", "--terminal-ansi-bright-yellow"];

export function ScriptureMap({ t, index }: { t: Translation; index: VerseIndex }) {
  const [pos, setPos] = useState<Uint16Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { paletteEpoch } = useTheme();
  const shelves = useStudy((s) => s.shelves);
  const read = useStudy((s) => s.read);

  useEffect(() => {
    getBinary("map.u16").then((b) => setPos(new Uint16Array(b)), (e) => setError(String(e.message ?? e)));
  }, []);

  const genre = useMemo(() => index.refs.map((r) => GENRES.indexOf(genreOf(r.split(".")[0]))), [index]);
  const visible = useMemo(() => index.refs.map((r) => shelves.includes(book(r.split(".")[0])?.shelf ?? "protestant")), [index, shelves]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !pos) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = w * dpr;
    cv.height = h * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const colors = TONES.map((v) => resolveCssColor(`var(${v})`));
    const pad = 24;
    for (let i = 0; i < index.refs.length; i++) {
      if (!visible[i]) continue;
      const g = genre[i];
      const dim = focus !== null && GENRES[g] !== focus;
      ctx.globalAlpha = dim ? 0.06 : 0.55;
      ctx.fillStyle = colors[g] ?? colors[0];
      const x = pad + (pos[i * 2] / 65535) * (w - pad * 2);
      const y = pad + (pos[i * 2 + 1] / 65535) * (h - pad * 2);
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }, [pos, genre, visible, focus, paletteEpoch, index]);

  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!pos) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const pad = 24;
    const mx = ((e.clientX - rect.left - pad) / (rect.width - pad * 2)) * 65535;
    const my = ((e.clientY - rect.top - pad) / (rect.height - pad * 2)) * 65535;
    let best = -1, bd = Infinity;
    for (let i = 0; i < index.refs.length; i++) {
      if (!visible[i]) continue;
      const dx = pos[i * 2] - mx, dy = pos[i * 2 + 1] - my;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return Math.sqrt(bd) < 1200 ? best : null;
  };

  if (error) return <p className="p-8 text-sm text-muted-foreground">The map is built with the semantic index: run <code className="font-mono">pnpm data:embed</code>. ({error})</p>;
  if (!pos) return <div className="grid flex-1 place-items-center"><Spinner /></div>;
  const hv = hover !== null ? index.ref(hover) : null;
  return (
    <div className="relative flex min-h-0 flex-1">
      <canvas
        ref={canvas}
        className="h-full w-full cursor-crosshair"
        onMouseMove={(e) => setHover(pick(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => { const i = pick(e); if (i !== null) read(index.ref(i), { select: true }); }}
      />
      <div className="absolute left-6 top-4 flex max-w-xs flex-wrap gap-1.5">
        {GENRES.map((g, i) => (
          <button
            key={g}
            type="button"
            onClick={() => setFocus(focus === g ? null : g)}
            className={`inline-flex items-center gap-1.5 rounded-full bg-card/80 px-2 py-0.5 text-[11px] ring-1 ring-foreground/8 backdrop-blur ${focus === g ? "text-foreground" : "text-muted-foreground"}`}
          >
            <span className="size-2 rounded-full" style={{ background: `var(${TONES[i]})` }} />
            {g}
          </button>
        ))}
      </div>
      {hv && (
        <div className="pointer-events-none absolute bottom-6 left-6 max-w-md rounded-xl bg-card/90 p-3 shadow-sm ring-1 ring-foreground/8 backdrop-blur">
          <p className="text-xs font-semibold text-brand">{formatRef(hv)}</p>
          <p className="mt-1 font-garamond text-[15px] leading-6">{t.verse(hv)?.text ?? index.refs[hover!]}</p>
        </div>
      )}
      <p className="absolute bottom-2 right-4 text-[10px] text-muted-foreground/70">Each dot is a verse, placed by meaning (bge-small embeddings, UMAP). Click to read.</p>
    </div>
  );
}

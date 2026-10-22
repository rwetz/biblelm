import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Icon, resolveCssColor, Spinner, Tooltip, TooltipContent, TooltipTrigger, useTheme } from "@nexis/design";
import { getBinary, type Translation, type VerseIndex } from "@/lib/bible";
import { book, bookName, formatRef, parseRef } from "@/lib/canon";
import { genreOf } from "@/lib/jev";
import { useStudy } from "@/store/study";
import { SearchField } from "@/app/controls";

// Every verse as a star, placed by meaning: the embedding vectors projected to
// 2D with UMAP (scripts/data/embed.mjs). Verses that say similar things sit
// together, whatever book they are in. Colours mark genre.
//
// Wheel or the buttons zoom around the cursor, drag pans, and labels name the
// densest places on screen: books from far away, book and chapter closer in,
// and close enough every verse carries its own reference and then its opening
// words. Hovering a verse threads its chapter through the map in reading
// order, so you can see a chapter wander from one kind of saying to another.

const GENRES = ["Law", "History", "Wisdom and poetry", "Prophets", "Gospels", "Acts", "Epistles", "Apocalyptic"];
const TONES = ["--brand", "--warning", "--success", "--info", "--terminal-ansi-magenta", "--terminal-ansi-cyan", "--primary", "--terminal-ansi-bright-yellow"];
const PAD = 24;
const MIN_K = 1, MAX_K = 120;
/** Zoom at which each verse is labelled, then also quoted. */
const NODE_K = 10, QUOTE_K = 22;
const dotSize = (k: number) => Math.min(9, 1.6 * Math.sqrt(k));
type Box = [number, number, number, number];

/** Pan and zoom: screen = fit(world) * k + (x, y). */
type View = { k: number; x: number; y: number };
const HOME: View = { k: 1, x: 0, y: 0 };

export function ScriptureMap({ t, index }: { t: Translation; index: VerseIndex }) {
  const [pos, setPos] = useState<Uint16Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [focusBook, setFocusBook] = useState<string | null>(null);
  const [find, setFind] = useState("");
  const [view, setView] = useState<View>(HOME);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  /** Verse labels drawn last frame, so a label can be clicked as well as its dot. */
  const labelBoxes = useRef<{ i: number; r: Box }[]>([]);
  const { paletteEpoch } = useTheme();
  const shelves = useStudy((s) => s.shelves);
  const read = useStudy((s) => s.read);

  useEffect(() => {
    getBinary("map.u16").then((b) => setPos(new Uint16Array(b)), (e) => setError(String(e.message ?? e)));
  }, []);

  const books = useMemo(() => index.refs.map((r) => r.split(".")[0]), [index]);
  const genre = useMemo(() => books.map((b) => GENRES.indexOf(genreOf(b))), [books]);
  const visible = useMemo(() => books.map((b) => shelves.includes(book(b)?.shelf ?? "protestant")), [books, shelves]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ro = new ResizeObserver(() => setSize({ w: cv.clientWidth, h: cv.clientHeight }));
    ro.observe(cv);
    return () => ro.disconnect();
  }, [pos]);

  // World (0..65535) to screen and back.
  const sx = useCallback((u: number) => (PAD + (u / 65535) * (size.w - PAD * 2)) * view.k + view.x, [size.w, view]);
  const sy = useCallback((u: number) => (PAD + (u / 65535) * (size.h - PAD * 2)) * view.k + view.y, [size.h, view]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !pos || !size.w) return;
    const raf = requestAnimationFrame(() => {
      const { w, h } = size;
      const dpr = window.devicePixelRatio || 1;
      cv.width = w * dpr;
      cv.height = h * dpr;
      const ctx = cv.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      const colors = TONES.map((v) => resolveCssColor(`var(${v})`));
      const dot = dotSize(view.k);
      const round = dot >= 3;
      const nodes = view.k >= NODE_K;
      // Labels: bin what is on screen into cells and name each dense cell by
      // its commonest book (and chapter, once close enough to tell).
      const deep = view.k >= 5;
      const cell = 130;
      const bins = new Map<number, { n: number; sx: number; sy: number; by: Map<string, number> }>();
      const near: number[] = [];
      for (let i = 0; i < books.length; i++) {
        if (!visible[i]) continue;
        const x = sx(pos[i * 2]), y = sy(pos[i * 2 + 1]);
        if (x < -10 || y < -10 || x > w + 10 || y > h + 10) continue;
        const g = genre[i];
        const dim = (focus !== null && GENRES[g] !== focus) || (focusBook !== null && books[i] !== focusBook);
        ctx.globalAlpha = dim ? 0.06 : round ? 0.85 : 0.6;
        ctx.fillStyle = colors[g] ?? colors[0];
        if (round) {
          ctx.beginPath();
          ctx.arc(x, y, dot / 2, 0, Math.PI * 2);
          ctx.fill();
        } else ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot);
        if (dim) continue;
        if (nodes) {
          near.push(i);
          continue;
        }
        const key = Math.floor(x / cell) * 10007 + Math.floor(y / cell);
        let b = bins.get(key);
        if (!b) bins.set(key, (b = { n: 0, sx: 0, sy: 0, by: new Map() }));
        b.n++;
        b.sx += x;
        b.sy += y;
        const name = deep ? index.refs[i].split(".").slice(0, 2).join(".") : books[i];
        b.by.set(name, (b.by.get(name) ?? 0) + 1);
      }
      ctx.globalAlpha = 1;
      const fg = resolveCssColor("var(--foreground)");
      const muted = resolveCssColor("var(--muted-foreground)");
      const bg = resolveCssColor("var(--background)");
      const sans = getComputedStyle(cv).fontFamily;
      const serif = `italic 13px "EB Garamond", Garamond, serif`;
      const halo = (text: string, x: number, y: number, color: string) => {
        ctx.lineWidth = 4;
        ctx.strokeStyle = bg;
        ctx.globalAlpha = 0.9;
        ctx.strokeText(text, x, y);
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
      };
      const placed: Box[] = [];
      const free = (r: Box) => !placed.some((p) => r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1]);

      // The hovered verse's chapter, threaded in reading order.
      if (hover !== null && visible[hover]) {
        const chap = index.refs[hover].split(".").slice(0, 2).join(".") + ".";
        let a = hover, z = hover;
        while (a > 0 && index.refs[a - 1].startsWith(chap)) a--;
        while (z < index.refs.length - 1 && index.refs[z + 1].startsWith(chap)) z++;
        ctx.beginPath();
        for (let i = a; i <= z; i++) {
          const x = sx(pos[i * 2]), y = sy(pos[i * 2 + 1]);
          if (i === a) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = fg;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = fg;
        for (let i = a; i <= z; i++) {
          ctx.beginPath();
          ctx.arc(sx(pos[i * 2]), sy(pos[i * 2 + 1]), i === hover ? Math.max(4, dot / 2 + 2.5) : 1.6, 0, Math.PI * 2);
          if (i === hover) {
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      labelBoxes.current = [];
      if (nodes) {
        // Every verse its own label, the hovered one and the middle of the screen first.
        const quote = view.k >= QUOTE_K && near.length < 160;
        const cx = w / 2, cy = h / 2;
        const order = near
          .map((i) => [i, (sx(pos[i * 2]) - cx) ** 2 + (sy(pos[i * 2 + 1]) - cy) ** 2] as const)
          .sort((a, b) => (a[0] === hover ? -1 : b[0] === hover ? 1 : a[1] - b[1]))
          .slice(0, 400);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        for (const [i] of order) {
          const x = sx(pos[i * 2]) + dot / 2 + 5, y = sy(pos[i * 2 + 1]);
          const ref = index.ref(i);
          const head = formatRef(ref);
          ctx.font = `600 11px ${sans}`;
          const hw = ctx.measureText(head).width;
          let words = "", ww = 0;
          if (quote) {
            const text = t.verse(ref)?.text ?? "";
            const cut = text.split(" ").slice(0, 7).join(" ");
            words = cut.length < text.length ? `${cut}…` : cut;
            ctx.font = serif;
            ww = ctx.measureText(words).width;
          }
          const r: Box = [x - dot - 6, y - 8, x + Math.max(hw, ww) + 4, y + (quote ? 22 : 8)];
          if (!free(r)) continue;
          placed.push(r);
          labelBoxes.current.push({ i, r });
          ctx.font = `600 11px ${sans}`;
          halo(head, x, y, i === hover ? fg : (colors[genre[i]] ?? fg));
          if (quote) {
            ctx.font = serif;
            halo(words, x, y + 14, i === hover ? fg : muted);
          }
        }
      } else {
        ctx.font = `500 12px ${sans}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const minN = deep ? 5 : 24;
        for (const b of [...bins.values()].sort((a, z) => z.n - a.n)) {
          if (b.n < minN) break;
          const [top, count] = [...b.by.entries()].sort((a, z) => z[1] - a[1])[0];
          if (count / b.n < 0.22) continue;
          const [bk, ch] = top.split(".");
          const label = deep ? `${bookName(bk)} ${ch}` : bookName(bk);
          const x = b.sx / b.n, y = b.sy / b.n;
          const tw = ctx.measureText(label).width + 12;
          const r: Box = [x - tw / 2, y - 10, x + tw / 2, y + 10];
          if (!free(r)) continue;
          placed.push(r);
          halo(label, x, y, fg);
          if (placed.length > 40) break;
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [pos, genre, books, visible, focus, focusBook, paletteEpoch, index, size, view, sx, sy, hover, t]);

  const pick = (e: React.PointerEvent | React.MouseEvent) => {
    if (!pos || !canvas.current) return null;
    const rect = canvas.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const label = labelBoxes.current.find(({ r }) => mx >= r[0] && mx <= r[2] && my >= r[1] && my <= r[3]);
    if (label) return label.i;
    // The reach grows with the dots, so a close-in verse is easy to hit.
    const reach = dotSize(view.k) / 2 + 9;
    let best = -1, bd = Infinity;
    for (let i = 0; i < books.length; i++) {
      if (!visible[i]) continue;
      const dx = sx(pos[i * 2]) - mx, dy = sy(pos[i * 2 + 1]) - my;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return bd < reach * reach ? best : null;
  };

  /** Zoom by a factor around a screen point. */
  const zoomAt = (factor: number, px: number, py: number) =>
    setView((v) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      const f = k / v.k;
      return k === MIN_K ? HOME : { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
    });

  // React's onWheel is passive, so the page would scroll too: listen directly.
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = cv.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    };
    cv.addEventListener("wheel", onWheel, { passive: false });
    return () => cv.removeEventListener("wheel", onWheel);
  }, [pos]);

  /** Fly to a book: fit the middle 90% of its verses. */
  const goToBook = (osis: string) => {
    if (!pos || !size.w) return;
    const xs: number[] = [], ys: number[] = [];
    for (let i = 0; i < books.length; i++) if (books[i] === osis) { xs.push(pos[i * 2]); ys.push(pos[i * 2 + 1]); }
    if (!xs.length) return;
    const q = (a: number[], p: number) => a.sort((m, n) => m - n)[Math.floor((a.length - 1) * p)];
    const fx = (u: number) => PAD + (u / 65535) * (size.w - PAD * 2);
    const fy = (u: number) => PAD + (u / 65535) * (size.h - PAD * 2);
    const x0 = fx(q(xs, 0.05)), x1 = fx(q(xs, 0.95)), y0 = fy(q(ys, 0.05)), y1 = fy(q(ys, 0.95));
    const k = Math.min(MAX_K, Math.max(MIN_K, Math.min(size.w / Math.max(40, x1 - x0), size.h / Math.max(40, y1 - y0)) * 0.6));
    setView({ k, x: size.w / 2 - ((x0 + x1) / 2) * k, y: size.h / 2 - ((y0 + y1) / 2) * k });
    setFocusBook(osis);
    setFocus(null);
  };

  if (error) return <p className="p-8 text-sm text-muted-foreground">The map is built with the semantic index: run <code className="font-mono">pnpm data:embed</code>. ({error})</p>;
  if (!pos) return <div className="grid flex-1 place-items-center"><Spinner /></div>;
  const hv = hover !== null ? index.ref(hover) : null;
  const zoomButton = (icon: "zoom-in" | "zoom-out", label: string, factor: number) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="secondary" size="icon-sm" aria-label={label} onClick={() => zoomAt(factor, size.w / 2, size.h / 2)}>
          <Icon name={icon} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <canvas
        ref={canvas}
        className={`h-full w-full touch-none font-sans ${dragging ? "cursor-grabbing" : hover !== null ? "cursor-pointer" : "cursor-grab"}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) {
            const dx = e.clientX - d.x, dy = e.clientY - d.y;
            if (!d.moved && dx * dx + dy * dy < 16) return;
            d.moved = true;
            setDragging(true);
            setHover(null);
            setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
          } else setHover(pick(e));
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          setDragging(false);
          if (d && !d.moved) {
            const i = pick(e);
            if (i !== null) read(index.ref(i), { select: true });
          }
        }}
        onPointerLeave={() => !drag.current && setHover(null)}
        onDoubleClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          zoomAt(2, e.clientX - rect.left, e.clientY - rect.top);
        }}
      />
      <div className="absolute left-6 top-4 flex max-w-sm flex-col gap-2">
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const r = parseRef(`${find.trim()} 1`);
            if (r) goToBook(r.book);
          }}
        >
          <SearchField size="sm" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a book, e.g. Psalms" className="w-56 bg-card/90 backdrop-blur-sm" />
          {focusBook && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setFocusBook(null); setFind(""); }}>
              Show all
            </Button>
          )}
        </form>
        <div className="flex flex-wrap gap-1.5">
          {GENRES.map((g, i) => (
            <button
              key={g}
              type="button"
              onClick={() => { setFocus(focus === g ? null : g); setFocusBook(null); }}
              className={`inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2 py-0.5 text-[11px] ring-1 ring-foreground/8 transition-colors hover:text-foreground ${focus === g ? "text-foreground ring-foreground/30" : "text-muted-foreground"}`}
            >
              <span className="size-2 rounded-full" style={{ background: `var(${TONES[i]})` }} />
              {g}
            </button>
          ))}
        </div>
      </div>
      <div className="absolute right-4 top-4 flex flex-col gap-1.5">
        {zoomButton("zoom-in", "Zoom in", 1.6)}
        {zoomButton("zoom-out", "Zoom out", 1 / 1.6)}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon-sm" aria-label="Show the whole map" onClick={() => setView(HOME)} disabled={view === HOME}>
              <Icon name="refresh" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Show the whole map</TooltipContent>
        </Tooltip>
      </div>
      {hv && (
        <div className="pointer-events-none absolute bottom-6 left-6 max-w-md rounded-xl bg-card/95 p-3 shadow-sm ring-1 ring-foreground/8">
          <p className="text-xs font-semibold text-brand">{formatRef(hv)}</p>
          <p className="mt-1 font-garamond text-[15px] leading-6">{t.verse(hv)?.text ?? index.refs[hover!]}</p>
        </div>
      )}
      <p className="absolute bottom-2 right-4 text-[10px] text-muted-foreground/70">
        Each dot is a verse, placed by meaning. Zoom in to read them, hover one to trace its chapter, click to open it.
      </p>
    </div>
  );
}

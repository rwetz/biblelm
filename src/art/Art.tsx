// The three tiers of art (docs/ART.md): heroes (dithered, big, faded into
// the page), plates (Doré engravings beside a passage) and ornament. Anything
// small and decorative (corner plates, the sidebar vignette, empty-state spots)
// is dithered live in the theme's ink, so it never brings its own paper.

import { useEffect, useMemo, useRef, useState } from "react";
import { cn, useReducedMotion, useTheme } from "@nexis/design";
import { formatRef } from "@/lib/canon";
import { heroUrl, loadHeroes, loadLiterary, loadPlates, plateUrl, rotation, type Hero, type Plate } from "@/lib/art";
import { useStudy } from "@/store/study";
import { BAYER8, paintScattered, scatterSeeds, dither, fadeEdges, inkColor, loadImage, paint, toneGrid, type DitherAlgo, type Edges } from "./dither";

export function usePlates(): Plate[] {
  const [plates, setPlates] = useState<Plate[]>([]);
  useEffect(() => {
    let live = true;
    loadPlates().then((p) => live && setPlates(p));
    return () => {
      live = false;
    };
  }, []);
  return plates;
}

export function useHeroes(): Hero[] {
  const [h, setH] = useState<Hero[]>([]);
  useEffect(() => {
    let live = true;
    loadHeroes().then((x) => live && setH(x));
    return () => {
      live = false;
    };
  }, []);
  return h;
}

/** The Lab's literary heroes, one at a time, turning every `ms` (the same one in every view). */
export function useRotatingHero(ms = 30_000): Hero | undefined {
  const [list, setList] = useState<Hero[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let live = true;
    loadLiterary().then((x) => live && setList(x));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!list.length) return;
    // Wake at the next turn, not on a fixed interval, so every view agrees.
    const timer = window.setTimeout(() => setNow(Date.now()), ms - (Date.now() % ms) + 20);
    return () => clearTimeout(timer);
  }, [list, now, ms]);
  return list[rotation(list.length, ms, now)];
}

/** A Doré engraving, blended into the page (see .engraving in styles.css). */
export function Engraving({
  plate,
  size = "full",
  ghost = false,
  className,
  style,
}: {
  plate: Plate;
  size?: "full" | "thumb";
  /** Faint decoration: an inverted print in dark mode. */
  ghost?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const img = size === "thumb" ? plate.thumb : plate.full;
  return (
    <img
      src={plateUrl(img)}
      width={img.width}
      height={img.height}
      loading="lazy"
      decoding="async"
      draggable={false}
      alt={`${plate.title}, Gustave Doré, 1866`}
      className={cn("engraving h-auto max-w-full", ghost && "ghost", className)}
      style={style}
    />
  );
}

/** A plate beside its passage, with its caption, as in an illustrated Bible. */
export function PlateFigure({ plate, onOpenRef, className }: { plate: Plate; onOpenRef?: () => void; className?: string }) {
  return (
    <figure className={cn("my-6 break-inside-avoid", className)}>
      {/* Never wider than the scan itself: stretching a small plate is what blurs it. */}
      <Engraving plate={plate} className="mx-auto w-full" style={{ maxWidth: `min(34rem, ${plate.full.width}px)` }} />
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        <span className="font-garamond text-sm italic text-foreground">{plate.title}</span>
        {plate.ref && (
          <>
            {" · "}
            <button type="button" className="underline-offset-2 hover:underline" onClick={onOpenRef}>
              {formatRef(plate.ref)}
            </button>
          </>
        )}
        <span className="block opacity-70">Gustave Doré, 1866</span>
      </figcaption>
    </figure>
  );
}

/**
 * Live one-bit dots from a grayscale engraving, at exactly the drawn size.
 * Fills its box like `object-fit: cover`; re-dithers when the box resizes and
 * resolves dot by dot the first time each picture appears.
 */
export function Dither({
  src,
  algo = "atkinson",
  dot = 2,
  focusX = 50,
  focusY = 40,
  reveal = true,
  level = 1,
  edges,
  label,
  className,
  style,
  scatter,
}: {
  src: string;
  algo?: DitherAlgo;
  /** CSS pixels per dot (rounded to whole device pixels so dots stay square). */
  dot?: number;
  focusX?: number;
  focusY?: number;
  reveal?: boolean;
  /**
   * How much of the picture is resolved, 0 to 1. A change animates from the
   * level shown to the new one, evenly across the picture: a decision's
   * confidence can be drawn as how clearly the scene appears.
   */
  level?: number;
  /** Sides that thin out into the page, as dots rather than a blur. */
  edges?: Edges;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  /** A scrolling element: when it scrolls, the dots blow loose with it and gather again. */
  scatter?: HTMLElement | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { paletteEpoch, resolvedMode } = useTheme();
  // Light: draw the ink dots. Dark: draw the lit dots instead, so light stays
  // light and a night scene is not a negative.
  const dark = resolvedMode === "dark";
  const [size, setSize] = useState<[number, number] | null>(null);
  const revealed = useRef<string | null>(null);
  // The drawn state, so a new level can repaint without dithering again.
  const drawn = useRef<{ ctx: CanvasRenderingContext2D; out: ImageData; bits: Uint8Array; w: number; h: number; rgb: [number, number, number]; shown: number } | null>(null);
  const levelRef = useRef(level);
  levelRef.current = level;
  const edgeKey = JSON.stringify(edges ?? null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let timer = 0;
    const measure = () => setSize([el.clientWidth, el.clientHeight]);
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(measure, revealed.current ? 120 : 0);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const cv = canvas.current;
    if (!size || !cv || size[0] < 2 || size[1] < 2) return;
    let cancelled = false;
    let raf = 0;
    loadImage(src)
      .then((img) => {
        if (cancelled) return;
        const dpr = window.devicePixelRatio || 1;
        const cssDot = Math.max(1, Math.round(dot * dpr)) / dpr;
        const w = Math.ceil(size[0] / cssDot), h = Math.ceil(size[1] / cssDot);
        cv.width = w;
        cv.height = h;
        cv.style.width = `${w * cssDot}px`;
        cv.style.height = `${h * cssDot}px`;
        const tone = toneGrid(img, w, h, focusX, focusY);
        if (edges) fadeEdges(tone, w, h, edges, dark ? 0 : 255);
        const bits = dither(tone, w, h, algo);
        const ctx = cv.getContext("2d")!;
        const out = ctx.createImageData(w, h);
        const rgb = inkColor(cv);
        const animate = reveal && !reduced && revealed.current !== src;
        revealed.current = src;
        const target = levelRef.current;
        drawn.current = { ctx, out, bits, w, h, rgb, shown: target };
        if (!animate) return paint(ctx, out, bits, w, h, rgb, dark, target, target < 1 ? 0 : 0.35);
        const t0 = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - t0) / 1100);
          paint(ctx, out, bits, w, h, rgb, dark, t * target, target < 1 ? 0 : 0.35);
          if (t < 1 && !cancelled) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [size, src, algo, dot, focusX, focusY, reveal, edgeKey, reduced, paletteEpoch, dark]);

  // A new level: thin or thicken the dots evenly, over a quarter second.
  useEffect(() => {
    const d = drawn.current;
    if (!d || d.shown === level) return;
    const from = d.shown;
    if (reduced) {
      d.shown = level;
      return paint(d.ctx, d.out, d.bits, d.w, d.h, d.rgb, dark, level, 0);
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 260);
      d.shown = from + (level - from) * k;
      paint(d.ctx, d.out, d.bits, d.w, d.h, d.rgb, dark, d.shown, 0);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [level, reduced, dark]);

  // Scroll stirs the dots: each scroll adds to how far they are carried, and
  // they settle back home on their own, a little slower than they left.
  useEffect(() => {
    if (!scatter || reduced) return;
    let amp = 0, last = scatter.scrollTop, raf = 0;
    let seeds: [Float32Array, Float32Array] | null = null;
    const frame = () => {
      const d = drawn.current;
      raf = 0;
      if (!d) return;
      amp *= 0.9;
      if (Math.abs(amp) < 0.004) {
        amp = 0;
        return paint(d.ctx, d.out, d.bits, d.w, d.h, d.rgb, dark, d.shown, 0);
      }
      if (!seeds || seeds[0].length !== d.w * d.h) seeds = scatterSeeds(d.w * d.h);
      paintScattered(d.ctx, d.out, d.bits, d.w, d.h, d.rgb, dark, amp, seeds);
      raf = requestAnimationFrame(frame);
    };
    const onScroll = () => {
      const top = scatter.scrollTop;
      amp = Math.max(-1, Math.min(1, amp + (top - last) / 500));
      last = top;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    scatter.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scatter.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [scatter, reduced, dark]);

  return (
    <div ref={box} className={cn("relative overflow-hidden", className)} style={style}>
      <canvas
        ref={canvas}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className="absolute left-0 top-0"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}

/**
 * Tier 2: a quiet plate in a page's corner, in dots. It sits behind the page
 * (the host needs `isolate`), so text and cards always cover it.
 */
export function CornerPlate({
  plate,
  corner = "br",
  className,
  scatter,
}: {
  plate?: Plate;
  corner?: "br" | "tr" | "bl";
  className?: string;
  scatter?: HTMLElement | null;
}) {
  const mode = useStudy((s) => s.illustrations);
  if (!plate || mode === "off") return null;
  const pos = { br: "bottom-0 right-0", tr: "top-0 right-0", bl: "bottom-0 left-0" }[corner];
  return (
    <Dither
      src={plateUrl(plate.full)}
      algo="floyd"
      dot={1}
      focusY={30}
      edges={{ br: { top: 0.3, left: 0.3 }, tr: { bottom: 0.3, left: 0.3 }, bl: { top: 0.3, right: 0.3 } }[corner]}
      className={cn("pointer-events-none absolute -z-10 aspect-[4/5] w-[min(28%,20rem)] select-none text-muted-foreground opacity-80", pos, className)}
      scatter={scatter}
    />
  );
}

/**
 * A scrolling page with a corner plate pinned to the window, not the text: as
 * the page scrolls the plate's dots blow loose and gather again in the corner.
 */
export function PlatePage({
  plate,
  corner = "br",
  hidePlate = false,
  className,
  children,
}: {
  plate?: Plate;
  corner?: "br" | "tr" | "bl";
  hidePlate?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  return (
    <div className="relative isolate flex min-h-0 flex-1 flex-col">
      {!hidePlate && <CornerPlate plate={plate} corner={corner} scatter={scroller} />}
      <div ref={setScroller} className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", className)}>
        {children}
      </div>
    </div>
  );
}

/**
 * A spot illustration for an empty state: a small dithered plate faded into
 * the page, with the words underneath.
 */
export function ArtSpot({ plate, title, children, className }: { plate?: Plate; title: React.ReactNode; children?: React.ReactNode; className?: string }) {
  const mode = useStudy((s) => s.illustrations);
  const art = plate && mode !== "off";
  return (
    <div className={cn("mx-auto flex max-w-sm flex-col items-center text-center", className)}>
      {art && (
        <Dither
          src={plateUrl(plate.full)}
          algo="floyd"
          dot={1}
          focusY={35}
          label={`${plate.title}, after Gustave Doré`}
          edges={{ top: 0.08, right: 0.08, bottom: 0.08, left: 0.08 }}
          className="mb-4 aspect-[4/5] w-48 text-foreground/85"
        />
      )}
      <p className="font-garamond text-xl text-foreground">{title}</p>
      {children && <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</div>}
      {art && <p className="mt-3 font-garamond text-xs italic text-muted-foreground/70">{plate.title}, after Doré</p>}
    </div>
  );
}

/**
 * Tier 1: a dithered hero, faded into the page. `width` frames the picture in
 * a centred window (its sides fade) so more of a portrait plate shows on a
 * wide screen; `clearLeft` keeps the left of the band paper for a title.
 */
export function DitherHero({
  hero,
  className,
  height = "58vh",
  focusY = 38,
  width,
  clearLeft = false,
  fadeFrom = 55,
  caption = true,
  children,
}: {
  hero?: Hero;
  className?: string;
  height?: string;
  /** Vertical focus of the crop, in percent: Doré's plates are portrait. */
  focusY?: number;
  /** Max width of the picture window, e.g. "72rem". Full-bleed when unset. */
  width?: string;
  clearLeft?: boolean;
  /** Where the fade into the page begins, in percent of the height. */
  fadeFrom?: number;
  caption?: boolean;
  children?: React.ReactNode;
}) {
  const mode = useStudy((s) => s.illustrations);
  const show = hero && mode === "full";
  // Every edge breaks up into dots (fadeEdges), never a blur.
  const side = width ? 0.1 : 0;
  const edges: Edges = { bottom: 1 - fadeFrom / 100, right: side, left: clearLeft ? 0.85 : side };
  return (
    <div className={cn("relative w-full shrink-0 overflow-hidden", className)} style={{ height }}>
      {show && (
        <Dither
          src={heroUrl(hero!)}
          algo={hero!.algo === "bayer" ? "bayer" : "atkinson"}
          focusY={focusY}
          label={`${hero!.title}, after Gustave Doré`}
          edges={edges}
          key={hero!.id}
          className="absolute inset-y-0 left-1/2 w-full -translate-x-1/2 text-foreground opacity-90 dark:opacity-80"
          style={{ maxWidth: width }}
        />
      )}
      {show && caption && (
        <span className="pointer-events-none absolute bottom-2 right-6 z-20 font-garamond text-xs italic text-muted-foreground">
          {hero!.title}, {hero!.work ? `from ${hero!.work}, ` : ""}after Gustave Doré
        </span>
      )}
      {children && <div className="relative z-10 flex h-full flex-col">{children}</div>}
    </div>
  );
}

/**
 * A loader for long work: a cross gathering out of dots and dissolving again,
 * light running down it. Reduced motion shows the cross at rest.
 */
export function CrossLoader({ size = 48, className, label = "Working" }: { size?: number; className?: string; label?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { paletteEpoch } = useTheme();
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const n = Math.max(12, Math.round(size / 2));
    cv.width = n;
    cv.height = n;
    const ctx = cv.getContext("2d")!;
    const out = ctx.createImageData(n, n);
    const rgb = inkColor(cv);
    // Brightness: a Latin cross (the beam a third of the way down) in a soft glow.
    const glow = new Float32Array(n * n);
    const arm = n * 0.08, cx = (n - 1) / 2, beam = n * 0.32;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const dv = Math.max(Math.abs(x - cx) - arm, n * 0.06 - y, y - n * 0.94, 0);
        const dh = Math.max(Math.abs(y - beam) - arm, Math.abs(x - cx) - n * 0.3, 0);
        const d = Math.min(dv, dh);
        glow[y * n + x] = d <= 0 ? 1 : Math.max(0, 0.5 - d / (n * 0.2));
      }
    const frame = (time: number) => {
      const d = out.data;
      for (let y = 0, i = 0; y < n; y++)
        for (let x = 0; x < n; x++, i++) {
          const wave = reduced ? 1 : 0.5 - 0.5 * Math.cos(time / 420 - (y / n) * 2.6);
          const rank = BAYER8[(y & 7) * 8 + (x & 7)] / 64;
          const on = glow[i] >= 1 ? rank < 0.3 + 0.7 * wave : rank < glow[i] * wave;
          d[i * 4] = rgb[0];
          d[i * 4 + 1] = rgb[1];
          d[i * 4 + 2] = rgb[2];
          d[i * 4 + 3] = on ? 255 : 0;
        }
      ctx.putImageData(out, 0, 0);
    };
    if (reduced) return frame(0);
    let raf = 0;
    const step = (now: number) => {
      frame(now);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [size, reduced, paletteEpoch]);
  return (
    <canvas
      ref={canvas}
      role="progressbar"
      aria-label={label}
      className={cn("shrink-0 text-brand", className)}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}

/** The heptagram: seven points for the seven days, drawn in the accent. */
export function Heptagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden>
      <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" />
      <polygon
        points="50,12 87.1,58.5 33.5,84.2 20.3,26.3 79.7,26.3 66.5,84.2 12.9,58.5"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

/** A fleuron between sections. */
export function Fleuron({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("my-8 flex items-center justify-center gap-3 text-muted-foreground/60", className)}>
      <span className="h-px w-16 bg-current" />
      <svg viewBox="0 0 40 16" className="h-4 w-10" fill="currentColor">
        <path d="M20 1 L24 8 L20 15 L16 8 Z" />
        <circle cx="9" cy="8" r="1.6" />
        <circle cx="31" cy="8" r="1.6" />
        <circle cx="3" cy="8" r="0.9" />
        <circle cx="37" cy="8" r="0.9" />
      </svg>
      <span className="h-px w-16 bg-current" />
    </div>
  );
}

/** Pick the plate for a page's corner from PAGE_PLATES. */
export function usePagePlate(n: number | undefined): Plate | undefined {
  const plates = usePlates();
  return useMemo(() => (n ? plates.find((p) => p.n === n) : undefined), [plates, n]);
}

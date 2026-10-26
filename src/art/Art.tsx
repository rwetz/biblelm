// The three tiers of art (docs/ART.md): heroes (dithered, big, faded into
// the page), plates (Doré engravings beside a passage) and ornament. Anything
// small and decorative (corner plates, the sidebar vignette, empty-state spots)
// is dithered live in the theme's ink, so it never brings its own paper.

import { useEffect, useMemo, useRef, useState } from "react";
import { cn, useTheme } from "@nexis/design";
import { formatRef } from "@/lib/canon";
import { heroArtist, heroSrcUrl, heroUrl, loadHeroes, loadLiterary, loadPaintings, loadPlates, loadRoseHeroes, loadRosePaintings, loadRosePlates, pagePlate, paintingCredit, paintingUrl, plateCredit, plateUrl, rotation, type Hero, type Painting as PaintingData, type Plate } from "@/lib/art";
import { useStudy } from "@/store/study";
import { compose, cssColor, revealCells, type Composed, type PaintingLook } from "./painting";
import { BAYER8, paintScattered, scatterSeeds, dither, fadeEdges, inkColor, loadImage, paint, toneGrid, type DitherAlgo, type Edges } from "./dither";
import { ORNAMENTS, ornamentSrc, type OrnamentName } from "./ornaments";
import { useStill } from "@/lib/power";

/** A list of art, with Sub Rosa's own (fetched only then) after it while the mode is on. */
function useArt<T>(load: () => Promise<T[]>, loadRose: () => Promise<T[]>): T[] {
  const rose = useStudy((s) => s.subRosa);
  const [list, setList] = useState<T[]>([]);
  useEffect(() => {
    let live = true;
    Promise.all([load(), rose ? loadRose() : []]).then(([a, b]) => live && setList(b.length ? [...a, ...b] : a));
    return () => {
      live = false;
    };
  }, [load, loadRose, rose]);
  return list;
}

export const usePlates = (): Plate[] => useArt(loadPlates, loadRosePlates);
export const usePaintings = (): PaintingData[] => useArt(loadPaintings, loadRosePaintings);
export const useHeroes = (): Hero[] => useArt(loadHeroes, loadRoseHeroes);

/** The Lab's literary heroes (Sub Rosa's under the rose), one at a time, turning every `ms` (the same one in every view). */
export function useRotatingHero(ms = 30_000): Hero | undefined {
  const rose = useStudy((s) => s.subRosa);
  const [list, setList] = useState<Hero[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let live = true;
    (rose ? loadRoseHeroes() : loadLiterary()).then((x) => live && setList(x));
    return () => {
      live = false;
    };
  }, [rose]);
  useEffect(() => {
    if (!list.length) return;
    // Wake at the next turn, not on a fixed interval, so every view agrees.
    const timer = window.setTimeout(() => setNow(Date.now()), ms - (Date.now() % ms) + 20);
    return () => clearTimeout(timer);
  }, [list, now, ms]);
  return list[rotation(list.length, ms, now)];
}

/** An engraving or woodcut, blended into the page (see .engraving in styles.css). */
export function Engraving({
  plate,
  size = "full",
  ghost = false,
  className,
  style,
  loading = "lazy",
}: {
  plate: Plate;
  size?: "full" | "thumb";
  /** Faint decoration: an inverted print in dark mode. */
  ghost?: boolean;
  /** "eager" where it must be there at once (a notebook going to the printer). */
  loading?: "lazy" | "eager";
  className?: string;
  style?: React.CSSProperties;
}) {
  const img = size === "thumb" ? plate.thumb : plate.full;
  return (
    <img
      src={plateUrl(img)}
      width={img.width}
      height={img.height}
      loading={loading}
      decoding="async"
      draggable={false}
      alt={`${plate.title}, ${plateCredit(plate)}`}
      className={cn("engraving h-auto max-w-full", ghost && "ghost", className)}
      style={style}
    />
  );
}

/** A plate beside its passage, with its caption, as in an illustrated Bible. */
export function PlateFigure({ plate, onOpenRef, className }: { plate: Plate; onOpenRef?: () => void; className?: string }) {
  const openLook = useStudy((s) => s.openLook);
  const look = () => openLook({ kind: "plate", id: plate.id });
  return (
    <figure className={cn("my-6 break-inside-avoid", className)}>
      {/* Never wider than the scan itself: stretching a small plate is what blurs it. Click to look at it full window. */}
      <button type="button" onClick={look} aria-label={`Look at ${plate.title}`} className="block w-full cursor-zoom-in">
        <Engraving plate={plate} className="mx-auto w-full" style={{ maxWidth: `min(34rem, ${plate.full.width}px)` }} />
      </button>
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
        {" · "}
        <button type="button" className="underline-offset-2 hover:underline" onClick={look}>Look</button>
        <span className="block opacity-70">{plateCredit(plate)}</span>
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
  inline = false,
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
  /** Inside running text (a drop cap): a block span, since a div cannot sit in a paragraph. */
  inline?: boolean;
}) {
  const box = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useStill();
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
  const Box = inline ? "span" : "div";

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
    <Box ref={box as React.Ref<HTMLDivElement & HTMLSpanElement>} className={cn("relative overflow-hidden", inline && "block", className)} style={style}>
      <canvas
        ref={canvas}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className="absolute left-0 top-0"
        style={{ imageRendering: "pixelated" }}
      />
    </Box>
  );
}

/**
 * Tier 2: a quiet plate in a page's corner, in dots. It sits behind the page
 * (the host needs `isolate`), so text and cards always cover it.
 */
/** A corner plate's width, shared with PlatePage's clearance. */
const PLATE_WIDTH = "min(28%, 20rem)";

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
      className={cn("pointer-events-none absolute -z-10 aspect-[4/5] select-none text-muted-foreground opacity-80", pos, className)}
      style={{ width: PLATE_WIDTH }}
      scatter={scatter}
    />
  );
}

/**
 * A scrolling page with a corner plate pinned to the window, not the text: as
 * the page scrolls the plate's dots blow loose and gather again in the corner.
 * The page's centred column (`column` wide) is padded clear of the plate when
 * the window is too narrow for both, so no text ever runs over it.
 */
export function PlatePage({
  plate,
  corner = "br",
  hidePlate = false,
  column = "48rem",
  className,
  children,
}: {
  plate?: Plate;
  corner?: "br" | "tr" | "bl";
  hidePlate?: boolean;
  column?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const mode = useStudy((s) => s.illustrations);
  // Centred, the column's edge meets the plate once the page is narrower than
  // the column plus the plate on both sides; pad by the difference.
  const clear = `max(0px, calc(${column} + 2 * ${PLATE_WIDTH} - 100%))`;
  const pad = plate && !hidePlate && mode !== "off" ? (corner === "bl" ? { paddingLeft: clear } : { paddingRight: clear }) : undefined;
  return (
    <div className="relative isolate flex min-h-0 flex-1 flex-col">
      {!hidePlate && <CornerPlate plate={plate} corner={corner} scatter={scroller} />}
      <div ref={setScroller} className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", className)} style={pad}>
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
          algo="blue"
          dot={1}
          focusY={35}
          label={`${plate.title}, after ${plate.artist ?? "Gustave Doré"}`}
          edges={{ top: 0.08, right: 0.08, bottom: 0.08, left: 0.08 }}
          className="mb-4 aspect-[4/5] w-48 text-foreground/85"
        />
      )}
      <p className="font-garamond text-xl text-foreground">{title}</p>
      {children && <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</div>}
      {art && <p className="mt-3 font-garamond text-xs italic text-muted-foreground/70">{plate.title}, after {plate.artist ?? "Doré"}</p>}
    </div>
  );
}

/**
 * A picture kept as it is, with dots only where it gives way: its fading
 * edges, a little grain, and (for a tenebrist painting) its darkest ground.
 * Colour paintings keep their colour; a print is drawn in the theme's ink on
 * the page. Composed at device resolution for the drawn size, revealed cell
 * by cell with the brightest light first.
 */
export function Painting({
  src,
  look,
  dot = 3,
  reveal = true,
  label,
  className,
  style,
}: {
  src: string;
  look: PaintingLook;
  /** CSS pixels per dot. */
  dot?: number;
  reveal?: boolean;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useStill();
  const { paletteEpoch, resolvedMode } = useTheme();
  const dark = resolvedMode === "dark";
  const [size, setSize] = useState<[number, number] | null>(null);
  const revealed = useRef<string | null>(null);
  const lookRef = useRef(look);
  lookRef.current = look;
  const lookKey = JSON.stringify(look);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let timer = 0;
    const measure = () => setSize([el.clientWidth, el.clientHeight]);
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(measure, revealed.current ? 140 : 0);
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
        // Device pixels, capped so a huge window stays quick to compose.
        const dpr = Math.min(window.devicePixelRatio || 1, Math.sqrt(4_200_000 / (size[0] * size[1])), 3);
        const w = Math.max(1, Math.round(size[0] * dpr)), h = Math.max(1, Math.round(size[1] * dpr));
        cv.width = w;
        cv.height = h;
        cv.style.width = `${size[0]}px`;
        cv.style.height = `${size[1]}px`;
        const ink = inkColor(cv);
        const page = cssColor(cv, "var(--background)");
        const c: Composed = compose(img, w, h, Math.max(1, Math.round(dot * dpr)), lookRef.current, ink, page, dark);
        const ctx = cv.getContext("2d")!;
        const animate = reveal && !reduced && revealed.current !== src;
        revealed.current = src;
        if (!animate) return ctx.putImageData(c.final, 0, 0);
        const shown = new ImageData(w, h);
        const total = c.order.length;
        let done = 0;
        const t0 = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - t0) / 1300);
          // Ease out: the light arrives quickly, the ground settles slowly.
          const upto = Math.round(total * (1 - (1 - t) ** 2));
          revealCells(c, shown, done, upto);
          done = upto;
          ctx.putImageData(shown, 0, 0);
          if (t < 1 && !cancelled) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [size, src, dot, reveal, lookKey, reduced, paletteEpoch, dark]);

  return (
    <div ref={box} className={cn("relative overflow-hidden", className)} style={style}>
      <canvas
        ref={canvas}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className="absolute left-0 top-0"
      />
    </div>
  );
}

/** How much of a painting's dark ground becomes dots, from how much of it is near black. */
export const paintingShadow = (p: PaintingData) => Math.min(0.45, Math.max(0, ((p.dark ?? (p.key < 70 ? 0.6 : 0.2)) - 0.3) * 0.8));

/** What a hero band can show: a Doré hero (an engraving) or a painting. */
export type HeroArt = Hero | PaintingData;
export const isPainting = (a: HeroArt): a is PaintingData => "medium" in a;

/** The source, look and credit of a hero band's art. */
export function heroArt(a: HeroArt) {
  if (isPainting(a))
    return {
      key: a.id,
      src: paintingUrl(a.full),
      colour: a.colour,
      focusX: a.focusX,
      focusY: a.focusY,
      // Tenebrism: the more of the canvas is near black, the more of that ground
      // turns to dots. A bright painting keeps its paint (DATA.md, paintings).
      shadow: paintingShadow(a),
      label: `${a.title}, ${paintingCredit(a)}`,
      credit: `${a.title}, ${paintingCredit(a)}`,
    };
  return {
    key: a.id,
    src: heroSrcUrl(a),
    colour: false,
    focusX: 50,
    focusY: a.focusY ?? 40,
    shadow: 0,
    label: `${a.title}, after ${heroArtist(a)}`,
    credit: `${a.title}, ${a.work ? `from ${a.work}, ` : ""}after ${heroArtist(a)}`,
  };
}

/**
 * Tier 1: a hero, faded into the page in dots. A Doré hero is dithered whole,
 * one bit per dot (finer than the corner plates); a painting is kept as
 * painted and dotted only where it dissolves (src/art/painting.ts). `width`
 * frames it in a centred window (its sides dissolve too); `clearLeft` keeps
 * the left of the band for a title.
 */
export function DitherHero({
  hero,
  className,
  height = "58vh",
  focusY,
  width,
  clearLeft = false,
  fadeFrom = 55,
  caption = true,
  dot,
  children,
}: {
  hero?: HeroArt;
  className?: string;
  height?: string;
  /** Vertical focus of the crop, in percent; a painting's own light by default. */
  focusY?: number;
  /** Max width of the picture window, e.g. "72rem". Full-bleed when unset. */
  width?: string;
  clearLeft?: boolean;
  /** Where the fade into the page begins, in percent of the height. */
  fadeFrom?: number;
  caption?: boolean;
  dot?: number;
  children?: React.ReactNode;
}) {
  const mode = useStudy((s) => s.illustrations);
  const show = hero && mode === "full";
  const art = hero ? heroArt(hero) : null;
  const painted = !!hero && isPainting(hero);
  const side = width ? (painted ? 0.24 : 0.1) : 0;
  // A windowed picture dissolves on every side, the top a little too, so no edge reads as a cut.
  const edges: Edges = { top: width ? 0.05 : 0, bottom: 1 - fadeFrom / 100, right: side, left: clearLeft ? 0.85 : side };
  return (
    <div className={cn("relative w-full shrink-0 overflow-hidden", className)} style={{ height }}>
      {show && art && !painted && (
        // Every edge breaks up into dots (fadeEdges), never a blur.
        <Dither
          key={art.key}
          src={heroUrl(hero as Hero)}
          algo={(hero as Hero).algo === "bayer" ? "bayer" : (hero as Hero).algo === "blue" ? "blue" : "atkinson"}
          dot={dot ?? 1.5}
          focusY={focusY ?? art.focusY}
          label={art.label}
          edges={edges}
          className="absolute inset-y-0 left-1/2 w-full -translate-x-1/2 text-foreground opacity-90 dark:opacity-80"
          style={{ maxWidth: width }}
        />
      )}
      {show && art && painted && (
        <Painting
          key={art.key}
          src={art.src}
          dot={dot ?? 2}
          look={{ colour: art.colour, focusX: art.focusX, focusY: focusY ?? art.focusY, edges, shadow: art.shadow, grain: 0.06 }}
          label={art.label}
          className="absolute inset-y-0 left-1/2 w-full -translate-x-1/2"
          style={{ maxWidth: width }}
        />
      )}
      {show && art && caption && (
        // The credit hangs under the picture's own right edge, not the band's.
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 mx-auto flex justify-end px-6" style={{ maxWidth: width }}>
          <span className="font-garamond text-xs italic text-muted-foreground">{art.credit}</span>
        </div>
      )}
      {children && <div className="relative z-10 flex h-full flex-col">{children}</div>}
    </div>
  );
}

/**
 * A loader for long work: a cross gathering out of dots and dissolving again,
 * light running down it. Reduced motion shows the cross at rest. Under the
 * rose it is St Peter's cross: inverted, as he asked to be crucified.
 */
export function CrossLoader({ size = 48, className, label = "Working" }: { size?: number; className?: string; label?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useStill();
  const petrine = useStudy((s) => s.subRosa);
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
    const arm = n * 0.08, cx = (n - 1) / 2, beam = n * (petrine ? 0.68 : 0.32);
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
  }, [size, reduced, paletteEpoch, petrine]);
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

/**
 * Tier 3: a hand-drawn ornament (src/art/ornaments.ts), dithered in the
 * theme's ink at the size it is drawn. Size it by width or height; the other
 * follows the drawing. `label` only when it means something (Morning, Evening).
 */
export function Ornament({
  name,
  algo = "atkinson",
  dot = 1,
  label,
  level,
  reveal,
  className,
}: {
  name: OrnamentName;
  algo?: DitherAlgo;
  dot?: number;
  label?: string;
  /** How much of it is resolved, 0 to 1 (see Dither). */
  level?: number;
  reveal?: boolean;
  className?: string;
}) {
  const dark = useTheme().resolvedMode === "dark";
  const off = useStudy((s) => s.illustrations === "off" || !s.ornaments);
  const src = useMemo(() => ornamentSrc(name, dark), [name, dark]);
  if (off) return null;
  const o = ORNAMENTS[name];
  return <Dither src={src} algo={algo} dot={dot} focusY={50} label={label} level={level} reveal={reveal} className={cn("shrink-0 text-foreground", className)} style={{ aspectRatio: `${o.w} / ${o.h}` }} />;
}

/** A fleuron between sections. */
export function Fleuron({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("my-8 flex items-center justify-center gap-3 text-muted-foreground/60", className)}>
      <span className="h-px w-16 bg-current" />
      <Ornament name="fleuron" className="h-5 text-muted-foreground" />
      <span className="h-px w-16 bg-current" />
    </div>
  );
}

/** Pick the plate for a page's corner from PAGE_PLATES (Sub Rosa's in its place under the rose). */
export function usePagePlate(n: number | undefined): Plate | undefined {
  const plates = usePlates();
  const rose = useStudy((s) => s.subRosa);
  return useMemo(() => {
    if (!n) return undefined;
    const want = pagePlate(n, rose);
    return plates.find((p) => p.n === want) ?? plates.find((p) => p.n === n);
  }, [plates, n, rose]);
}

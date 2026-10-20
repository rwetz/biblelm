// The three tiers of art (docs/ART.md): heroes (dithered, big, faded into
// the page), plates (Doré engravings at a passage or in a page's corner) and
// ornament. Every image is drawn as a mask over a token colour, so it follows
// the theme and never brings its own paper.

import { useEffect, useMemo, useRef, useState } from "react";
import { cn, useReducedMotion, useTheme } from "@nexis/design";
import { formatRef } from "@/lib/canon";
import { heroUrl, loadHeroes, loadPlates, plateUrl, type Hero, type Plate } from "@/lib/art";
import { useStudy } from "@/store/study";

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
      <Engraving plate={plate} className="mx-auto w-full max-w-[34rem]" />
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        <span className="font-gothic text-sm text-foreground">{plate.title}</span>
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

/** Tier 2: a quiet plate in a page's corner. Never under text that must be read. */
export function CornerPlate({ plate, corner = "br", className }: { plate?: Plate; corner?: "br" | "tr" | "bl"; className?: string }) {
  const mode = useStudy((s) => s.illustrations);
  if (!plate || mode === "off") return null;
  const pos = { br: "bottom-0 right-0", tr: "top-0 right-0", bl: "bottom-0 left-0" }[corner];
  const fade = {
    br: "radial-gradient(120% 120% at 100% 100%, #000 35%, transparent 75%)",
    tr: "radial-gradient(120% 120% at 100% 0%, #000 35%, transparent 75%)",
    bl: "radial-gradient(120% 120% at 0% 100%, #000 35%, transparent 75%)",
  }[corner];
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute w-[min(30%,22rem)] select-none opacity-[0.16] dark:opacity-[0.2]", pos, className)}
      style={{ maskImage: fade, WebkitMaskImage: fade }}
    >
      <Engraving plate={plate} size="thumb" ghost className="w-full" />
    </div>
  );
}

/**
 * Tier 1: a dithered hero, faded into the page. On first paint it resolves dot
 * by dot (each ink pixel appears when a sweeping threshold passes its rank in
 * an 8x8 Bayer matrix), then rests. Reduced motion shows it at once.
 */
export function DitherHero({
  hero,
  className,
  height = "58vh",
  focusY = 38,
  caption = true,
  children,
}: {
  hero?: Hero;
  className?: string;
  height?: string;
  /** Vertical focus of the crop, in percent: Doré's plates are portrait. */
  focusY?: number;
  caption?: boolean;
  children?: React.ReactNode;
}) {
  const mode = useStudy((s) => s.illustrations);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { paletteEpoch, resolvedMode } = useTheme();
  // Light: draw the ink dots. Dark: draw the lit dots instead, so light stays
  // light and the scene is not a negative.
  const dark = resolvedMode === "dark";
  const show = hero && mode === "full";

  useEffect(() => {
    if (!show || !hero || !canvas.current) return;
    const cv = canvas.current;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let cancelled = false;
    const img = new Image();
    img.src = heroUrl(hero);
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth, h = img.naturalHeight;
      cv.width = w;
      cv.height = h;
      const tmp = document.createElement("canvas");
      tmp.width = w;
      tmp.height = h;
      const tctx = tmp.getContext("2d")!;
      tctx.drawImage(img, 0, 0);
      const ink = tctx.getImageData(0, 0, w, h).data;
      const color = getComputedStyle(cv).color; // currentColor = the ink token
      const [r, g, b] = (color.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"]).map(Number);
      const out = ctx.createImageData(w, h);
      const B = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
      const draw = (t: number) => {
        const d = out.data;
        for (let y = 0, i = 0; y < h; y++)
          for (let x = 0; x < w; x++, i++) {
            const on = ink[i * 4 + 3] > 127 !== dark && B[(y & 7) * 8 + (x & 7)] / 64 + (y / h) * 0.35 <= t * 1.35;
            d[i * 4] = r;
            d[i * 4 + 1] = g;
            d[i * 4 + 2] = b;
            d[i * 4 + 3] = on ? 255 : 0;
          }
        ctx.putImageData(out, 0, 0);
      };
      if (reduced) return draw(1);
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / 1100);
        draw(t);
        if (t < 1 && !cancelled) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [show, hero, reduced, paletteEpoch, dark]);

  const fade = "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)";
  return (
    <div className={cn("relative w-full overflow-hidden", className)} style={{ height }}>
      {show && (
        <canvas
          ref={canvas}
          aria-label={`${hero!.title}, after Gustave Doré`}
          role="img"
          className="absolute inset-0 h-full w-full object-cover text-foreground opacity-[0.55] dark:opacity-[0.5]"
          style={{ imageRendering: "pixelated", objectPosition: `center ${focusY}%`, maskImage: fade, WebkitMaskImage: fade }}
        />
      )}
      {show && caption && (
        <span className="pointer-events-none absolute right-4 top-3 z-20 rounded-md bg-background/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-sm">
          {hero!.title} · after Gustave Doré
        </span>
      )}
      {children && <div className="relative z-10 flex h-full flex-col">{children}</div>}
    </div>
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

// Sigils: small emblems drawn as vector paths, shaded, then dithered live like
// every other picture in the app. `level` (0..1) is how much of the emblem has
// formed: a machine's guess shows as a sigil that resolves dot by dot as it
// grows surer, never as a number. They stay in the ink colour, not the accent.

import { useEffect, useRef } from "react";
import { cn, useTheme } from "@nexis/design";
import { BAYER8, dither, inkColor } from "./dither";

type Mark = { d: string; stroke?: number; tone?: number };

/** 24 x 24 artwork. `tone` is the fill's darkness (1 = ink); strokes are always ink. */
export const SIGILS = {
  // Exact words: an open book.
  book: [
    { d: "M12 6.2C9.2 4.6 5.6 4.2 2.4 5v14c3.2-.8 6.8-.4 9.6 1.2z", tone: 0.55, stroke: 1.1 },
    { d: "M12 6.2c2.8-1.6 6.4-2 9.6-1.2v14c-3.2-.8-6.8-.4-9.6 1.2z", tone: 0.3, stroke: 1.1 },
    { d: "M5 8.4c1.8-.3 3.6 0 5 .7M5 11.4c1.8-.3 3.6 0 5 .7M5 14.4c1.8-.3 3.6 0 5 .7M14 9.1c1.4-.7 3.2-1 5-.7M14 12.1c1.4-.7 3.2-1 5-.7", stroke: 0.7 },
  ],
  // A theme: an oil lamp ("a lamp unto my feet").
  lamp: [
    { d: "M2.6 13.4c0-2.8 4.8-3.8 9.6-2.9l6.6-2c1.3-.4 2 .9 1 1.6l-4.2 3.6c-2.2 2.9-10 3.3-13-.3z", tone: 0.6, stroke: 1.1 },
    { d: "M19.4 8c-1.6-1.8-.8-3.9.9-5.6.4 2 2 3.4.1 5.6z", tone: 0.15, stroke: 0.9 },
    { d: "M7.5 16.2h5.4l.8 2.6H6.7z", tone: 0.85 },
    { d: "M3 12.4c-1.6-.4-2.2-2-.8-3", stroke: 1 },
  ],
  // A story or person: the shepherd's crook.
  crook: [
    { d: "M9 22.5V9.2C9 3.6 16.6 2.8 16.6 8c0 2.4-2.3 3-3.5 1.7", stroke: 2.2 },
    { d: "M7.2 17.5h3.6M7.2 19.6h3.6", stroke: 0.8 },
  ],
  // A question: a key ("seek, and ye shall find").
  key: [
    { d: "M7.6 3.2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2zm0 2.6a2 2 0 1 1 0 4 2 2 0 0 1 0-4z", tone: 0.5, stroke: 1 },
    { d: "M10.8 11.2l10.4 10.4M15.6 16l2.4-2.4M18.2 18.6l2.4-2.4", stroke: 1.8 },
  ],
  // The rest of the set, for other readings and empty states.
  scroll: [
    { d: "M5 4.5h12.5v13.2c0 1.6-1.2 2.8-2.8 2.8H6.6", tone: 0.35, stroke: 1.1 },
    { d: "M5 4.5a2 2 0 0 0 0 4h2.2V4.5M14.7 20.5a2 2 0 0 0 2.8-2.8", stroke: 1.1 },
    { d: "M9.5 8.5h5.5M9.5 11.5h5.5M9.5 14.5h4", stroke: 0.7 },
  ],
  dove: [
    { d: "M3 13.2c3-.3 5.2-1.6 6.6-4.2 1.6-3 4.8-4 7.2-2.6l3.4-.8-2 2.2c.6 4.8-3 9-8.8 9.6L5.6 20l1-3.2C4.8 16.4 3.6 15 3 13.2z", tone: 0.25, stroke: 1 },
    { d: "M9.6 9c1.6 1.6 4.2 2.2 6.4 1.4", stroke: 0.8 },
  ],
  laurel: [
    { d: "M12 21c-5.2-1.2-8.6-5.6-8.4-11.4M12 21c5.2-1.2 8.6-5.6 8.4-11.4", stroke: 1 },
    { d: "M4.3 15.6c-1.6-.4-2.4-1.8-2-3.2 1.4.2 2.4 1.4 2 3.2zM6.6 18.4c-1.4.6-3 0-3.4-1.4 1.4-.6 2.8 0 3.4 1.4zM3.6 11.6c-1.2-1-1.2-2.6-.2-3.6 1 1 1.2 2.4.2 3.6zM19.7 15.6c1.6-.4 2.4-1.8 2-3.2-1.4.2-2.4 1.4-2 3.2zM17.4 18.4c1.4.6 3 0 3.4-1.4-1.4-.6-2.8 0-3.4 1.4zM20.4 11.6c1.2-1 1.2-2.6.2-3.6-1 1-1.2 2.4-.2 3.6z", tone: 0.55, stroke: 0.7 },
  ],
  sword: [
    { d: "M12 2.2l1.6 3v10.4h-3.2V5.2z", tone: 0.2, stroke: 1 },
    { d: "M6.8 15.6h10.4", stroke: 1.8 },
    { d: "M12 16.4v4", stroke: 2 },
    { d: "M12 21.6a.9.9 0 1 0 0 .1", stroke: 1.6 },
  ],
} satisfies Record<string, Mark[]>;
export type SigilName = keyof typeof SIGILS;

/** The emblem's tone on a w x h grid: 0 = ink, 255 = paper. */
function sigilTone(name: SigilName, w: number, h: number): Float32Array {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.scale(w / 24, h / 24);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const m of SIGILS[name] as Mark[]) {
    const p = new Path2D(m.d);
    if (m.tone !== undefined) {
      // Light falls from the upper left, so fills dither into a gradient.
      const g = ctx.createLinearGradient(0, 0, 24, 24);
      const v = (k: number) => Math.round(255 * (1 - Math.min(1, m.tone! * k)));
      g.addColorStop(0, `rgb(${v(0.6)},${v(0.6)},${v(0.6)})`);
      g.addColorStop(1, `rgb(${v(1.3)},${v(1.3)},${v(1.3)})`);
      ctx.fillStyle = g;
      ctx.fill(p);
    }
    if (m.stroke) {
      ctx.strokeStyle = "#000";
      ctx.lineWidth = m.stroke;
      ctx.stroke(p);
    }
  }
  const px = ctx.getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = px[i * 4];
  return out;
}

/**
 * A dithered emblem. `level` 0..1 is how far it has formed (animated); `dot`
 * is the dot size in CSS pixels.
 */
export function Sigil({ name, size = 28, level = 1, dot = 1.5, className, label }: { name: SigilName; size?: number; level?: number; dot?: number; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bits = useRef<{ name: SigilName; n: number; bits: Uint8Array } | null>(null);
  const shown = useRef(0);
  const { paletteEpoch, resolvedMode } = useTheme();

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const px = Math.max(1, Math.round(dot * dpr)); // device pixels per dot
    const n = Math.max(8, Math.round((size * dpr) / px));
    if (!bits.current || bits.current.name !== name || bits.current.n !== n) {
      bits.current = { name, n, bits: dither(sigilTone(name, n, n), n, n, "floyd") };
      cv.width = n;
      cv.height = n;
    }
    const ctx = cv.getContext("2d")!;
    const out = ctx.createImageData(n, n);
    const b = bits.current.bits;
    const [r, g, bl] = inkColor(cv);
    const draw = (t: number) => {
      // Dots appear in Bayer order, evenly across the emblem.
      for (let y = 0, i = 0; y < n; y++)
        for (let x = 0; x < n; x++, i++) {
          const on = b[i] === 1 && (t >= 1 || BAYER8[(y & 7) * 8 + (x & 7)] / 64 < t);
          out.data[i * 4] = r;
          out.data[i * 4 + 1] = g;
          out.data[i * 4 + 2] = bl;
          out.data[i * 4 + 3] = on ? 255 : 0;
        }
      ctx.putImageData(out, 0, 0);
    };
    const target = Math.max(0, Math.min(1, level));
    const from = shown.current;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(target - from) < 0.01) {
      shown.current = target;
      draw(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 260);
      const e = 1 - (1 - k) ** 3;
      shown.current = from + (target - from) * e;
      draw(shown.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [name, size, level, dot, paletteEpoch, resolvedMode]);

  return (
    <canvas
      ref={ref}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("sigil shrink-0", className)}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}

// The rose window: BibleLM's round mark, filled with slow waves of ordered
// dither in the scheme's accent, cut to the window's tracery by a CSS mask.
// The pointer stirs the waves where it passes. A 2D canvas at a few pixels
// per dot, so it needs no WebGL; it holds still when motion is reduced and
// stops drawing off screen.

import { useEffect, useRef } from "react";
import { cn, useTheme } from "@nexis/design";
import { BAYER8 } from "./dither";
import rose from "./rose.svg";
import { useStill } from "@/lib/power";

/** A CSS colour (any syntax the browser knows) as RGB bytes. */
function rgbOf(color: string): [number, number, number] {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

export function RoseMark({
  className,
  label,
  levels = 6,
  scale = 0.85,
  speed = 0.1,
  mouseRadius = 0.11,
  dot = 2,
}: {
  className?: string;
  label?: string;
  /** Shades between the ground and the accent. */
  levels?: number;
  /** How large the waves are: smaller is finer. */
  scale?: number;
  speed?: number;
  /** How far the pointer stirs, as a fraction of the mark's size. */
  mouseRadius?: number;
  /** CSS pixels per dot. */
  dot?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useStill();
  const { paletteEpoch, resolvedMode } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const style = getComputedStyle(canvas);
    const wave = rgbOf(style.getPropertyValue("--brand").trim() || "#d4a94f");
    const ground = rgbOf(style.getPropertyValue("--card").trim() || "#14110d");
    let frame = 0, visible = true, alive = true;
    let mouse: [number, number] | null = null;
    let stir = 0;
    const t0 = performance.now();

    const draw = (now: number) => {
      const w = Math.max(8, Math.round(canvas.clientWidth / dot));
      const h = Math.max(8, Math.round(canvas.clientHeight / dot));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const img = ctx.createImageData(w, h);
      const d = img.data;
      const t = reduced ? 3 : ((now - t0) / 1000) * speed * 10;
      const f = 6 / scale;
      stir *= 0.94;
      for (let y = 0; y < h; y++) {
        const v = y / h;
        for (let x = 0; x < w; x++) {
          const u = x / w;
          // Three slow interfering waves, roughly 0..1.
          let s = 0.5 + 0.22 * Math.sin(u * f + t) * Math.cos(v * f * 0.8 - t * 0.7) + 0.18 * Math.sin((u + v) * f * 0.6 - t * 1.3) + 0.1 * Math.sin(Math.hypot(u - 0.5, v - 0.5) * f * 2 - t * 2);
          if (mouse && stir > 0.01) {
            const r = Math.hypot(u - mouse[0], v - mouse[1]) / mouseRadius;
            if (r < 1) s += stir * 0.5 * (1 - r) * Math.sin(r * 9 - t * 6);
          }
          // Ordered dither between `levels` shades.
          const q = Math.max(0, Math.min(1, s)) * (levels - 1);
          const lo = Math.floor(q);
          const k = Math.min(levels - 1, lo + (q - lo > BAYER8[(y & 7) * 8 + (x & 7)] / 64 ? 1 : 0)) / (levels - 1);
          const o = (y * w + x) * 4;
          d[o] = ground[0] + (wave[0] - ground[0]) * k;
          d[o + 1] = ground[1] + (wave[1] - ground[1]) * k;
          d[o + 2] = ground[2] + (wave[2] - ground[2]) * k;
          d[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };
    const loop = (now: number) => {
      frame = 0;
      if (!alive || !visible) return;
      draw(now);
      if (!reduced) frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
      stir = 1;
      if (reduced) draw(performance.now());
    };
    canvas.addEventListener("pointermove", onMove);
    start();
    return () => {
      alive = false;
      io.disconnect();
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointermove", onMove);
    };
  }, [reduced, levels, scale, speed, mouseRadius, dot, paletteEpoch, resolvedMode]);

  // Quoted: Vite inlines a small SVG as a data URL with spaces and quotes in it.
  const mask = `url(${JSON.stringify(rose)})`;
  return (
    <canvas
      ref={canvasRef}
      data-rose=""
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block aspect-square", className)}
      style={{ imageRendering: "pixelated", WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }}
    />
  );
}

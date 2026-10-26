// Live dithering: a grayscale engraving turned into one-bit dots at exactly
// the size it is drawn (docs/ART.md: never scale a dithered image). Heroes,
// sidebar vignettes, corner plates and empty-state spots all go through here,
// so the dots are square at any window size and follow the theme's ink.

/**
 * atkinson: blows highlights out to paper, bold (heroes). floyd: Floyd and
 * Steinberg, serpentine, keeps mid-tones, so small pictures stay legible.
 * bayer: the ordered, printed grid. blue: a void-and-cluster blue-noise
 * threshold (Ulichney 1993), no pattern at all, the most organic (faces).
 */
export type DitherAlgo = "atkinson" | "floyd" | "bayer" | "blue";

/** 8x8 Bayer ranks, 0..63. Also orders the dot-by-dot reveal. */
export const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1,
  33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

// A decoded hero is tens of MB, so keep only the last few (a Map iterates in
// insertion order: re-inserting on use makes the first key the least recent).
const images = new Map<string, Promise<HTMLImageElement>>();
const KEEP_IMAGES = 12;

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = images.get(src);
  if (p) {
    images.delete(src);
    images.set(src, p);
  } else {
    while (images.size >= KEEP_IMAGES) images.delete(images.keys().next().value!);
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        images.delete(src);
        reject(new Error(`could not load ${src}`));
      };
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

/**
 * The image's luminance on a w x h grid, cropped like `object-fit: cover`
 * around a focus point (percent), with levels stretched so faint plates keep
 * their lines.
 */
export function toneGrid(img: HTMLImageElement, w: number, h: number, focusX = 50, focusY = 40, levels = true): Float32Array {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale, sh = h / scale;
  const sx = (iw - sw) * (focusX / 100), sy = (ih - sh) * (focusY / 100);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#fff"; // a 1-bit PNG's paper is transparent
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
  if (!levels) return g;
  // 1st and 99th percentiles to black and white.
  const hist = new Uint32Array(256);
  for (const v of g) hist[v | 0]++;
  const at = (q: number) => {
    let n = 0;
    for (let i = 0; i < 256; i++) if ((n += hist[i]) >= g.length * q) return i;
    return 255;
  };
  const lo = at(0.01), hi = Math.max(lo + 1, at(0.99));
  for (let i = 0; i < g.length; i++) g[i] = Math.min(255, Math.max(0, ((g[i] - lo) / (hi - lo)) * 255));
  return g;
}

/** How far in from each side (a fraction of the size) the picture thins out into the page. */
export type Edges = { top?: number; right?: number; bottom?: number; left?: number };

/**
 * Fade the tone toward the page before dithering, so a picture's edge breaks
 * up into scattered dots instead of a blur. `toward` is the tone that draws
 * nothing: paper (255) when ink dots are drawn, ink (0) when lit dots are.
 */
export function fadeEdges(g: Float32Array, w: number, h: number, e: Edges, toward: number) {
  const ramp = (d: number, f = 0) => (f <= 0 ? 1 : Math.min(1, d / f));
  const ease = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(ramp(y / h, e.top), ramp(1 - y / h, e.bottom));
    for (let x = 0; x < w; x++) {
      const k = ease(Math.min(fy, ramp(x / w, e.left), ramp(1 - x / w, e.right)));
      if (k < 1) g[y * w + x] = toward + (g[y * w + x] - toward) * k;
    }
  }
}

/** A light unsharp mask (3x3 box), so outlines survive being reduced to dots. */
function sharpen(g: Float32Array, w: number, h: number, amount = 0.6): Float32Array {
  const out = new Float32Array(g.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++)
        for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
          s += g[yy * w + xx];
          n++;
        }
      const v = g[y * w + x];
      out[y * w + x] = Math.min(255, Math.max(0, v + (v - s / n) * amount));
    }
  return out;
}

let blueMask: Float32Array | null = null;
const BLUE = 32;

/**
 * A 32x32 void-and-cluster mask, made once. Each pixel's rank is the order in
 * which it would be switched on so the "on" pixels stay as evenly spread as
 * possible; energy is a Gaussian of nearby on pixels (wrapping at the edges),
 * updated only within a small window so it takes a few milliseconds.
 */
export function blueNoise(): Float32Array {
  if (blueMask) return blueMask;
  const n = BLUE, N = n * n, R = 5, sigma = 1.5;
  const energy = new Float64Array(N);
  const on = new Uint8Array(N);
  const kern: number[] = [];
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) kern.push(Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)));
  const toggle = (i: number, v: 0 | 1) => {
    on[i] = v;
    const x = i % n, y = (i / n) | 0;
    let k = 0;
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++, k++) energy[((y + dy + n) % n) * n + ((x + dx + n) % n)] += (v ? 1 : -1) * kern[k];
  };
  const pick = (want: 0 | 1, best: (a: number, b: number) => boolean) => {
    let b = -1;
    for (let i = 0; i < N; i++) if (on[i] === want && (b < 0 || best(energy[i], energy[b]))) b = i;
    return b;
  };
  // Seed a tenth at fixed pseudo-random places, then relax into an even spread.
  let s = 7;
  for (let k = 0; k < N / 10; k++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    if (!on[s % N]) toggle(s % N, 1);
  }
  for (let it = 0; it < N; it++) {
    const c = pick(1, (a, b) => a > b);
    toggle(c, 0);
    const v = pick(0, (a, b) => a < b);
    if (v === c) {
      toggle(c, 1);
      break;
    }
    toggle(v, 1);
  }
  const rank = new Float32Array(N);
  const ones = on.reduce((a, b) => a + b, 0);
  const saved = Uint8Array.from(on), savedE = Float64Array.from(energy);
  for (let r = ones - 1; r >= 0; r--) {
    const c = pick(1, (a, b) => a > b);
    toggle(c, 0);
    rank[c] = r;
  }
  on.set(saved);
  energy.set(savedE);
  for (let r = ones; r < N; r++) {
    const v = pick(0, (a, b) => a < b);
    toggle(v, 1);
    rank[v] = r;
  }
  for (let i = 0; i < N; i++) rank[i] = (rank[i] + 0.5) / N;
  return (blueMask = rank);
}

/** One bit per pixel, 1 = ink. */
export function dither(g: Float32Array, w: number, h: number, algo: DitherAlgo = "atkinson"): Uint8Array {
  const out = new Uint8Array(w * h);
  if (algo === "blue") {
    const m = blueNoise();
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) out[y * w + x] = g[y * w + x] < m[(y % BLUE) * BLUE + (x % BLUE)] * 255 ? 1 : 0;
    return out;
  }
  if (algo === "bayer") {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) out[y * w + x] = g[y * w + x] < ((BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64) * 255 ? 1 : 0;
    return out;
  }
  if (algo === "floyd") {
    const px = sharpen(g, w, h);
    for (let y = 0; y < h; y++) {
      const ltr = (y & 1) === 0;
      for (let n = 0; n < w; n++) {
        const x = ltr ? n : w - 1 - n;
        const i = y * w + x;
        const ink = px[i] < 128;
        out[i] = ink ? 1 : 0;
        const err = px[i] - (ink ? 0 : 255);
        const dx = ltr ? 1 : -1;
        if (x + dx >= 0 && x + dx < w) px[i + dx] += (err * 7) / 16;
        if (y + 1 < h) {
          if (x - dx >= 0 && x - dx < w) px[i + w - dx] += (err * 3) / 16;
          px[i + w] += (err * 5) / 16;
          if (x + dx >= 0 && x + dx < w) px[i + w + dx] += err / 16;
        }
      }
    }
    return out;
  }
  // Atkinson: spreads only 6/8 of the error, so highlights blow out to paper.
  const px = Float32Array.from(g);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const ink = px[i] < 128;
      out[i] = ink ? 1 : 0;
      const err = (px[i] - (ink ? 0 : 255)) / 8;
      if (x + 1 < w) px[i + 1] += err;
      if (x + 2 < w) px[i + 2] += err;
      if (y + 1 < h) {
        if (x > 0) px[i + w - 1] += err;
        px[i + w] += err;
        if (x + 1 < w) px[i + w + 1] += err;
      }
      if (y + 2 < h) px[i + 2 * w] += err;
    }
  return out;
}

/** "rgb(1, 2, 3)" or "oklch(...)" resolved by the browser into r, g, b. */
export function inkColor(el: Element): [number, number, number] {
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.fillStyle = getComputedStyle(el).color;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

/**
 * Paint the bits. `t` (0..1) is the reveal: a dot appears once a threshold
 * sweeping down the picture passes its Bayer rank, so it resolves dot by dot.
 * `lit` paints the paper dots instead of the ink (dark mode: light stays light).
 * `sweep` 0 makes the threshold even across the picture: a partial level then
 * shows as an evenly thinned picture rather than a band.
 */
export function paint(ctx: CanvasRenderingContext2D, out: ImageData, bits: Uint8Array, w: number, h: number, rgb: [number, number, number], lit: boolean, t = 1, sweep = 0.35) {
  const d = out.data;
  const [r, g, b] = rgb;
  const full = t >= 1;
  for (let y = 0, i = 0; y < h; y++) {
    const lag = (y / h) * sweep;
    for (let x = 0; x < w; x++, i++) {
      const on = (bits[i] === 1) !== lit && (full || BAYER8[(y & 7) * 8 + (x & 7)] / 64 + lag <= t * (1 + sweep));
      const o = i * 4;
      d[o] = r;
      d[o + 1] = g;
      d[o + 2] = b;
      d[o + 3] = on ? 255 : 0;
    }
  }
  ctx.putImageData(out, 0, 0);
}

/** Two random numbers per dot, fixed for a picture, so a scatter is the same drift every frame. */
export function scatterSeeds(n: number): [Float32Array, Float32Array] {
  let s = 0x9e3779b9;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    a[i] = rand();
    b[i] = rand();
  }
  return [a, b];
}

/**
 * Paint the bits blown loose: `amp` (-1..1) is how far they have been carried,
 * its sign the way the page moved. Each dot drifts its own distance with the
 * page and a little sideways, so the picture comes apart into a stream of dots
 * and gathers again as `amp` returns to 0.
 */
export function paintScattered(
  ctx: CanvasRenderingContext2D,
  out: ImageData,
  bits: Uint8Array,
  w: number,
  h: number,
  rgb: [number, number, number],
  lit: boolean,
  amp: number,
  seeds: [Float32Array, Float32Array],
) {
  const d = out.data;
  d.fill(0);
  const [r, g, b] = rgb;
  const [sa, sb] = seeds;
  const reach = h * 0.45 * amp;
  const sway = w * 0.12 * Math.abs(amp);
  for (let y = 0, i = 0; y < h; y++)
    for (let x = 0; x < w; x++, i++) {
      if ((bits[i] === 1) === lit) continue;
      // Lower dots go further: the picture streams out from its loose edge.
      const k = sa[i] * sa[i] * (0.4 + 0.6 * (y / h));
      const yy = Math.round(y - reach * k);
      const xx = Math.round(x + (sb[i] - 0.5) * sway);
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const o = (yy * w + xx) * 4;
      d[o] = r;
      d[o + 1] = g;
      d[o + 2] = b;
      d[o + 3] = 255;
    }
  ctx.putImageData(out, 0, 0);
}

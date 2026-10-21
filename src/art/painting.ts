// Partial dithering: the original picture, untouched where it matters, with
// dots taking over only where the picture gives way (its fading edges, and in
// a tenebrist painting its darkest ground). Zeron's sky is the model: a real
// painting at full resolution, its colour broken into ordered dots as it
// dissolves into the page.
//
// Works for both kinds of art. A colour painting keeps its own colours, and
// its dots are its colours quantised against an ordered matrix. A black and
// white engraving or etching is drawn as a positive print in the theme's ink
// on the page (light stays light in the dark theme), and its dots are ink.
//
// Composed once per size and theme, at device resolution; a reveal then only
// copies cells in, in the order the light falls.

import { BAYER8, type Edges } from "./dither";

export interface PaintingLook {
  /** Colour painting (true) or a monochrome print to tint with the theme (false). */
  colour: boolean;
  /** Where the crop centres, percent. */
  focusX?: number;
  focusY?: number;
  /** Sides that dissolve into the page. */
  edges?: Edges;
  /** Dots scattered through the whole picture, 0 to 1. */
  grain?: number;
  /** How strongly the darkest ground turns to dots (tenebrism), 0 to 1. */
  shadow?: number;
  /** Levels per channel for colour dots: fewer is coarser, more "printed". */
  levels?: number;
  /** "cover" fills the box (cropping around the focus); "contain" shows the whole picture. */
  fit?: "cover" | "contain";
}

export interface Composed {
  w: number;
  h: number;
  /** The finished picture. */
  final: ImageData;
  /** Cell indices in reveal order, and each cell's rank 0..1 in that order. */
  order: Uint32Array;
  cell: number;
  cols: number;
  rows: number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * A second threshold, independent of the first: interleaved gradient noise
 * (Jimenez 2014), even and unpatterned, so which cells turn to dots never
 * lines up with which dots are lit.
 */
const rank2 = (x: number, y: number) => {
  const f = 0.06711056 * x + 0.00583715 * y;
  const g = 52.9829189 * (f - Math.floor(f));
  return g - Math.floor(g);
};
const rank1 = (x: number, y: number) => (BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;

/** Where the picture lands in a w x h box: the whole box (cover) or a centred rectangle (contain). */
function placement(img: HTMLImageElement, w: number, h: number, fit: "cover" | "contain") {
  if (fit === "cover") return { x: 0, y: 0, w, h };
  const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const pw = img.naturalWidth * s, ph = img.naturalHeight * s;
  return { x: (w - pw) / 2, y: (h - ph) / 2, w: pw, h: ph };
}

/** Draw `img` into a w x h canvas: cover-cropped around a focus point, or contained whole. */
function draw(img: HTMLImageElement, w: number, h: number, fx: number, fy: number, fit: "cover" | "contain") {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if (fit === "contain") {
    const r = placement(img, w, h, fit);
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
  } else {
    const scale = Math.max(w / iw, h / ih);
    const sw = w / scale, sh = h / scale;
    const sx = Math.min(iw - sw, Math.max(0, iw * (fx / 100) - sw / 2));
    const sy = Math.min(ih - sh, Math.max(0, ih * (fy / 100) - sh / 2));
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  }
  return ctx.getImageData(0, 0, w, h).data;
}

/**
 * Compose the picture at device size `w` x `h`, `cell` device pixels per dot.
 * `ink` and `page` are the theme's colours; `lit` is the dark theme (a print
 * is drawn as light on the page, so a night scene is not a negative).
 */
export function compose(
  img: HTMLImageElement,
  w: number,
  h: number,
  cell: number,
  look: PaintingLook,
  ink: [number, number, number],
  page: [number, number, number],
  lit: boolean,
): Composed {
  const { colour, focusX = 50, focusY = 45, edges = {}, grain = 0.1, shadow = 0, levels = 5, fit = "cover" } = look;
  const px = draw(img, w, h, focusX, focusY, fit);
  const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
  // One averaged colour per dot (the browser's downscale is an area average).
  const small = draw(img, cols, rows, focusX, focusY, fit);
  // The picture's own rectangle, in cells: edges dissolve from its sides, not the box's.
  const rect = placement(img, cols, rows, fit);
  const final = new ImageData(w, h);
  const d = final.data;
  const ramp = (t: number, f = 0) => (f <= 0 ? 1 : Math.min(1, t / f));
  const lv = Math.max(2, levels) - 1;
  // The painting's own dark tone (its mean colour, at unit brightness): what
  // the shadows' dots are tinted with.
  let mr = 0, mg = 0, mb = 0;
  for (let i = 0; i < small.length; i += 4) {
    mr += small[i];
    mg += small[i + 1];
    mb += small[i + 2];
  }
  const ml = Math.max(1, 0.299 * mr + 0.587 * mg + 0.114 * mb);
  const umber: [number, number, number] = [mr / ml, mg / ml, mb / ml];
  // Each cell: present at all? a dot or the painting itself? and its reveal rank.
  const rank = new Float32Array(cols * rows);
  const [ir, ig, ib] = ink, [pr, pg, pb] = page;
  // A print's tone mapped onto the theme: paper to page, ink to ink (or, lit,
  // the reverse pair so light stays light).
  const tint = (g: number, o: number) => {
    const t = g / 255;
    if (lit) {
      d[o] = pr + (ir - pr) * t;
      d[o + 1] = pg + (ig - pg) * t;
      d[o + 2] = pb + (ib - pb) * t;
    } else {
      d[o] = ir + (pr - ir) * t;
      d[o + 1] = ig + (pg - ig) * t;
      d[o + 2] = ib + (pb - ib) * t;
    }
  };
  for (let cy = 0; cy < rows; cy++) {
    const v = (cy + 0.5 - rect.y) / rect.h;
    const fy = v < 0 || v > 1 ? 0 : Math.min(ramp(v, edges.top), ramp(1 - v, edges.bottom));
    for (let cx = 0; cx < cols; cx++) {
      const ci = cy * cols + cx;
      const u = (cx + 0.5 - rect.x) / rect.w;
      const k = u < 0 || u > 1 ? 0 : Math.min(fy, ramp(u, edges.left), ramp(1 - u, edges.right));
      const so = ci * 4;
      const r = small[so], g = small[so + 1], b = small[so + 2];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      // Presence: the outer part of a fading edge thins to nothing.
      const present = smooth(0, 0.95, k) > rank1(cx, cy) - 0.5 / 64;
      // Dots: wherever the picture is thinning, then fewer inward; through
      // the dark ground; and a little grain everywhere.
      const toDots = Math.min(1, (1 - smooth(0.55, 1, k)) * 1.2 + grain + shadow * (1 - smooth(0.04, 0.3, lum)));
      const dotted = toDots > rank2(cx, cy);
      // Light first: the brightest cells arrive first, ordered dots break the ties.
      rank[ci] = colour ? 0.6 * (1 - lum) + 0.4 * rank1(cx, cy) : rank1(cx, cy) * 0.7 + (cy / rows) * 0.3;
      if (k <= 0) continue; // outside the picture
      const x0 = cx * cell, y0 = cy * cell, x1 = Math.min(w, x0 + cell), y1 = Math.min(h, y0 + cell);
      if (!present) continue; // transparent: the page
      if (dotted) {
        // One flat dot for the whole cell.
        let dr: number, dg: number, db: number, on = true;
        const th = rank1(cx, cy) - 0.5;
        if (colour) {
          // Dither the brightness, keep the hue: a dot is the cell's own
          // colour at one of a few levels of light, never a stray primary.
          // The darkest cells' hue is scan noise, so it fades to the
          // painting's warm umber there instead of being amplified.
          const q = Math.max(0, Math.round(lum * lv + th) / lv);
          const sat = smooth(0.02, 0.18, lum);
          const y = lum * 255;
          const cr = umber[0] * y + (r - umber[0] * y) * sat;
          const cg = umber[1] * y + (g - umber[1] * y) * sat;
          const cb = umber[2] * y + (b - umber[2] * y) * sat;
          const k2 = (q * 255) / Math.max(1, y);
          dr = Math.min(255, y > 1 ? cr * k2 : umber[0] * q * 255);
          dg = Math.min(255, y > 1 ? cg * k2 : umber[1] * q * 255);
          db = Math.min(255, y > 1 ? cb * k2 : umber[2] * q * 255);
        } else {
          // Ink or nothing: a dot of ink where the print is darker than the threshold (lit: brighter).
          on = lit ? lum > rank1(cx, cy) : lum < rank1(cx, cy);
          [dr, dg, db] = ink;
        }
        if (!on) continue;
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) {
            const o = (y * w + x) * 4;
            d[o] = dr;
            d[o + 1] = dg;
            d[o + 2] = db;
            d[o + 3] = 255;
          }
        continue;
      }
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const o = (y * w + x) * 4;
          if (colour) {
            d[o] = px[o];
            d[o + 1] = px[o + 1];
            d[o + 2] = px[o + 2];
          } else tint(0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2], o);
          d[o + 3] = 255;
        }
    }
  }
  // Counting sort of the cells by rank, 256 buckets.
  const n = cols * rows;
  const counts = new Uint32Array(257);
  const bucket = (r: number) => Math.min(255, Math.max(0, Math.floor(r * 256)));
  for (let i = 0; i < n; i++) counts[bucket(rank[i]) + 1]++;
  for (let i = 1; i < 257; i++) counts[i] += counts[i - 1];
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[counts[bucket(rank[i])]++] = i;
  return { w, h, final, order, cell, cols, rows };
}

/**
 * Copy cells `from`..`to` (positions in the reveal order) from the finished
 * picture into `shown`. Called with growing ranges, every cell arrives once.
 */
export function revealCells(c: Composed, shown: ImageData, from: number, to: number) {
  const { final, order, cell, cols, w, h } = c;
  const s = final.data, d = shown.data;
  for (let k = from; k < to; k++) {
    const ci = order[k];
    const x0 = (ci % cols) * cell, y0 = Math.floor(ci / cols) * cell;
    const x1 = Math.min(w, x0 + cell), y1 = Math.min(h, y0 + cell);
    for (let y = y0; y < y1; y++) {
      const a = (y * w + x0) * 4, b = (y * w + x1) * 4;
      d.set(s.subarray(a, b), a);
    }
  }
}

/** A CSS colour (a token like `var(--background)` too) resolved to r, g, b. */
export function cssColor(el: Element, value: string): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.color = value;
  probe.style.display = "none";
  el.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);
  const p = ctx.getImageData(0, 0, 1, 1).data;
  return [p[0], p[1], p[2]];
}

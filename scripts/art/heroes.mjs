// Hero backdrops: a few Doré plates dithered to one bit for the big Zeron-style
// scenes on Home and the Lab. Unlike the plates (shown as engravings), these
// are seen large and soft behind a fade, where the dot pattern is the point.
//
//   node scripts/art/heroes.mjs          (after scripts/art/dore.mjs)
//
// Dithers at the size it is drawn (never scale a dithered image: it turns to
// mush). Three algorithms; each hero names the one that suits it:
//   atkinson  Bill Atkinson's error diffusion (the original Mac): it discards
//             a quarter of the error, so highlights blow out to clean paper.
//   bayer     8x8 ordered dither: a visible, printed crosshatch grid.
//   blue      void-and-cluster blue noise threshold (Ulichney 1993): no
//             pattern artefacts, the most organic.
//
// Each hero also gets a grayscale "tone" JPEG (levels and gamma already
// applied). The app dithers that live at the size it is drawn (src/art/dither.ts),
// so a hero can be framed for any window and its dots stay square; the 1-bit
// PNG is kept as the fallback and for anything that wants the fixed print.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { ROOT } from "../data/lib.mjs";

const SRC = join(ROOT, "art-src", "dore");
const OUT = join(ROOT, "public", "art", "heroes");

const HEROES = [
  { plate: "dore-001", title: "The Creation of Light", algo: "atkinson" },
  { plate: "dore-021", title: "Jacob's Dream", algo: "atkinson" },
  { plate: "dore-010", title: "The Confusion of Tongues", algo: "atkinson" },
  { plate: "dore-193", title: "The Annunciation", algo: "atkinson" },
  { plate: "dore-194", title: "The Nativity", algo: "bayer" },
  { plate: "dore-196", title: "The Temptation of Jesus", algo: "atkinson" },
  { plate: "dore-182", title: "The Resurrection", algo: "atkinson" },
  { plate: "dore-224", title: "The Descent of the Spirit", algo: "blue" },
  { plate: "dore-236", title: "St. John at Patmos", algo: "blue" },
  { plate: "dore-241", title: "The New Jerusalem", algo: "atkinson" },
  { plate: "dore-097", title: "Elijah Taken Up in a Chariot of Fire", algo: "atkinson" },
];

const WIDTH = 720; // drawn at 2x with pixelated scaling: chunky, deliberate dots
const TONE_WIDTH = 1200; // live dithering at 2 px dots covers a 2400 px wide hero

function atkinson(g, w, h) {
  const px = Float32Array.from(g);
  const out = new Uint8Array(w * h);
  const spread = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const ink = px[i] < 128;
      out[i] = ink ? 1 : 0;
      const err = (px[i] - (ink ? 0 : 255)) / 8;
      for (const [dx, dy] of spread) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < w && yy < h) px[yy * w + xx] += err;
      }
    }
  return out;
}

function bayerMatrix(n) {
  if (n === 1) return [[0]];
  const m = bayerMatrix(n / 2);
  const out = [];
  for (let y = 0; y < n; y++) {
    out.push([]);
    for (let x = 0; x < n; x++) {
      const q = m[y % (n / 2)][x % (n / 2)] * 4;
      out[y].push(q + [[0, 2], [3, 1]][Math.floor(y / (n / 2))][Math.floor(x / (n / 2))]);
    }
  }
  return out;
}

function bayer(g, w, h) {
  const m = bayerMatrix(8);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) out[y * w + x] = g[y * w + x] < ((m[y % 8][x % 8] + 0.5) / 64) * 255 ? 1 : 0;
  return out;
}

/** Void-and-cluster blue noise mask (Ulichney), small and tiled. */
function blueNoise(n = 32, sigma = 1.5) {
  const N = n * n;
  const energy = new Float64Array(N);
  const on = new Uint8Array(N);
  const kernel = (a, b) => {
    let dx = Math.abs((a % n) - (b % n)), dy = Math.abs(Math.floor(a / n) - Math.floor(b / n));
    dx = Math.min(dx, n - dx);
    dy = Math.min(dy, n - dy);
    return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
  };
  const toggle = (i, v) => {
    on[i] = v;
    for (let j = 0; j < N; j++) energy[j] += (v ? 1 : -1) * kernel(i, j);
  };
  // Seed ~10% randomly (deterministic LCG), then relax: swap tightest cluster and largest void.
  let seed = 12345;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let k = 0; k < N / 10; k++) toggle(Math.floor(rand() * N), 1);
  const argmax = (pred) => { let b = -1, bv = -Infinity; for (let i = 0; i < N; i++) if (pred(i) && energy[i] > bv) { bv = energy[i]; b = i; } return b; };
  const argmin = (pred) => { let b = -1, bv = Infinity; for (let i = 0; i < N; i++) if (pred(i) && energy[i] < bv) { bv = energy[i]; b = i; } return b; };
  for (let it = 0; it < N; it++) {
    const c = argmax((i) => on[i]);
    toggle(c, 0);
    const v = argmin((i) => !on[i]);
    if (v === c) { toggle(c, 1); break; }
    toggle(v, 1);
  }
  const rank = new Float64Array(N);
  const ones = on.reduce((a, b) => a + b, 0);
  const saved = Uint8Array.from(on);
  const savedE = Float64Array.from(energy);
  for (let r = ones - 1; r >= 0; r--) { const c = argmax((i) => on[i]); toggle(c, 0); rank[c] = r; }
  on.set(saved); energy.set(savedE);
  for (let r = ones; r < N; r++) { const v = argmin((i) => !on[i]); toggle(v, 1); rank[v] = r; }
  return { n, rank: Array.from(rank, (r) => (r + 0.5) / N) };
}

function blue(g, w, h) {
  const { n, rank } = blueNoise();
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) out[y * w + x] = g[y * w + x] < rank[(y % n) * n + (x % n)] * 255 ? 1 : 0;
  return out;
}

const ALGOS = { atkinson, bayer, blue };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const plates = JSON.parse(readFileSync(join(SRC, "manifest.json"), "utf8"));
  const done = [];
  for (const h of HEROES) {
    const p = plates.find((x) => x.id === h.plate);
    if (!p) { console.log(`  missing plate ${h.plate}`); continue; }
    const { data, info } = await sharp(readFileSync(join(SRC, `${h.plate}.img`)))
      .grayscale()
      .resize({ width: WIDTH })
      .normalise({ lower: 1, upper: 96 })
      .gamma(1.2) // lift shadows a touch so dark plates don't dither to solid
      .raw()
      .toBuffer({ resolveWithObject: true });
    const bits = ALGOS[h.algo](data, info.width, info.height);
    const rgba = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0; i < bits.length; i++) rgba[i * 4 + 3] = bits[i] ? 255 : 0;
    const file = `${h.plate}.png`;
    await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ palette: true, colours: 2, compressionLevel: 9 })
      .toFile(join(OUT, file));
    const tone = `${h.plate}-tone.jpg`;
    await sharp(readFileSync(join(SRC, `${h.plate}.img`)))
      .grayscale()
      .resize({ width: TONE_WIDTH })
      .normalise({ lower: 1, upper: 96 })
      .gamma(1.2)
      .jpeg({ quality: 76, mozjpeg: true })
      .toFile(join(OUT, tone));
    done.push({ id: `hero-${h.plate}`, plate: h.plate, title: h.title, algo: h.algo, file, tone, width: info.width, height: info.height });
    console.log(`  ${h.plate} ${h.algo} ${info.width}x${info.height}`);
  }
  writeFileSync(join(OUT, "heroes.json"), JSON.stringify(done));
}

await main();

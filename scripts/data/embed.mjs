// Semantic index: every verse embedded with a small open sentence model, so
// the app can find "verses about X" that never use the word X. Also lays out a
// 2D map of Scripture (UMAP over the embeddings) for the Topics page.
//
//   node scripts/data/embed.mjs          (after build-bible.mjs; ~5 min on CPU)
//
// Model: BAAI bge-small-en-v1.5 (MIT), int8 ONNX via transformers.js. The same
// model files are copied to public/models so the app embeds queries offline
// with identical weights. Text: the WEB (modern English matches modern
// questions better), falling back to the KJV where the WEB lacks a verse.
// Output: int8 vectors over the KJV verse index, plus per-verse 2D positions.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { env, pipeline } from "@huggingface/transformers";
import { UMAP } from "umap-js";
import { OUT, ROOT, SRC, writeBin } from "./lib.mjs";

export const MODEL = "Xenova/bge-small-en-v1.5";
const DIM = 384;
const CACHE = join(SRC, "models");
env.cacheDir = CACHE;

const read = (p) => JSON.parse(readFileSync(join(OUT, p), "utf8"));
const clean = (s) => s.replace(/\[([^\]]*)\]/g, "$1").replace(/[⸢⸣]/g, "").replace(/¶\s*/g, "").replace(/\s+/g, " ").trim();

function verseTexts(refs) {
  const text = new Map();
  for (const id of ["kjv", "web", "enoch"]) {
    for (const b of read(`bible/${id}.json`).books)
      for (const c of b.chapters) for (const [v, t] of c.v) if (t) text.set(`${b.osis}.${c.c}.${v}`, clean(t)); // web overwrites kjv
  }
  return refs.map((r) => text.get(r) ?? "");
}

function copyModel() {
  // transformers.js caches as <cacheDir>/<org>/<name>/...; mirror the files the browser needs.
  const from = join(CACHE, MODEL);
  const to = join(ROOT, "public", "models", MODEL);
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)).map((x) => join(f, x)) : [f]));
  for (const f of walk(from)) {
    mkdirSync(join(to, f, ".."), { recursive: true });
    copyFileSync(join(from, f), join(to, f));
  }
  console.log(`  model copied to public/models/${MODEL}`);
}

async function main() {
  const refs = read("refs.json");
  const texts = verseTexts(refs);
  const extract = await pipeline("feature-extraction", MODEL, { dtype: "q8" });
  const vecs = new Int8Array(refs.length * DIM);
  const f32 = new Float32Array(refs.length * DIM);
  const B = 64;
  const t0 = Date.now();
  for (let i = 0; i < refs.length; i += B) {
    const batch = texts.slice(i, i + B).map((t) => t || " ");
    const out = await extract(batch, { pooling: "cls", normalize: true });
    const data = out.data;
    for (let k = 0; k < batch.length; k++)
      for (let d = 0; d < DIM; d++) {
        const x = data[k * DIM + d];
        f32[(i + k) * DIM + d] = x;
        // Unit vectors have components well inside [-0.5, 0.5]; scale for int8 precision.
        vecs[(i + k) * DIM + d] = Math.max(-127, Math.min(127, Math.round(x * 400)));
      }
    if ((i / B) % 20 === 0) process.stdout.write(`\r  embedded ${i + batch.length}/${refs.length} (${Math.round((Date.now() - t0) / 1000)}s)   `);
  }
  console.log();
  writeBin("embeddings.i8", vecs);
  writeFileSync(join(OUT, "embeddings.json"), JSON.stringify({ model: MODEL, dim: DIM, count: refs.length, scale: 400, query: "Represent this sentence for searching relevant passages: " }));
  copyModel();

  // The Scripture map: UMAP to 2D over a cosine neighbourhood. Deterministic seed.
  console.log("  laying out the map (UMAP)");
  let seed = 42;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rows = Array.from({ length: refs.length }, (_, i) => Array.from(f32.subarray(i * DIM, (i + 1) * DIM)));
  const umap = new UMAP({ nComponents: 2, nNeighbors: 15, minDist: 0.08, random, nEpochs: 200 });
  const pos = umap.fit(rows);
  const xs = pos.map((p) => p[0]), ys = pos.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const map = new Uint16Array(refs.length * 2);
  pos.forEach(([x, y], i) => {
    map[i * 2] = Math.round(((x - x0) / (x1 - x0)) * 65535);
    map[i * 2 + 1] = Math.round(((y - y0) / (y1 - y0)) * 65535);
  });
  writeBin("map.u16", map);
  console.log(`  done in ${Math.round((Date.now() - t0) / 1000)}s`);
}

if (!existsSync(join(OUT, "refs.json"))) throw new Error("run scripts/data/build-bible.mjs first");
await main();

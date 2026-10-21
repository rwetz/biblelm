// Runs the embedding model and the vector search off the main thread.
// Model files are served locally from /models (copied there by
// scripts/data/embed.mjs); nothing is fetched from the internet.

import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

type Meta = { model: string; dim: number; count: number; scale: number; query: string };
type Req =
  | { id: number; kind: "init"; base: string }
  | { id: number; kind: "query"; text: string; k: number; allow?: Uint8Array }
  | { id: number; kind: "like"; verse: number; k: number; allow?: Uint8Array }
  | { id: number; kind: "similarity"; verses: number[] }
  | { id: number; kind: "between"; a: number; b: number; steps: number; allow?: Uint8Array };

let meta: Meta | null = null;
let vecs: Int8Array | null = null;
let extract: FeatureExtractionPipeline | null = null;
let ready: Promise<void> | null = null;

async function init(base: string) {
  const m = (await (await fetch(`${base}data/embeddings.json`)).json()) as Meta;
  const buf = await (await fetch(`${base}data/embeddings.i8`)).arrayBuffer();
  meta = m;
  vecs = new Int8Array(buf);
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = `${new URL(`${base}models/`, self.location.origin)}`;
  // pipeline()'s overloads are too wide for tsc to infer; name the one we use.
  const load = pipeline as unknown as (task: "feature-extraction", model: string, opts: { dtype: "q8" }) => Promise<FeatureExtractionPipeline>;
  extract = await load("feature-extraction", m.model, { dtype: "q8" });
}

function topK(q: Float32Array, k: number, allow?: Uint8Array, skip = -1) {
  const { dim, count } = meta!;
  const v = vecs!;
  const scores = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let s = 0;
    const o = i * dim;
    for (let d = 0; d < dim; d++) s += q[d] * v[o + d];
    scores[i] = s;
  }
  // Context smoothing: a verse borrows a little from its neighbours, since
  // single verses often lose the thread of the passage they sit in.
  const out: { verse: number; score: number }[] = [];
  for (let i = 0; i < count; i++) {
    if (i === skip || (allow && !allow[i])) continue;
    const s = 0.8 * scores[i] + 0.1 * (scores[i - 1] ?? scores[i]) + 0.1 * (scores[i + 1] ?? scores[i]);
    if (out.length < k) {
      out.push({ verse: i, score: s });
      if (out.length === k) out.sort((a, b) => b.score - a.score);
    } else if (s > out[k - 1].score) {
      out[k - 1] = { verse: i, score: s };
      out.sort((a, b) => b.score - a.score);
    }
  }
  const norm = meta!.scale;
  return out.sort((a, b) => b.score - a.score).map((r) => ({ verse: r.verse, score: r.score / norm }));
}

self.onmessage = async (e: MessageEvent<Req>) => {
  const r = e.data;
  try {
    if (r.kind === "init") {
      ready ??= init(r.base);
      await ready;
      return self.postMessage({ id: r.id, ok: true, count: meta!.count });
    }
    await ready;
    if (!meta || !vecs || !extract) throw new Error("semantic index not loaded");
    if (r.kind === "query") {
      const out = await extract(meta.query + r.text, { pooling: "cls", normalize: true });
      return self.postMessage({ id: r.id, ok: true, results: topK(out.data as Float32Array, r.k, r.allow) });
    }
    if (r.kind === "like") {
      const q = Float32Array.from(vecs.subarray(r.verse * meta.dim, (r.verse + 1) * meta.dim), (x) => x / meta!.scale);
      return self.postMessage({ id: r.id, ok: true, results: topK(q, r.k, r.allow, r.verse) });
    }
    if (r.kind === "between") {
      // Walk the straight line between two verses in meaning-space and take
      // the nearest unvisited verse at each step: a path between two ideas.
      const dim = meta.dim, scale = meta.scale;
      const va = vecs.subarray(r.a * dim, (r.a + 1) * dim), vb = vecs.subarray(r.b * dim, (r.b + 1) * dim);
      const seen = new Set([r.a, r.b]);
      const path: { verse: number; score: number }[] = [];
      for (let k = 1; k < r.steps; k++) {
        const t = k / r.steps;
        const q = new Float32Array(dim);
        let norm = 0;
        for (let d = 0; d < dim; d++) {
          q[d] = ((1 - t) * va[d] + t * vb[d]) / scale;
          norm += q[d] * q[d];
        }
        norm = Math.sqrt(norm) || 1;
        for (let d = 0; d < dim; d++) q[d] /= norm;
        const next = topK(q, 8, r.allow).find((h) => !seen.has(h.verse));
        if (next) {
          seen.add(next.verse);
          path.push(next);
        }
      }
      return self.postMessage({ id: r.id, ok: true, results: path });
    }
    if (r.kind === "similarity") {
      // Verse-by-verse cosine matrix for a passage (the chiasm finder).
      const n = r.verses.length, dim = meta.dim;
      const m = new Float32Array(n * n);
      for (let a = 0; a < n; a++)
        for (let b = a; b < n; b++) {
          let s = 0;
          const oa = r.verses[a] * dim, ob = r.verses[b] * dim;
          for (let d = 0; d < dim; d++) s += vecs[oa + d] * vecs[ob + d];
          m[a * n + b] = m[b * n + a] = s / (meta.scale * meta.scale);
        }
      return self.postMessage({ id: r.id, ok: true, matrix: m }, { transfer: [m.buffer] });
    }
  } catch (err) {
    self.postMessage({ id: r.id, ok: false, error: String((err as Error)?.message ?? err) });
  }
};

// Semantic search over the verse index: the embedding model and the vector
// math run in a Web Worker (semantic.worker.ts) with local model files. The
// machine finds; the results are always real verses with references.

import { book } from "./canon";
import { loadIndex } from "./bible";
import type { Shelf } from "./canon";

export interface Hit {
  verse: number;
  score: number;
}

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let initP: Promise<number> | null = null;
let idle: ReturnType<typeof setTimeout> | undefined;

/** The index and model hold tens of MB; give them back after a few quiet minutes. */
const IDLE_MS = 4 * 60_000;
function stopWhenIdle() {
  clearTimeout(idle);
  idle = setTimeout(() => {
    if (pending.size > 0) return stopWhenIdle();
    worker?.terminate();
    worker = null;
    initP = null;
  }, IDLE_MS);
}

/** The chiasm finder compares every pair: past a few hundred verses that is slow and large. */
export const MAX_SIMILARITY_VERSES = 400;

function call<T>(msg: Record<string, unknown>, transfer: Transferable[] = []): Promise<T> {
  stopWhenIdle();
  if (!worker) {
    worker = new Worker(new URL("./semantic.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data);
      else p.reject(new Error(e.data.error));
    };
  }
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    worker!.postMessage({ ...msg, id }, transfer);
  });
}

/** Load the index and model. Resolves to the verse count; rejects if `pnpm data:embed` was never run. */
export function initSemantic(): Promise<number> {
  initP ??= call<{ count: number }>({ kind: "init", base: import.meta.env.BASE_URL }).then((r) => r.count);
  initP.catch(() => (initP = null));
  return initP;
}

async function allowMask(shelves: ReadonlySet<Shelf>): Promise<Uint8Array> {
  const idx = await loadIndex();
  const m = new Uint8Array(idx.refs.length);
  idx.refs.forEach((r, i) => (m[i] = shelves.has(book(r.split(".")[0])?.shelf ?? "protestant") ? 1 : 0));
  return m;
}

export async function semanticSearch(text: string, shelves: ReadonlySet<Shelf>, k = 30): Promise<Hit[]> {
  await initSemantic();
  const allow = await allowMask(shelves);
  return (await call<{ results: Hit[] }>({ kind: "query", text, k, allow }, [allow.buffer])).results;
}

export async function moreLikeThis(verse: number, shelves: ReadonlySet<Shelf>, k = 12): Promise<Hit[]> {
  await initSemantic();
  const allow = await allowMask(shelves);
  return (await call<{ results: Hit[] }>({ kind: "like", verse, k, allow }, [allow.buffer])).results;
}

/** The verses met walking the line between two verses' meanings (IDEAS.md, Interpolation). */
export async function between(a: number, b: number, shelves: ReadonlySet<Shelf>, steps = 8): Promise<Hit[]> {
  await initSemantic();
  const allow = await allowMask(shelves);
  return (await call<{ results: Hit[] }>({ kind: "between", a, b, steps, allow }, [allow.buffer])).results;
}

/** Cosine similarity of every pair of verses in a passage (the chiasm finder). */
export async function similarityMatrix(verses: number[]): Promise<Float32Array> {
  if (verses.length > MAX_SIMILARITY_VERSES) throw new Error(`Choose a passage of ${MAX_SIMILARITY_VERSES} verses or fewer.`);
  await initSemantic();
  return (await call<{ matrix: Float32Array }>({ kind: "similarity", verses })).matrix;
}

/**
 * Reciprocal rank fusion (Cormack et al. 2009): merge ranked lists without
 * comparing their scores, so exact matches and semantic matches both count.
 */
export function fuse(lists: number[][], k = 60): number[] {
  const score = new Map<number, number>();
  for (const list of lists) list.forEach((v, rank) => score.set(v, (score.get(v) ?? 0) + 1 / (k + rank + 1)));
  return [...score].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

/**
 * Chiasm score for a passage: Hebrew writers often mirrored a passage's halves
 * (A B C B' A'). In a verse-similarity matrix a chiasm shows on the
 * anti-diagonal. For each candidate centre, average the similarity of verse
 * pairs mirrored around it, against the passage's mean pair similarity.
 */
export function chiasmScan(m: Float32Array, n: number, minArms = 2) {
  let mean = 0, cnt = 0;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { mean += m[a * n + b]; cnt++; }
  mean /= cnt || 1;
  const centres: { centre: number; arms: number; lift: number }[] = [];
  for (let twice = 2; twice <= 2 * (n - 1) - 2; twice++) {
    // centre at twice/2: a verse (even) or between two verses (odd)
    let best = { arms: 0, lift: 0 };
    let sum = 0;
    for (let arm = 1; ; arm++) {
      const a = Math.floor(twice / 2) - arm + (twice % 2 ? 1 : 0);
      const b = Math.ceil(twice / 2) + arm - (twice % 2 ? 1 : 0);
      if (a < 0 || b >= n) break;
      sum += m[a * n + b] - mean;
      const lift = sum / arm;
      if (arm >= minArms && lift > best.lift) best = { arms: arm, lift };
    }
    if (best.arms) centres.push({ centre: twice / 2, ...best });
  }
  return { mean, centres: centres.sort((x, y) => y.lift - x.lift) };
}

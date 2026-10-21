// The cross-reference graph: 341k reader-voted links from OpenBible.info
// (CC-BY), over the KJV verse index. Stored as Int32 quads sorted by source
// verse: [from, toStart, toEnd, votes]. Everything here is plain graph
// algorithms; no model is involved.

import { getBinary, loadIndex, type VerseIndex } from "./bible";

export interface Link {
  from: number;
  to: number;
  toEnd: number;
  votes: number;
}

export interface Graph {
  index: VerseIndex;
  /** Links out of verse i, strongest first. */
  out: (i: number) => Link[];
  size: number;
}

let graph: Promise<Graph> | null = null;

export function loadGraph(): Promise<Graph> {
  graph ??= Promise.all([getBinary("xrefs.bin"), loadIndex()]).then(([buf, index]) => {
    const a = new Int32Array(buf);
    const n = index.refs.length;
    // CSR offsets: links of verse i live in [start[i], start[i+1]).
    const start = new Int32Array(n + 1);
    for (let k = 0; k < a.length; k += 4) start[a[k] + 1]++;
    for (let i = 0; i < n; i++) start[i + 1] += start[i];
    return {
      index,
      size: n,
      out: (i: number) => {
        const list: Link[] = [];
        for (let k = start[i]; k < start[i + 1]; k++) {
          list.push({ from: a[k * 4], to: a[k * 4 + 1], toEnd: a[k * 4 + 2], votes: a[k * 4 + 3] });
        }
        return list;
      },
    };
  });
  return graph;
}

/**
 * A study walk: personalised PageRank from one or more seed verses. The walker
 * follows cross references in proportion to their votes and teleports back to
 * the seeds with probability `alpha`, so the ranking is "what Scripture keeps
 * pointing to from here". Push-style approximation (Andersen, Chung, Lang
 * 2006): only touches the neighbourhood that matters, so it is fast.
 */
export function studyWalk(g: Graph, seeds: number[], { alpha = 0.15, epsilon = 1e-5, limit = 40 } = {}) {
  const p = new Map<number, number>();
  const r = new Map<number, number>();
  for (const s of seeds) r.set(s, 1 / seeds.length);
  const queue = [...seeds];
  const weights = new Map<number, { to: number; w: number }[]>();
  const edges = (u: number) => {
    let e = weights.get(u);
    if (!e) {
      const links = g.out(u);
      const total = links.reduce((n, l) => n + l.votes, 0);
      e = links.map((l) => ({ to: l.to, w: total ? l.votes / total : 0 }));
      weights.set(u, e);
    }
    return e;
  };
  let steps = 0;
  while (queue.length && steps++ < 200_000) {
    const u = queue.pop()!;
    const ru = r.get(u) ?? 0;
    const e = edges(u);
    if (ru < epsilon * Math.max(1, e.length)) continue;
    p.set(u, (p.get(u) ?? 0) + alpha * ru);
    r.set(u, 0);
    if (!e.length) continue;
    const spread = (1 - alpha) * ru;
    for (const { to, w } of e) {
      const before = r.get(to) ?? 0;
      const after = before + spread * w;
      r.set(to, after);
      if (after >= epsilon * Math.max(1, edges(to).length) && before < epsilon * Math.max(1, edges(to).length)) queue.push(to);
    }
  }
  const seedSet = new Set(seeds);
  return [...p]
    .filter(([v]) => !seedSet.has(v))
    .sort((x, y) => y[1] - x[1])
    .slice(0, limit)
    .map(([verse, score]) => ({ verse, score }));
}

/**
 * The strongest chain of cross references between two verses: Dijkstra with
 * cost 1/votes per hop, so well-attested links are preferred over obscure ones.
 * Searches forward from `a`; links are directional as readers entered them.
 */
export function connect(g: Graph, a: number, b: number, maxVisited = 400_000): number[] | null {
  if (a === b) return [a];
  const dist = new Map<number, number>([[a, 0]]);
  const prev = new Map<number, number>();
  // A binary heap of [cost, verse].
  const heap: [number, number][] = [[0, a]];
  const push = (x: [number, number]) => {
    heap.push(x);
    let i = heap.length - 1;
    while (i > 0) {
      const j = (i - 1) >> 1;
      if (heap[j][0] <= heap[i][0]) break;
      [heap[i], heap[j]] = [heap[j], heap[i]];
      i = j;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m], heap[i]];
        i = m;
      }
    }
    return top;
  };
  let visited = 0;
  while (heap.length && visited++ < maxVisited) {
    const [d, u] = pop();
    if (u === b) break;
    if (d > (dist.get(u) ?? Infinity)) continue;
    for (const l of g.out(u)) {
      const nd = d + 1 / Math.max(1, l.votes);
      if (nd < (dist.get(l.to) ?? Infinity)) {
        dist.set(l.to, nd);
        prev.set(l.to, u);
        push([nd, l.to]);
      }
    }
  }
  if (!prev.has(b)) return null;
  const path = [b];
  while (path[0] !== a) path.unshift(prev.get(path[0])!);
  return path;
}

// ── communities and allusions (scripts/data/graph.mjs) ──────────────────────

export interface Community {
  id: number;
  /** The OpenBible topic that best covers it: a hint, not a title. */
  topic: string;
  size: number;
  /** Most linked first: the community's centre. */
  verses: number[];
  books: [string, number][];
}

/** [NT verse, OT verse, alignment score, the shared wording] */
export type Allusion = [number, number, number, string];

const json = async <T,>(path: string): Promise<T> => JSON.parse(new TextDecoder().decode(await getBinary(path))) as T;
let communities: Promise<Community[]> | null = null;
let allusions: Promise<Allusion[]> | null = null;

export const loadCommunities = () => {
  communities ??= json<Community[]>("communities.json");
  communities.catch(() => (communities = null));
  return communities;
};
export const loadAllusions = () => {
  allusions ??= json<Allusion[]>("allusions.json");
  allusions.catch(() => (allusions = null));
  return allusions;
};

/**
 * Cross references gathered by chapter for the arc diagram: [from chapter,
 * to chapter, votes] over the chapters in canonical order, strongest first.
 */
export function chapterArcs(g: Graph, chapterOf: Int32Array, limit = 12000): [number, number, number][] {
  const sum = new Map<number, number>();
  const C = Math.max(...chapterOf) + 1;
  for (let i = 0; i < g.size; i++)
    for (const l of g.out(i)) {
      const a = chapterOf[i], b = chapterOf[l.to];
      if (a === b || a < 0 || b < 0) continue;
      const key = a < b ? a * C + b : b * C + a;
      sum.set(key, (sum.get(key) ?? 0) + l.votes);
    }
  return [...sum]
    .sort((x, y) => y[1] - x[1])
    .slice(0, limit)
    .map(([k, v]) => [Math.floor(k / C), k % C, v]);
}

// Two corpus-wide computations too slow to run in the app, done once here.
//
//   node scripts/data/graph.mjs      (after build-bible.mjs)
//
// Communities  The cross-reference graph (OpenBible, CC-BY) split into
//              clusters of passages that keep pointing at each other: themes
//              nobody had to label. Louvain modularity optimisation (Blondel
//              et al. 2008) with Leiden's guarantee (Traag et al. 2019) that
//              every community is connected: a community that falls apart into
//              pieces is split into those pieces. Each is named by the
//              OpenBible topic that best covers it.
// Allusions    Where the New Testament quotes the Old, found the way DNA is
//              aligned: shared rare three-word runs pick candidate pairs, then
//              Smith-Waterman local alignment over words scores them (KJV).
//
// Outputs (public/data): communities.json, allusions.json.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BY_OSIS, OUT, kb, writeJson } from "./lib.mjs";

const refs = JSON.parse(readFileSync(join(OUT, "refs.json"), "utf8"));
const N = refs.length;
const testament = (i) => BY_OSIS.get(refs[i].split(".")[0])?.testament;

// ── communities ─────────────────────────────────────────────────────────────

function loadEdges() {
  const a = new Int32Array(readFileSync(join(OUT, "xrefs.bin")).buffer.slice(0));
  const w = new Map();
  for (let k = 0; k < a.length; k += 4) {
    const u = a[k], v = a[k + 1], votes = a[k + 3];
    if (u === v) continue;
    const key = u < v ? u * N + v : v * N + u;
    w.set(key, (w.get(key) ?? 0) + votes);
  }
  const adj = Array.from({ length: N }, () => []);
  for (const [key, weight] of w) {
    const u = Math.floor(key / N), v = key % N;
    adj[u].push([v, weight]);
    adj[v].push([u, weight]);
  }
  return adj;
}

// Resolution (Reichardt and Bornholdt's gamma): above 1 finds smaller, tighter
// communities. Plain modularity merges the whole prophetic corpus into one.
const GAMMA = 12;

/** One level of Louvain: move nodes to the neighbouring community that most raises modularity. */
function localMoves(adj, comm, deg, m2) {
  const tot = new Float64Array(adj.length);
  for (let i = 0; i < adj.length; i++) tot[comm[i]] += deg[i];
  let moved = true, rounds = 0, any = false;
  while (moved && rounds++ < 20) {
    moved = false;
    for (let i = 0; i < adj.length; i++) {
      if (!adj[i].length) continue;
      const links = new Map();
      for (const [j, w] of adj[i]) if (j !== i) links.set(comm[j], (links.get(comm[j]) ?? 0) + w);
      const own = comm[i];
      tot[own] -= deg[i];
      let best = own, gain = (links.get(own) ?? 0) - (GAMMA * tot[own] * deg[i]) / m2;
      for (const [c, k] of links) {
        const g = k - (GAMMA * tot[c] * deg[i]) / m2;
        if (g > gain + 1e-12) {
          gain = g;
          best = c;
        }
      }
      tot[best] += deg[i];
      if (best !== own) {
        comm[i] = best;
        moved = any = true;
      }
    }
  }
  return any;
}

function louvain(adj0) {
  let adj = adj0;
  // node of the current level -> original nodes it stands for
  let members = adj0.map((_, i) => [i]);
  let m2 = 0;
  for (const l of adj0) for (const [, w] of l) m2 += w;
  for (let level = 0; level < 12; level++) {
    const deg = adj.map((l) => l.reduce((s, [, w]) => s + w, 0));
    const comm = Int32Array.from(adj.keys());
    if (!localMoves(adj, comm, deg, m2)) break;
    // Aggregate: each community becomes a node.
    const ids = new Map();
    for (const c of comm) if (!ids.has(c)) ids.set(c, ids.size);
    const next = Array.from({ length: ids.size }, () => new Map());
    const nextMembers = Array.from({ length: ids.size }, () => []);
    for (let i = 0; i < adj.length; i++) {
      const ci = ids.get(comm[i]);
      nextMembers[ci].push(...members[i]);
      for (const [j, w] of adj[i]) {
        const cj = ids.get(comm[j]);
        next[ci].set(cj, (next[ci].get(cj) ?? 0) + w);
      }
    }
    adj = next.map((mp) => [...mp]);
    members = nextMembers;
  }
  return members;
}

/** Leiden's guarantee: split any community that is not connected into its connected parts. */
function connectedParts(adj, members) {
  const out = [];
  const inC = new Int32Array(adj.length).fill(-1);
  members.forEach((ms, c) => ms.forEach((v) => (inC[v] = c)));
  const seen = new Uint8Array(adj.length);
  for (const ms of members)
    for (const s of ms) {
      if (seen[s]) continue;
      const part = [];
      const stack = [s];
      seen[s] = 1;
      while (stack.length) {
        const u = stack.pop();
        part.push(u);
        for (const [v] of adj[u]) if (!seen[v] && inC[v] === inC[s]) {
          seen[v] = 1;
          stack.push(v);
        }
      }
      out.push(part);
    }
  return out;
}

function communities() {
  const adj = loadEdges();
  const parts = connectedParts(adj, louvain(adj)).filter((p) => p.length >= 8).sort((a, b) => b.length - a.length);
  const topics = JSON.parse(readFileSync(join(OUT, "topics.json"), "utf8"));
  // Names come from Scripture's own subjects, never the "today" topics (politics, places now).
  let kinds = {};
  try {
    kinds = JSON.parse(readFileSync(join(OUT, "topic-kinds.json"), "utf8")).tags ?? {};
  } catch {}
  // Topic coverage per verse, for naming.
  const verseTopics = Array.from({ length: N }, () => []);
  topics.forEach((t, ti) => {
    for (let i = 0; i < t.p.length; i += 3) for (let v = t.p[i]; v <= Math.min(t.p[i + 1], t.p[i] + 30); v++) verseTopics[v].push(ti);
  });
  const deg = adj.map((l) => l.reduce((s, [, w]) => s + w, 0));
  const out = parts.slice(0, 600).map((p, id) => {
    const count = new Map();
    for (const v of p) for (const ti of new Set(verseTopics[v])) count.set(ti, (count.get(ti) ?? 0) + 1);
    // The topic most specific to this community: covers much of it, little beyond.
    let best = -1, bestScore = 0;
    for (const [ti, c] of count) {
      if (kinds[topics[ti].name]?.[0] === "modern") continue;
      const size = topics[ti].p.length / 3;
      const score = c / Math.sqrt(size + 4);
      if (c >= 2 && score > bestScore) {
        bestScore = score;
        best = ti;
      }
    }
    const books = new Map();
    for (const v of p) {
      const b = refs[v].split(".")[0];
      books.set(b, (books.get(b) ?? 0) + 1);
    }
    return {
      id,
      // Readers' topic that best covers it: a hint, not a title (the app leads with the books).
      topic: best >= 0 ? topics[best].name : "",
      size: p.length,
      // The most linked verses first: the community's centre.
      verses: [...p].sort((a, b) => deg[b] - deg[a]),
      books: [...books].sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  });
  const p = writeJson("communities.json", out);
  console.log(`  communities ${parts.length} (kept ${out.length}) ${kb(p)}`);
}

// ── allusions ───────────────────────────────────────────────────────────────

const STOP = new Set("the and of to that in he shall unto for i his a they be is him not them it with all thou was which my me but ye thee their have will were are from this by as so at on or an there then had when her what she we our who also if no".split(" "));

function kjvVerses() {
  const kjv = JSON.parse(readFileSync(join(OUT, "bible", "kjv.json"), "utf8"));
  const idx = new Map(refs.map((r, i) => [r, i]));
  const words = new Array(N);
  for (const b of kjv.books)
    for (const c of b.chapters)
      for (const [v, raw] of c.v) {
        const i = idx.get(`${b.osis}.${c.c}.${v}`);
        if (i === undefined) continue;
        const text = raw.replace(/[¶[\]⸢⸣]/g, "").toLowerCase();
        words[i] = text.match(/[a-z]+/g) ?? [];
      }
  return words;
}

/** Smith-Waterman over words: match +3, mismatch -1, gap -2. Returns the best score and its spans. */
function align(a, b) {
  const H = Array.from({ length: a.length + 1 }, () => new Int16Array(b.length + 1));
  let best = 0, bi = 0, bj = 0;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const s = Math.max(0, H[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 3 : -1), H[i - 1][j] - 2, H[i][j - 1] - 2);
      H[i][j] = s;
      if (s > best) {
        best = s;
        bi = i;
        bj = j;
      }
    }
  // Trace back to where the run began.
  let i = bi, j = bj;
  while (i > 0 && j > 0 && H[i][j] > 0) {
    if (H[i][j] === H[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 3 : -1)) {
      i--;
      j--;
    } else if (H[i][j] === H[i - 1][j] - 2) i--;
    else j--;
  }
  return { score: best, a: [i, bi], b: [j, bj] };
}

function allusions() {
  const words = kjvVerses();
  const ot = [], nt = [];
  for (let i = 0; i < N; i++) {
    if (!words[i]) continue;
    const t = testament(i);
    const shelf = BY_OSIS.get(refs[i].split(".")[0])?.shelf;
    if (shelf !== "protestant") continue;
    (t === "OT" ? ot : nt).push(i);
  }
  const gram = (w, k) => `${w[k]} ${w[k + 1]} ${w[k + 2]}`;
  const content = (w, k) => !(STOP.has(w[k]) && STOP.has(w[k + 1]) && STOP.has(w[k + 2]));
  const index = new Map();
  for (const i of ot) {
    const w = words[i];
    for (let k = 0; k + 2 < w.length; k++) if (content(w, k)) {
      const g = gram(w, k);
      let l = index.get(g);
      if (!l) index.set(g, (l = []));
      if (l[l.length - 1] !== i) l.push(i);
    }
  }
  const out = [];
  for (const n of nt) {
    const w = words[n];
    const hits = new Map();
    for (let k = 0; k + 2 < w.length; k++) {
      if (!content(w, k)) continue;
      const l = index.get(gram(w, k));
      // A run found in hundreds of verses is an idiom, not a quotation.
      if (!l || l.length > 12) continue;
      for (const o of l) hits.set(o, (hits.get(o) ?? 0) + 1);
    }
    const found = [];
    for (const [o, c] of hits) {
      if (c < 2) continue;
      const r = align(w, words[o]);
      // At least three words that carry meaning, not just "the son of the".
      const shared = new Set(words[o].slice(r.b[0], r.b[1]));
      const meaning = w.slice(r.a[0], r.a[1]).filter((x) => !STOP.has(x) && shared.has(x)).length;
      if (r.score >= 18 && meaning >= 3) found.push({ o, ...r });
    }
    found.sort((x, y) => y.score - x.score);
    for (const f of found.slice(0, 3)) {
      out.push([n, f.o, f.score, words[n].slice(f.a[0], f.a[1]).join(" ")]);
    }
  }
  const p = writeJson("allusions.json", out);
  console.log(`  allusions ${out.length} pairs ${kb(p)}`);
}

console.log("graph");
communities();
allusions();

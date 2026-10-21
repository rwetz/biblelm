// A suffix array per translation, built off the main thread (IDEAS.md): every
// word start in the text, sorted, so any phrase is found by two binary
// searches, with its exact count for free. The data structure behind genome
// search tools, here over Scripture.

type Req =
  | { id: number; kind: "build"; key: string; texts: string[] }
  | { id: number; kind: "find"; key: string; q: string; limit: number };

interface Index {
  text: string;
  /** Sorted word-start positions in `text`. */
  sa: Int32Array;
  /** Where each verse begins in `text`, ascending. */
  starts: Int32Array;
}

const built = new Map<string, Index>();

function build(texts: string[]): Index {
  const starts = new Int32Array(texts.length);
  let pos = 0;
  texts.forEach((t, i) => {
    starts[i] = pos;
    pos += t.length + 1;
  });
  // One string, verses separated by "\n" (sorts before every letter).
  const text = texts.join("\n").toLowerCase();
  const word: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    const isLetter = c >= 97 && c <= 122;
    const prev = i ? text.charCodeAt(i - 1) : 32;
    const prevLetter = prev >= 97 && prev <= 122;
    if (isLetter && !prevLetter) word.push(i);
  }
  // Sort by a packed four-character key first, then compare the rest only on ties.
  const key = (p: number) => ((text.charCodeAt(p) || 0) << 21) | ((text.charCodeAt(p + 1) || 0) << 14) | ((text.charCodeAt(p + 2) || 0) << 7) | (text.charCodeAt(p + 3) || 0);
  const keys = new Map<number, number>();
  for (const p of word) keys.set(p, key(p));
  word.sort((a, b) => {
    const ka = keys.get(a)!, kb = keys.get(b)!;
    if (ka !== kb) return ka - kb;
    for (let k = 4; k < 64; k++) {
      const ca = text.charCodeAt(a + k) || 0, cb = text.charCodeAt(b + k) || 0;
      if (ca !== cb) return ca - cb;
    }
    return a - b;
  });
  return { text, sa: Int32Array.from(word), starts };
}

/** Compare the suffix at p with the query, over the query's length. */
function cmp(text: string, p: number, q: string) {
  for (let k = 0; k < q.length; k++) {
    const a = text.charCodeAt(p + k) || 0, b = q.charCodeAt(k);
    if (a !== b) return a - b;
  }
  return 0;
}

function find(ix: Index, q: string, limit: number) {
  const { text, sa, starts } = ix;
  let lo = 0, hi = sa.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (cmp(text, sa[m], q) < 0) lo = m + 1;
    else hi = m;
  }
  const first = lo;
  hi = sa.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (cmp(text, sa[m], q) <= 0) lo = m + 1;
    else hi = m;
  }
  const count = lo - first;
  // Positions back to verse numbers, in canonical order.
  const pos = Array.from(sa.subarray(first, lo)).sort((a, b) => a - b);
  const verses: number[] = [];
  for (const p of pos) {
    let a = 0, b = starts.length - 1;
    while (a < b) {
      const m = (a + b + 1) >> 1;
      if (starts[m] <= p) a = m;
      else b = m - 1;
    }
    if (verses[verses.length - 1] !== a) verses.push(a);
    if (verses.length >= limit) break;
  }
  return { count, verses };
}

self.onmessage = (e: MessageEvent<Req>) => {
  const r = e.data;
  try {
    if (r.kind === "build") {
      if (!built.has(r.key)) built.set(r.key, build(r.texts));
      return self.postMessage({ id: r.id, ok: true });
    }
    const ix = built.get(r.key);
    if (!ix) throw new Error(`no index for ${r.key}`);
    return self.postMessage({ id: r.id, ok: true, ...find(ix, r.q.toLowerCase(), r.limit) });
  } catch (err) {
    self.postMessage({ id: r.id, ok: false, error: String((err as Error)?.message ?? err) });
  }
};

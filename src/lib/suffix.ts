// Exact phrase search over every translation at once, with counts, through a
// suffix array per translation (suffix.worker.ts). A phrase matches from the
// start of a word; case is ignored.

import type { Translation, Verse } from "./bible";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
const builds = new Map<string, Promise<unknown>>();
let idle: ReturnType<typeof setTimeout> | undefined;

/** A suffix array per translation adds up; drop them all after a few quiet minutes. */
const IDLE_MS = 4 * 60_000;
function stopWhenIdle() {
  clearTimeout(idle);
  idle = setTimeout(() => {
    if (pending.size > 0) return stopWhenIdle();
    worker?.terminate();
    worker = null;
    builds.clear();
  }, IDLE_MS);
}

function call<T>(msg: Record<string, unknown>): Promise<T> {
  stopWhenIdle();
  if (!worker) {
    worker = new Worker(new URL("./suffix.worker.ts", import.meta.url), { type: "module" });
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
    worker!.postMessage({ ...msg, id });
  });
}

export interface PhraseHits {
  translation: Translation;
  count: number;
  verses: Verse[];
}

/** How often `q` occurs in each translation, and its first verses. */
export async function findEverywhere(ts: Translation[], q: string, limit = 50): Promise<PhraseHits[]> {
  const phrase = q.trim().replace(/\s+/g, " ");
  if (!phrase) return [];
  return Promise.all(
    ts.map(async (t) => {
      const key = t.meta.id;
      let b = builds.get(key);
      if (!b) {
        b = call({ kind: "build", key, texts: t.ownVerses.map((v) => v.text) });
        b.catch(() => builds.delete(key));
        builds.set(key, b);
      }
      await b;
      const r = await call<{ count: number; verses: number[] }>({ kind: "find", key, q: phrase, limit });
      return { translation: t, count: r.count, verses: r.verses.map((i) => t.ownVerses[i]) };
    }),
  );
}

// Shared helpers for the offline data builders. Downloads are cached in
// data-src/ (git-ignored) so a rebuild never refetches; outputs go to
// public/data/ (also git-ignored), which Vite serves in dev and bundles in a
// release. Nothing here executes downloaded content: it is parsed as text.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const SRC = join(ROOT, "data-src");
export const OUT = join(ROOT, "public", "data");

export const BOOKS = JSON.parse(readFileSync(join(ROOT, "src/lib/data/books.json"), "utf8"));
export const BY_CODE = new Map(BOOKS.map((b) => [b.code, b]));
export const BY_OSIS = new Map(BOOKS.map((b) => [b.osis, b]));

export function ensureDir(p) {
  mkdirSync(p, { recursive: true });
  return p;
}

/** Fetch `url` into data-src/<name> unless it is already there. */
export async function cached(url, name) {
  const dest = join(SRC, name);
  if (existsSync(dest)) return readFileSync(dest);
  ensureDir(dirname(dest));
  process.stdout.write(`  fetch ${url}\n`);
  const res = await fetch(url, { headers: { "User-Agent": "BibleLM data build (+github.com/rwetz/biblelm)" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return buf;
}

export function writeJson(rel, value) {
  const p = join(OUT, rel);
  ensureDir(dirname(p));
  writeFileSync(p, JSON.stringify(value));
  return p;
}

export function writeBin(rel, typed) {
  const p = join(OUT, rel);
  ensureDir(dirname(p));
  writeFileSync(p, Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength));
  return p;
}

export function kb(p) {
  return `${Math.round(readFileSync(p).length / 1024)} KB`;
}

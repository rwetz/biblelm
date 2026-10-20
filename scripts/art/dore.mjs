// The 241 plates of Gustave Doré's La Grande Bible de Tours (1866), each tied
// to the passage it depicts.
//
//   node scripts/art/dore.mjs            # manifest + download + process
//   node scripts/art/dore.mjs --process  # reprocess cached downloads only
//
// The catalogue (title, verse, Commons file) comes from Wikipedia's list of
// the plates; the images from Wikimedia Commons, where they are tagged public
// domain (Doré died in 1883). Downloads are cached in art-src/dore/. Plates are
// NOT dithered: they are wood engravings whose hatching already reads as line
// art, and a dither grid laid over hatching produces moire. Dithering is
// reserved for hero backdrops (scripts/art/heroes.mjs).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { BOOKS, ROOT } from "../data/lib.mjs";

const SRC = join(ROOT, "art-src", "dore");
const OUT = join(ROOT, "public", "art", "dore");
const UA = { "User-Agent": "BibleLM art build (+https://github.com/rwetz/biblelm; rwetz00 at gmail)" };
const PAGE = "Gustave_Doré's_illustrations_for_La_Grande_Bible_de_Tours";

const norm = (s) => s.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim().replace(/^the /, "");
const ALIAS = new Map();
for (const b of BOOKS) {
  ALIAS.set(norm(b.name), b.osis);
  for (const a of b.aliases) ALIAS.set(norm(a), b.osis);
}

/** "Genesis 2:21-22", "I Maccabees 2:23-24", "The History of Susanna 21 (...)" -> ref. */
function parseRef(raw, section) {
  let s = raw.replace(/\[\[|\]\]/g, "").replace(/\(.*$/s, "").replace(/\[[a-z]+\]/g, "").split("/")[0].trim();
  let m = /^(.+?)\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?/.exec(s);
  if (m) {
    let osis = ALIAS.get(norm(m[1]));
    // The deuterocanonical "Esther 15" is the Greek additions.
    if (osis === "Esth" && section === "deutero") osis = "AddEsth";
    if (osis) return { book: osis, chapter: +m[2], verse: +m[3], ...(m[4] ? { verseEnd: +m[4] } : {}) };
  }
  m = /^(.+?)\s+(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(s); // single-chapter books: "Susanna 21"
  if (m && ALIAS.get(norm(m[1]))) return { book: ALIAS.get(norm(m[1])), chapter: 1, verse: +m[2] };
  if (ALIAS.get(norm(s))) return { book: ALIAS.get(norm(s)), chapter: 1, verse: 1 };
  return null;
}

const strip = (s) =>
  s.replace(/\{\{ill\|[^}]*?lt\s*=\s*([^}|]+)[^}]*\}\}/g, "$1").replace(/\{\{[^}]*\}\}/g, "")
    .replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1").replace(/\s+/g, " ").trim();

async function manifest() {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(PAGE)}&prop=wikitext&format=json&formatversion=2`;
  const wt = (await (await fetch(url, { headers: UA })).json()).parse.wikitext;
  const sections = [["ot", "The Old Testament"], ["deutero", "The Deuterocanon"], ["nt", "The New Testament"]];
  const plates = [];
  for (const [i, [section, heading]] of sections.entries()) {
    // Headings vary in spacing ("===The Old Testament===", "=== The Deuterocanon ===").
    const at = (h) => wt.search(new RegExp(`^=+\\s*${h}\\s*=+\\s*$`, "m"));
    const start = at(heading);
    const end = i + 1 < sections.length ? at(sections[i + 1][1]) : wt.search(/^==\s*References/m);
    if (start < 0) throw new Error(`heading not found: ${heading}`);
    for (const row of wt.slice(start, end).split(/\n\|-\s*\n/).slice(1)) {
      // A cell may continue on the next line ("| \n[[File:...]]"): fold those in.
      const cells = [];
      for (const l of row.split("\n")) {
        if (l.startsWith("|}")) break;
        if (l.startsWith("|")) cells.push(l.slice(1).trim());
        else if (cells.length) cells[cells.length - 1] += ` ${l.trim()}`;
      }
      if (cells.length < 4) continue;
      const n = +strip(cells[0]);
      const file = /\[\[File:([^|\]]+)/i.exec(cells[2])?.[1]?.trim().replace(/ /g, "_");
      const ref = parseRef(strip(cells[3]), section);
      if (!n || !file) continue;
      const titles = strip(cells[1]).replace(/^"|"$/g, "").split(/"\s*\(or\s*"/);
      plates.push({
        n,
        id: `dore-${String(n).padStart(3, "0")}`,
        title: titles[0].replace(/"/g, "").trim(),
        alt: titles[1]?.replace(/["()]/g, "").trim() || undefined,
        refText: strip(cells[3]).replace(/\s*\(.*$/s, ""),
        ref,
        section,
        file,
        source: `https://commons.wikimedia.org/wiki/File:${file}`,
      });
    }
  }
  const missing = plates.filter((p) => !p.ref);
  console.log(`manifest: ${plates.length} plates (${missing.length} without a parsed ref)`);
  for (const p of missing) console.log(`  no ref: ${p.n} ${p.title} [${p.refText}]`);
  return plates;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(p) {
  const dest = join(SRC, `${p.id}.img`);
  if (existsSync(dest)) return dest;
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p.file)}?width=1800`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: UA, redirect: "follow" });
    if (res.ok) {
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return dest;
    }
    if (attempt >= 4 || (res.status !== 429 && res.status < 500)) throw new Error(`${p.file}: HTTP ${res.status}`);
    await sleep(2000 * attempt);
  }
}

/**
 * A levels stretch to a positive single-channel JPEG. The app blends it into
 * the page (multiply on Vellum, so the paper melts into the parchment; a dim,
 * lamp-lit page on Nocturne, so Doré's night scenes stay night). Inverting the
 * ink into a tint mask was tried and rejected: in dark mode it turns the many
 * dark plates into glowing negatives. Hatching is high-frequency detail that
 * AVIF and WebP handle poorly; mozjpeg is the smallest (about 130 KB at 1000px
 * against 670 KB for AVIF).
 */
async function processPlate(p, srcPath) {
  const img = sharp(readFileSync(srcPath)).grayscale();
  const out = {};
  for (const [name, width] of [["full", 1000], ["thumb", 400]]) {
    const file = `${p.id}${name === "thumb" ? "-thumb" : ""}.jpg`;
    const { data, info } = await img
      .clone()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .normalise({ lower: 2, upper: 97 })
      .extractChannel(0)
      .raw()
      .toBuffer({ resolveWithObject: true });
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } })
      .jpeg({ quality: 60, mozjpeg: true })
      .toFile(join(OUT, file));
    out[name] = { file, width: info.width, height: info.height };
  }
  return out;
}

async function main() {
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const cachedManifest = join(SRC, "manifest.json");
  const onlyProcess = process.argv.includes("--process");
  const plates = onlyProcess && existsSync(cachedManifest) ? JSON.parse(readFileSync(cachedManifest, "utf8")) : await manifest();
  writeFileSync(cachedManifest, JSON.stringify(plates, null, 1));

  const done = [];
  let failed = 0;
  for (const p of plates) {
    try {
      const src = onlyProcess ? join(SRC, `${p.id}.img`) : await download(p);
      if (!existsSync(src)) throw new Error("not downloaded");
      const images = await processPlate(p, src);
      done.push({ ...p, ...images });
      process.stdout.write(`\r  ${done.length}/${plates.length} ${p.id}   `);
      if (!onlyProcess) await sleep(250);
    } catch (e) {
      failed++;
      console.log(`\n  FAILED ${p.id} ${p.title}: ${e.message}`);
    }
  }
  console.log(`\nplates: ${done.length} processed, ${failed} failed`);
  writeFileSync(join(OUT, "plates.json"), JSON.stringify(done));
  writeCredits(plates);
}

/** Provenance for every plate, committed (the images themselves are rebuilt). */
function writeCredits(plates) {
  const fmt = (r) => (r ? `${BOOKS.find((b) => b.osis === r.book)?.name ?? r.book} ${r.chapter}:${r.verse}${r.verseEnd ? `-${r.verseEnd}` : ""}` : "");
  const head = { ot: "Old Testament", deutero: "Deuterocanon", nt: "New Testament" };
  let md = "# Art credits\n\nGustave Doré (1832-1883), illustrations for *La Grande Bible de Tours* (Mame, 1866), wood engravings. Public domain.\n" +
    "Scans from Wikimedia Commons (each file's page records its source and public-domain tag). Catalogue after Wikipedia's\n" +
    "[list of the plates](https://en.wikipedia.org/wiki/Gustave_Dor%C3%A9%27s_illustrations_for_La_Grande_Bible_de_Tours).\n" +
    "Generated by `scripts/art/dore.mjs`; do not edit by hand.\n";
  for (const s of ["ot", "deutero", "nt"]) {
    md += `\n## ${head[s]}\n\n| # | Plate | Passage | Source |\n|---|---|---|---|\n`;
    for (const p of plates.filter((x) => x.section === s)) md += `| ${p.n} | ${p.title} | ${fmt(p.ref)} | [Commons](${p.source}) |\n`;
  }
  writeFileSync(join(ROOT, "docs", "art-credits.md"), md);
}

await main();

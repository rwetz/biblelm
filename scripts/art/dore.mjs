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

/**
 * Larger scans for plates whose catalogue file is a small copy (under 1000 px
 * on its long side). The OT ones are the "Doré's English Bible" series on
 * Commons; the NT ones are scans of Warsaw editions printed from
 * Doré's blocks, *Pismo Święte Starego i Nowego Testamentu* (1874, vol. 2) and
 * *Nowy Testament* (1892), and one from *Pismo Święte w obrazach Gustawa
 * Doré* (1930), from Polona, the National Library of Poland. A page scan
 * carries a `crop`, the plate's box as fractions of the page
 * [left, top, width, height], applied at download, so `.img` holds the plate
 * alone. All are public domain on Commons. Changing an entry needs that
 * plate's `.img` deleted to download again. No larger scan was found for
 * dore-165 (The Dumb Man Possessed) or dore-227 (Death of Ananias): neither
 * Warsaw edition prints them.
 */
const T2 = "Pismo_Swiete_Starego_i_Nowego_Testamentu._T._2_1874";
const NT = "Nowy_Testament_Pana_naszego_Jezusa_Chrystusa_1892";
const P30 = "Pismo_Swiete_w_obrazach_Gustawa_Dore_1930";
const EDITION = { [T2]: "Warsaw, 1874", [NT]: "Warsaw, 1892", [P30]: "Warsaw, 1930" };
const BETTER = {
  "dore-001": { file: "001.The_Creation_of_Light.jpg" },
  "dore-006": { file: "006.The_World_Is_Destroyed_by_Water.jpg" },
  "dore-009": { file: "009.Noah_Curses_Ham_and_Canaan.jpg" },
  "dore-010": { file: "010.The_Tower_of_Babel.jpg" },
  "dore-014": { file: "014.Abraham_Sends_Hagar_and_Ishmael_Away.jpg" },
  "dore-019": { file: "019.The_Meeting_of_Isaac_and_Rebekah.jpg" },
  "dore-041": { file: "041A.Moses_Breaks_the_Tables_of_the_Law.jpg" },
  "dore-042": { file: "041B.The_Spies_Return_from_the_Promised_Land.jpg" },
  "dore-046": { file: "044._The_Israelites_Cross_the_Jordan_River.jpg" },
  "dore-168": { file: `${T2}_(89476956).jpg`, crop: [0.1409, 0.2208, 0.5797, 0.5358] },
  "dore-169": { file: "Jesus_healing_the_sick_(89476181).jpg", edition: "Warsaw, 1874" },
  "dore-171": { file: `${NT}_(94131175).jpg`, crop: [0.0779, 0.15, 0.7138, 0.6535] },
  "dore-174": { file: `${T2}_(89478813).jpg`, crop: [0.1409, 0.2029, 0.5891, 0.5138] },
  "dore-175": { file: `${T2}_(89483694).jpg`, crop: [0.1419, 0.2111, 0.5729, 0.5218] },
  "dore-177": { file: `${NT}_(94131731).jpg`, crop: [0.1633, 0.1154, 0.6456, 0.7032] },
  "dore-180": { file: `${NT}_(94131797).jpg`, crop: [0.1013, 0.1559, 0.7169, 0.6532] },
  "dore-183": { file: `${T2}_(89475438).jpg`, crop: [0.1451, 0.2078, 0.5898, 0.5289] },
  "dore-184": { file: `${NT}_(94130910).jpg`, crop: [0.0862, 0.1597, 0.7135, 0.6489] },
  "dore-186": { file: `${T2}_(89479109).jpg`, crop: [0.1372, 0.2086, 0.6151, 0.5356] },
  "dore-187": { file: `${T2}_(89479213).jpg`, crop: [0.1331, 0.2059, 0.5932, 0.5324] },
  "dore-192": { file: `${NT}_(94131337).jpg`, crop: [0.1005, 0.1637, 0.7063, 0.6502] },
  "dore-193": { file: `${NT}_(94131349).jpg`, crop: [0.1042, 0.1574, 0.7047, 0.6471] },
  "dore-198": { file: `${NT}_(94131400).jpg`, crop: [0.0857, 0.1444, 0.712, 0.656] },
  "dore-199": { file: `${NT}_(94131409).jpg`, crop: [0.1107, 0.1685, 0.7073, 0.6527] },
  "dore-203": { file: `${NT}_(94131460).jpg`, crop: [0.0911, 0.1541, 0.7083, 0.6513] },
  "dore-205": { file: `${T2}_(89482051).jpg`, crop: [0.2362, 0.1469, 0.5203, 0.5812] },
  "dore-206": { file: `${T2}_(89482272).jpg`, crop: [0.143, 0.2193, 0.5792, 0.5185] },
  "dore-209": { file: `${NT}_(94131570).jpg`, crop: [0.0909, 0.1718, 0.7089, 0.6552] },
  "dore-210": { file: `${NT}_(94131268).jpg`, crop: [0.0948, 0.1455, 0.7112, 0.6476] },
  "dore-211": { file: `${T2}_(89483040).jpg`, crop: [0.1456, 0.2086, 0.5721, 0.5185] },
  "dore-217": { file: `${NT}_(94131665).jpg`, crop: [0.1096, 0.1518, 0.7036, 0.6507] },
  "dore-219": { file: `${NT}_(94131239).jpg`, crop: [0.0841, 0.1557, 0.7216, 0.6535] },
  "dore-221": { file: `${T2}_(89483941).jpg`, crop: [0.1549, 0.2141, 0.5716, 0.5173] },
  "dore-222": { file: `${T2}_(89484137).jpg`, crop: [0.156, 0.2114, 0.5693, 0.5099] },
  "dore-228": { file: "The_Death_of_Stephen_(89485178).jpg", edition: "Warsaw, 1874" },
  "dore-230": { file: `${NT}_(94131941).jpg`, crop: [0.1023, 0.1664, 0.7148, 0.6606] },
  "dore-231": { file: `${NT}_(94131963).jpg`, crop: [0.0992, 0.159, 0.718, 0.6637] },
  "dore-233": { file: "Paul_Addresses_the_Crowd_After_His_Arrest_(89485728).jpg", edition: "Warsaw, 1874" },
  "dore-235": { file: `${P30}_(92785010).jpg`, crop: [0.0917, 0.1538, 0.7138, 0.6423] },
  "dore-238": { file: `${NT}_(94132167).jpg`, crop: [0.1151, 0.1409, 0.7089, 0.6604] },
  "dore-240": { file: `${NT}_(94132185).jpg`, crop: [0.1164, 0.1646, 0.7117, 0.6595] },
  "dore-241": { file: `${T2}_(89486509).jpg`, crop: [0.1539, 0.2074, 0.5841, 0.5172] },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(p) {
  const dest = join(SRC, `${p.id}.img`);
  if (existsSync(dest)) return dest;
  // A page scan is fetched larger, since the plate is only part of the page.
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p.file)}?width=${p.crop ? 2600 : 1800}`;
  for (let attempt = 1; ; attempt++) {
    // A stalled connection would otherwise hang the build: time out and retry.
    let res, buf;
    try {
      res = await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(90_000) });
      if (res.ok) buf = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (attempt >= 4) throw new Error(`${p.file}: ${e.message}`);
      await sleep(2000 * attempt);
      continue;
    }
    if (res.ok) {
      if (!p.crop) writeFileSync(dest, buf);
      else {
        const { width, height } = await sharp(buf).metadata();
        const [l, t, w, h] = p.crop;
        const box = { left: Math.round(l * width), top: Math.round(t * height), width: Math.round(w * width), height: Math.round(h * height) };
        await sharp(buf).extract(box).grayscale().png().toFile(dest);
      }
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
  const listed = onlyProcess && existsSync(cachedManifest) ? JSON.parse(readFileSync(cachedManifest, "utf8")) : await manifest();
  const plates = listed.map((p) => {
    const b = BETTER[p.id];
    if (!b) return p;
    const edition = b.edition ?? EDITION[b.file.replace(/_\(\d+\)\.jpg$/, "")];
    return { ...p, file: b.file, source: `https://commons.wikimedia.org/wiki/File:${b.file}`, ...(b.crop ? { crop: b.crop } : {}), ...(edition ? { edition } : {}) };
  });
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
    "Where a source names an edition, the scan is of that Warsaw printing from Doré's blocks (Polona, National Library of\n" +
    "Poland), cropped to the plate.\n" +
    "Generated by `scripts/art/dore.mjs`; do not edit by hand.\n";
  for (const s of ["ot", "deutero", "nt"]) {
    md += `\n## ${head[s]}\n\n| # | Plate | Passage | Source |\n|---|---|---|---|\n`;
    for (const p of plates.filter((x) => x.section === s))
      md += `| ${p.n} | ${p.title} | ${fmt(p.ref)} | [Commons](${p.source})${p.edition ? `, ${p.edition}` : ""} |\n`;
  }
  // Keep the hand-written sections that follow the plates (the Lab's art).
  const path = join(ROOT, "docs", "art-credits.md");
  const old = existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "";
  const tail = old.search(/^## (?!Old Testament|Deuterocanon|New Testament)/m);
  writeFileSync(path, tail < 0 ? md : `${md}\n${old.slice(tail)}`);
}

await main();

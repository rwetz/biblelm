// Woodcuts and engravings beyond Doré (docs/ART.md, sources): Dürer's
// Apocalypse and St Jerome, Schnorr von Carolsfeld's Bibel in Bildern, Blake's
// Job, the Nuremberg Chronicle, the 1534 Luther Bible and a Rijksmuseum set of
// the four evangelists. They join the Doré plates (src/lib/art.ts, loadPlates)
// as plates numbered from 1001, so the same corners, spots and reader use them.
//
//   node scripts/art/woodcuts.mjs            # download + process
//   node scripts/art/woodcuts.mjs --process  # reprocess cached downloads only
//
// Only from places that allow it: Wikimedia Commons files tagged public
// domain, or museum scans released as CC0 (the Met, the Rijksmuseum, the Yale
// Center for British Art). The licence on each file page is checked when it is
// fetched and anything else is refused. Downloads are cached in
// art-src/woodcuts/; credits go to docs/woodcut-credits.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { ROOT } from "../data/lib.mjs";

const SRC = join(ROOT, "art-src", "woodcuts");
const OUT = join(ROOT, "public", "art", "woodcuts");
const UA = { "User-Agent": "BibleLM art build (+https://github.com/rwetz/biblelm; rwetz00 at gmail)" };
const ALLOWED = /^(public domain|pd|cc0|cc-zero)/i;

const SCHNORR = ["Julius Schnorr von Carolsfeld", "1860"];
const DURER = ["Albrecht Dürer", "1498"];
const schnorr = (n) => `Schnorr von Carolsfeld Bibel in Bildern 1860 ${String(n).padStart(3, "0")}.png`;

/**
 * `crop` is [left, top, width, height] as fractions of the scan, to cut a
 * detail or trim a museum mount; `trim` then cuts away the paper around a print. `role` says where the app uses it.
 */
export const WOODCUTS = [
  { n: 1001, id: "schnorr-jacobs-dream", title: "Jacob's Dream", by: SCHNORR, ref: "Gen.28.12", file: schnorr(32), role: "search corner" },
  { n: 1002, id: "schnorr-abraham-stars", title: "Abraham Counts the Stars", by: SCHNORR, ref: "Gen.15.5", file: schnorr(24), role: "no results" },
  { n: 1003, id: "schnorr-moses-sinai", title: "Moses Receives the Tablets", by: SCHNORR, ref: "Exod.31.18", file: schnorr(54), role: "model corner" },
  { n: 1004, id: "durer-jerome", title: "Saint Jerome in His Study", by: ["Albrecht Dürer", "1514"], ref: null, file: "Saint Jerome in His Study MET DP815749.jpg", crop: [0.03, 0.03, 0.94, 0.94], role: "notebooks corner" },
  { n: 1005, id: "durer-jerome-lion", title: "Jerome's Lion, Asleep", by: ["Albrecht Dürer", "1514"], ref: null, file: "Saint Jerome in His Study MET DP815749.jpg", crop: [0.06, 0.66, 0.5, 0.24], role: "empty notebook" },
  { n: 1006, id: "durer-john-elders", title: "Saint John before God and the Elders", by: DURER, ref: "Rev.4.2-4", file: "Saint John before God and the Elders, from The Apocalypse MET DP816133.jpg", crop: [0.04, 0.04, 0.92, 0.92], role: "topics corner" },
  { n: 1007, id: "durer-michael-dragon", title: "Saint Michael Fighting the Dragon", by: DURER, ref: "Rev.12.7", file: "Saint Michael Fighting the Dragon, from The Apocalypse MET DP816924.jpg", crop: [0.04, 0.04, 0.92, 0.92], role: "error" },
  { n: 1008, id: "blake-morning-stars", title: "When the Morning Stars Sang Together", by: ["William Blake", "1825"], ref: "Job.38.7", file: "William Blake - Book of Job, Plate 14, When the Morning Stars Sang Together - B1978.43.1516 - Yale Center for British Art.jpg", role: "Job 38" },
  { n: 1009, id: "nuremberg-cosmos", title: "The Creation of the World", by: ["Michael Wolgemut and Wilhelm Pleydenwurff, Nuremberg Chronicle", "1493"], ref: null, file: "Nuremberg chronicles - f 5v.png", role: "settings corner" },
  { n: 1010, id: "luther-bible-1534", title: "Title page of the Luther Bible", by: ["Lucas Cranach workshop, printed by Hans Lufft", "1534"], ref: null, file: "Title page of Luther's first edition of the entire Bible Wittenberg, 1534.png", role: "settings sidebar" },
  { n: 1011, id: "evangelist-matthew", title: "Matthew the Evangelist", by: ["Four Evangelists, book illustration", "16th century"], ref: null, book: "Matt", file: "Evangelist Matthaeus, RP-P-OB-21.769.jpg", crop: [0.1, 0.24, 0.8, 0.62], trim: true, role: "Gospel head" },
  { n: 1012, id: "evangelist-mark", title: "Mark the Evangelist", by: ["Four Evangelists, book illustration", "16th century"], ref: null, book: "Mark", file: "Evangelist Marcus, RP-P-OB-21.770.jpg", crop: [0.1, 0.24, 0.8, 0.62], trim: true, role: "Gospel head" },
  { n: 1013, id: "evangelist-luke", title: "Luke the Evangelist", by: ["Four Evangelists, book illustration", "16th century"], ref: null, book: "Luke", file: "Evangelist Lucas, RP-P-OB-21.771.jpg", crop: [0.1, 0.24, 0.8, 0.62], trim: true, role: "Gospel head" },
  { n: 1014, id: "evangelist-john", title: "John the Evangelist", by: ["Four Evangelists, book illustration", "16th century"], ref: null, book: "John", file: "Evangelist Johannes, RP-P-OB-21.772.jpg", crop: [0.1, 0.24, 0.8, 0.62], trim: true, role: "Gospel head" },
];

function parseRef(s) {
  if (!s) return null;
  const m = /^([1-4]?[A-Za-z]+)\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(s);
  if (!m) throw new Error(`bad ref ${s}`);
  return { book: m[1], chapter: +m[2], verse: +m[3], ...(m[4] ? { verseEnd: +m[4] } : {}) };
}
const refText = (r) => (r ? `${r.book} ${r.chapter}:${r.verse}${r.verseEnd ? `-${r.verseEnd}` : ""}` : "");

async function info(file) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${file}`)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=2400&format=json&formatversion=2`;
  const page = (await (await fetch(url, { headers: UA })).json()).query.pages[0];
  if (page.missing || !page.imageinfo) throw new Error(`missing on Commons: ${file}`);
  const ii = page.imageinfo[0];
  const licence = ii.extmetadata?.LicenseShortName?.value ?? "";
  if (!ALLOWED.test(licence.trim())) throw new Error(`refused ${file}: licence "${licence}" is not public domain or CC0`);
  return { url: ii.thumburl ?? ii.url, page: ii.descriptionurl, licence };
}

async function download(file) {
  const key = file.replace(/[^\w.-]+/g, "_");
  const img = join(SRC, `${key}.img`);
  const metaFile = join(SRC, `${key}.json`);
  if (existsSync(img) && existsSync(metaFile)) return { img, ...JSON.parse(readFileSync(metaFile, "utf8")) };
  const i = await info(file);
  console.log(`  fetch ${file}`);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(i.url, { headers: UA });
    if (res.ok) {
      writeFileSync(img, Buffer.from(await res.arrayBuffer()));
      break;
    }
    if (attempt >= 3 || res.status !== 429) throw new Error(`${file}: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
  }
  writeFileSync(metaFile, JSON.stringify(i));
  return { img, ...i };
}

/** Grayscale, cropped, levels stretched like the Doré plates; a full and a thumb JPEG. */
async function render(w, img) {
  let base = sharp(readFileSync(img)).flatten({ background: "#ffffff" });
  if (w.crop) {
    const { width, height } = await base.metadata();
    const [l, t, cw, ch] = w.crop;
    base = sharp(await base.extract({ left: Math.round(l * width), top: Math.round(t * height), width: Math.round(cw * width), height: Math.round(ch * height) }).toBuffer());
  }
  // A print on its mount: trim the paper around it, judged from the corner.
  if (w.trim) base = sharp(await base.trim({ threshold: 60 }).toBuffer());
  const out = {};
  for (const [name, width] of [["full", 1000], ["thumb", 400]]) {
    const file = `${w.id}${name === "thumb" ? "-thumb" : ""}.jpg`;
    const { data, info } = await base
      .clone()
      .grayscale()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .normalise({ lower: 2, upper: 97 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } }).jpeg({ quality: 62, mozjpeg: true }).toFile(join(OUT, file));
    out[name] = { file, width: info.width, height: info.height, dir: "woodcuts" };
  }
  return out;
}

async function main() {
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const onlyProcess = process.argv.includes("--process");
  const done = [];
  const credits = [];
  for (const w of WOODCUTS) {
    const d = onlyProcess ? { img: join(SRC, `${w.file.replace(/[^\w.-]+/g, "_")}.img`), ...JSON.parse(readFileSync(join(SRC, `${w.file.replace(/[^\w.-]+/g, "_")}.json`), "utf8")) } : await download(w.file);
    const imgs = await render(w, d.img);
    const ref = parseRef(w.ref);
    done.push({ n: w.n, id: w.id, title: w.title, refText: refText(ref), ref, section: ref && ["Matt", "Mark", "Luke", "John", "Acts", "Rev"].includes(ref.book) ? "nt" : "ot", source: d.page, artist: w.by[0], year: w.by[1], licence: d.licence, ...(w.book ? { book: w.book } : {}), role: w.role, ...imgs });
    credits.push(`| ${w.title} | ${w.by[0]}, ${w.by[1]} | ${w.role} | ${d.licence} | [Commons](${d.page}) |`);
  }
  writeFileSync(join(OUT, "woodcuts.json"), JSON.stringify(done));
  writeFileSync(
    join(ROOT, "docs", "woodcut-credits.md"),
    `# Woodcut and engraving credits\n\nBeyond Doré: each work is public domain; each scan is a Wikimedia Commons file tagged public domain or a museum's own CC0 release, as listed. Generated by \`scripts/art/woodcuts.mjs\`; do not edit by hand.\n\n| Work | Artist | Used for | Licence | Source |\n|---|---|---|---|---|\n${credits.join("\n")}\n`,
  );
  console.log(`  ${done.length} woodcuts -> public/art/woodcuts/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Build the verse store: one compact JSON per translation, a verse index (the
// KJV's versification is the spine every cross reference and topic keys on),
// OpenBible cross references and topics as typed arrays over that index.
//
//   node scripts/data/build-bible.mjs
//
// Sources (all public domain except OpenBible, which is CC-BY: credited in the
// app's About panel and in public/data/CREDITS.json):
//   eBible.org verse-per-line files, OpenBible.info cross references + topics.

import { unzipSync, strFromU8 } from "fflate";
import { createHash } from "node:crypto";
import { BOOKS, BY_CODE, BY_OSIS, cached, kb, writeBin, writeJson } from "./lib.mjs";
import { parseBook } from "./usfm.mjs";

const BY_USFM = new Map(BOOKS.map((b) => [b.usfm, b]));

export const TRANSLATIONS = [
  { id: "kjv", ebible: "eng-kjv", usfm: true, name: "King James Version", abbr: "KJV", language: "English", year: "1611/1769", note: "Includes the 1611 Apocrypha. The translators' supplied words are in italics; Strong's numbers and the words of Christ are marked." },
  { id: "web", ebible: "eng-web", usfm: true, name: "World English Bible", abbr: "WEB", language: "English", year: "2020", note: "Modern English, public domain, with the deuterocanon. Strong's numbers and the words of Christ are marked." },
  { id: "asv", ebible: "eng-asv", name: "American Standard Version", abbr: "ASV", language: "English", year: "1901", note: "" },
  { id: "dra", ebible: "engDRA", name: "Douay-Rheims (Challoner)", abbr: "DRA", language: "English", year: "1752", note: "Catholic canon. Psalms follow the Vulgate numbering." },
  { id: "lxx", ebible: "eng-Brenton", name: "Brenton Septuagint", abbr: "LXX", language: "English", year: "1851", note: "The Greek Old Testament in English. Old Testament only, Septuagint versification." },
  { id: "vul", ebible: "latVUC", name: "Vulgata Clementina", abbr: "VUL", language: "Latin", year: "1592", note: "Jerome's Latin, Clementine edition." },
];

const LINE = /^(\S+) (\d+):(\d+)(?:-(\d+))? ?(.*)$/;

function parseVpl(text) {
  const books = new Map(); // osis -> Map(chapter -> [[verse, text]])
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw) continue;
    const m = LINE.exec(raw);
    if (!m) { skipped++; continue; }
    const book = BY_CODE.get(m[1]);
    if (!book) { skipped++; continue; }
    const ch = +m[2], v = +m[3];
    let chapters = books.get(book.osis);
    if (!chapters) books.set(book.osis, (chapters = new Map()));
    let verses = chapters.get(ch);
    if (!verses) chapters.set(ch, (verses = []));
    verses.push([v, m[5].trim()]);
  }
  return { books, skipped };
}

/**
 * USFM (KJV, WEB): the same text as the verse-per-line files (checked by
 * check-usfm.mjs: identical for all 36,822 KJV verses) plus the words of
 * Christ inline and each verse's Strong's-tagged words on the side.
 */
async function readUsfm(t) {
  const zip = await cached(`https://ebible.org/Scriptures/${t.ebible}_usfm.zip`, `ebible/${t.ebible}_usfm.zip`);
  const books = new Map();
  const strongs = {};
  for (const [name, data] of Object.entries(unzipSync(new Uint8Array(zip)))) {
    if (!name.endsWith(".usfm")) continue;
    const book = parseBook(strFromU8(data));
    const b = BY_USFM.get(book.id);
    if (!b) continue;
    books.set(b.osis, book.chapters);
    for (const [cv, words] of book.tags) strongs[`${b.osis}.${cv}`] = words;
  }
  return { books, skipped: 0, strongs };
}

async function buildTranslation(t) {
  let parsed;
  if (t.usfm) parsed = await readUsfm(t);
  else {
    const zip = await cached(`https://ebible.org/Scriptures/${t.ebible}_vpl.zip`, `ebible/${t.ebible}_vpl.zip`);
    const files = unzipSync(new Uint8Array(zip));
    const name = Object.keys(files).find((f) => f.endsWith("_vpl.txt"));
    if (!name) throw new Error(`${t.ebible}: no _vpl.txt in zip`);
    parsed = parseVpl(strFromU8(files[name]));
  }
  const { books, skipped, strongs } = parsed;
  if (strongs) {
    const sp = writeJson(`bible/${t.id}.strongs.json`, strongs);
    console.log(`  ${t.abbr.padEnd(4)} Strong's tags on ${Object.keys(strongs).length} verses ${kb(sp)}`);
  }
  // Canonical order from books.json, not file order.
  const out = BOOKS.filter((b) => books.has(b.osis)).map((b) => ({
    osis: b.osis,
    chapters: [...books.get(b.osis)].sort((a, z) => a[0] - z[0]).map(([c, v]) => ({ c, v })),
  }));
  const verses = out.reduce((n, b) => n + b.chapters.reduce((m, c) => m + c.v.length, 0), 0);
  const { usfm: _u, ...meta } = t;
  const p = writeJson(`bible/${t.id}.json`, { ...meta, books: out });
  console.log(`  ${t.abbr.padEnd(4)} ${String(out.length).padStart(3)} books ${String(verses).padStart(6)} verses ${kb(p)}${skipped ? ` (${skipped} lines skipped)` : ""}`);
  const { usfm, ...base } = t;
  // Content address: the text itself names the edition, so a note can record
  // exactly which wording it was written against (docs/IDEAS.md).
  const hash = createHash("sha256").update(JSON.stringify(out)).digest("hex").slice(0, 16);
  return { meta: { ...base, hash, strongs: !!strongs, redLetter: !!usfm, books: out.map((b) => b.osis), verses, source: `https://ebible.org/details.php?id=${t.ebible}`, licence: "Public domain" }, data: out };
}

/** Verse index over the KJV (with Apocrypha): position i <-> "Gen.1.1". */
function buildIndex(kjv) {
  const refs = [];
  for (const b of kjv) for (const c of b.chapters) for (const [v] of c.v) refs.push(`${b.osis}.${c.c}.${v}`);
  return refs;
}

function parseOsisRange(s, idx) {
  const [a, z] = s.split("-");
  const from = idx.get(a);
  if (from === undefined) return null;
  const to = z ? idx.get(z) : from;
  return to === undefined || to < from ? [from, from] : [from, to];
}

async function buildXrefs(idx) {
  const zip = await cached("https://a.openbible.info/data/cross-references.zip", "openbible/cross-references.zip");
  const files = unzipSync(new Uint8Array(zip));
  const text = strFromU8(files[Object.keys(files).find((f) => f.endsWith(".txt"))]);
  const rows = [];
  let dropped = 0;
  for (const line of text.split(/\r?\n/).slice(1)) {
    const [from, to, votes] = line.split("\t");
    if (!to) continue;
    const f = idx.get(from);
    const r = parseOsisRange(to, idx);
    const n = +votes;
    // Negative votes mean readers judged the link wrong; keep only endorsed ones.
    if (f === undefined || !r || !(n > 0)) { dropped++; continue; }
    rows.push(f, r[0], r[1], n);
  }
  // Sort by source verse so the app can binary-search a verse's links.
  const n = rows.length / 4;
  const order = [...Array(n).keys()].sort((a, b) => rows[a * 4] - rows[b * 4] || rows[b * 4 + 3] - rows[a * 4 + 3]);
  const arr = new Int32Array(rows.length);
  order.forEach((o, i) => arr.set(rows.slice(o * 4, o * 4 + 4), i * 4));
  const p = writeBin("xrefs.bin", arr);
  console.log(`  xrefs ${n} links ${kb(p)} (${dropped} dropped)`);
}

async function buildTopics(idx) {
  const zip = await cached("https://a.openbible.info/data/topic-scores.zip", "openbible/topic-scores.zip");
  const files = unzipSync(new Uint8Array(zip));
  const text = strFromU8(files[Object.keys(files).find((f) => f.endsWith(".txt"))]);
  const topics = new Map();
  for (const line of text.split(/\r?\n/).slice(1)) {
    const [name, osis, score] = line.split("\t");
    if (!osis) continue;
    const r = parseOsisRange(osis, idx);
    if (!r) continue;
    let t = topics.get(name);
    if (!t) topics.set(name, (t = []));
    t.push(r[0], r[1], +score);
  }
  const list = [...topics].map(([name, p]) => ({ name, p })).sort((a, b) => a.name.localeCompare(b.name));
  const out = writeJson("topics.json", list);
  console.log(`  topics ${list.length} ${kb(out)}`);
}

/** Strong's Hebrew and Greek dictionaries (OpenScriptures JSON, CC-BY-SA). */
async function buildLexicon() {
  const lex = {};
  for (const [lang, file] of [["hebrew", "strongs-hebrew-dictionary.js"], ["greek", "strongs-greek-dictionary.js"]]) {
    const js = strFromU8(new Uint8Array(await cached(`https://raw.githubusercontent.com/openscriptures/strongs/master/${lang}/${file}`, `strongs/${file}`)));
    // The file is "var x = {...};" plus a licence comment: parse the object literal as JSON.
    const body = js.slice(js.indexOf("{", js.indexOf("=")), js.lastIndexOf("}") + 1);
    for (const [code, e] of Object.entries(JSON.parse(body))) {
      const key = code.replace(/^([HG])0*(d+)([a-z]?)$/i, (_, l, n, x) => `${l.toUpperCase()}${n}${x}`);
      lex[key] = { l: e.lemma ?? "", t: e.translit ?? e.xlit ?? "", p: e.pron ?? "", d: (e.strongs_def ?? "").trim(), k: (e.kjv_def ?? "").trim(), o: (e.derivation ?? "").trim() };
    }
  }
  const p = writeJson("strongs-lexicon.json", lex);
  console.log(`  lexicon ${Object.keys(lex).length} entries ${kb(p)}`);
}

async function main() {
  console.log("translations");
  const built = [];
  for (const t of TRANSLATIONS) built.push(await buildTranslation(t));
  writeJson("translations.json", built.map((b) => b.meta));

  const refs = buildIndex(built[0].data);
  writeJson("refs.json", refs);
  const idx = new Map(refs.map((r, i) => [r, i]));
  console.log(`  index ${refs.length} verses`);

  console.log("strong's");
  await buildLexicon();

  console.log("openbible");
  await buildXrefs(idx);
  await buildTopics(idx);

  writeJson("CREDITS.json", {
    texts: built.map((b) => ({ name: b.meta.name, source: b.meta.source, licence: "Public domain" })),
    data: [
      { name: "Cross references", source: "https://www.openbible.info/labs/cross-references/", licence: "CC-BY" },
      { name: "Topical Bible", source: "https://www.openbible.info/topics/", licence: "CC-BY" },
      { name: "Strong's dictionaries (JSON)", source: "https://github.com/openscriptures/strongs", licence: "CC-BY-SA (Open Scriptures); Strong's 1890 text public domain" },
      { name: "Bible Geocoding Data (places)", source: "https://github.com/openbibleinfo/Bible-Geocoding-Data", licence: "CC BY 4.0" },
      { name: "TIPNR, TAHOT, TAGNT (people, Hebrew and Greek)", source: "https://github.com/STEPBible/STEPBible-Data", licence: "CC BY 4.0, Tyndale House / STEPBible.org" },
      { name: "Natural Earth (land, rivers, lakes)", source: "https://www.naturalearthdata.com/", licence: "Public domain" },
      { name: "Daily Office Lectionary, BCP 1979 (JSON by Reuben Lillie)", source: "https://github.com/reubenlillie/daily-office", licence: "Public domain text; MIT JSON" },
      { name: "Moby-Dick (Project Gutenberg #2701)", source: "https://www.gutenberg.org/ebooks/2701", licence: "Public domain" },
    ],
  });
  if (!BY_OSIS.has("Gen")) throw new Error("books.json is broken");
}

await main();

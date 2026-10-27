// The Sub Rosa library: books read beside the Bible, never as it. Each is a
// public-domain edition, split into the sections it prints (cantos, books,
// degrees, chapters, spirits), for the cabinet's reader (docs/SUBROSA.md).
//
//   node scripts/data/library.mjs
//
// Sources, all parsed as text: Project Gutenberg plain text (Dante, Milton,
// Mackey, Pike, the Goetia) and Wikisource's rendered pages (Dionysius,
// James's Apocalypse of Peter). Output: public/data/library.json (the
// catalogue) and public/data/library/<id>.json (one text each).
//
// A paragraph starting "## " is a heading inside a section. Verse keeps its
// line breaks ("\n"); prose is joined into paragraphs.

import { pathToFileURL } from "node:url";
import { cached, htmlParas, kb, wikisource, writeJson } from "./lib.mjs";
import { between } from "./pseudepigrapha.mjs";

/** A Gutenberg book's lines, between its START and END lines. */
export async function gutenberg(id) {
  const text = (await cached(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, `gutenberg/${id}.txt`)).toString("utf8").replace(/\r\n?/g, "\n");
  const a = text.indexOf("\n", text.indexOf("*** START OF"));
  const z = text.indexOf("*** END OF");
  if (a < 0 || z < 0) throw new Error(`Gutenberg #${id}: no START or END line`);
  return text.slice(a + 1, z).split("\n");
}

/** Italics and bold marks (_x_, =x=) and footnote numbers ([12]) out. */
const plain = (s) => s.replace(/\[\d+\]/g, "").replace(/(^|[\s(“‘"'—-])_([^_]+)_/g, "$1$2").replace(/_/g, "").replace(/=([^=\n]+)=/g, "$1");

/** Lines to prose paragraphs: blank lines part them; Gutenberg's "Footnote 3:" blocks are dropped. */
export function prose(lines) {
  const out = [];
  let buf = [];
  let note = false;
  const push = () => {
    const p = plain(buf.join(" ")).replace(/\s+/g, " ").trim();
    if (p) out.push(p);
    buf = [];
  };
  for (const l of lines) {
    if (!l.trim()) {
      push();
      continue;
    }
    if (/^Footnote \d+:/.test(l.trim())) {
      push();
      note = true;
      continue;
    }
    // A footnote's body is indented, after its "Footnote n:" line; the text comes back flush.
    if (note && /^\s/.test(l)) continue;
    note = false;
    buf.push(l.trim());
  }
  push();
  return out;
}

/** Lines to verse paragraphs: blank lines (Dante's tercets) or an indented line (Milton's paragraphs) part them. */
export function verse(lines, { indentStarts = false } = {}) {
  const out = [];
  let buf = [];
  const push = () => {
    if (buf.length) out.push(plain(buf.join("\n")));
    buf = [];
  };
  for (const l of lines) {
    if (!l.trim()) {
      push();
      continue;
    }
    if (indentStarts && /^\s{2,}\S/.test(l)) push();
    buf.push(l.trim());
  }
  push();
  return out;
}

/** A section's first paragraph, when it is a subtitle ("THE TWELVE-INCH RULE AND THE COMMON GAVEL."), as its `sub`. */
function lead(section) {
  const [first, ...rest] = section.paras;
  if (!first || first.length > 90 || /[a-z]\.\s+[A-Z]/.test(first) || !rest.length) return section;
  return { ...section, sub: first.replace(/\.$/, "").replace(/^[^a-z]+$/, (t) => titleCase(t)), paras: rest };
}

/** Pictures the transcription could not carry. */
const unpictured = (paras) => paras.filter((p) => !/^\[Illustration/.test(p));

/** Sections cut where `head(line)` names one: [{ title, sub?, from, to }] over `lines`. */
function cut(lines, head) {
  const at = [];
  lines.forEach((l, i) => {
    const h = head(l, i, lines);
    if (h) at.push({ ...h, from: i + 1 });
  });
  return at.map((s, k) => ({ ...s, to: k + 1 < at.length ? at[k + 1].from - 1 : lines.length }));
}

const titleCase = (s) =>
  s
    .toLowerCase()
    .replace(/(^|[\s(“‘-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
    .replace(/\b(Of|The|And|In|On|To|A|An|Or|For|At|By|With|From)\b/g, (w, _x, i) => (i ? w.toLowerCase() : w))
    .replace(/’S\b/g, "’s")
    .replace(/'S\b/g, "'s");

const ROMAN = (n) => {
  let s = "";
  for (const [v, r] of [[50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]) while (n >= v) (s += r), (n -= v);
  return s;
};

// ── Dante, Inferno (Longfellow) ───────────────────────────────────────────

async function inferno() {
  const lines = await gutenberg(1001);
  // The contents name each canto ("Canto V. The Second Circle: The Wanton. Minos. ...").
  const subs = new Map();
  for (const l of lines) {
    const m = /^Canto ([IVXL]+)\. (.+)$/.exec(l);
    if (m) subs.set(m[1], m[2]);
  }
  const sections = cut(lines, (l) => {
    const m = /^Inferno: Canto ([IVXL]+)$/.exec(l.trim());
    return m && { title: `Canto ${m[1]}`, sub: subs.get(m[1]) };
  }).map((s) => ({ title: s.title, sub: s.sub, paras: verse(lines.slice(s.from, s.to)) }));
  if (sections.length !== 34) throw new Error(`Inferno: ${sections.length} cantos (expected 34)`);
  return {
    id: "inferno",
    title: "Inferno",
    author: "Dante Alighieri",
    translator: "Henry Wadsworth Longfellow",
    year: "1867",
    source: "https://www.gutenberg.org/ebooks/1001",
    verse: true,
    gist: "The first part of the Divine Comedy: the nine circles, from the dark wood to Lucifer frozen in the ice. The map of hell most people still carry.",
    sections,
  };
}

// ── Milton, Paradise Lost ─────────────────────────────────────────────────

async function paradiseLost() {
  const lines = await gutenberg(26);
  const start = lines.findIndex((l) => l.trim() === "Book I");
  const end = lines.findIndex((l) => l.trim() === "Transcriber’s Notes");
  // From Book VII this transcription loses the indents that open Milton's verse paragraphs.
  const body = lines.slice(start, end < 0 ? undefined : end);
  const sections = cut(body, (l) => {
    const m = /^Book ([IVX]+)$/.exec(l.trim());
    return m && { title: `Book ${m[1]}` };
  }).map((s) => ({ title: s.title, paras: verse(body.slice(s.from, s.to), { indentStarts: true }) }));
  if (sections.length !== 12) throw new Error(`Paradise Lost: ${sections.length} books (expected 12)`);
  return {
    id: "paradise-lost",
    title: "Paradise Lost",
    author: "John Milton",
    year: "1674",
    source: "https://www.gutenberg.org/ebooks/26",
    verse: true,
    gist: "The war in heaven, the fall of the rebel angels and of Adam and Eve, in twelve books. Pandemonium, and most of what we picture of Satan, start here.",
    sections,
  };
}

// ── Mackey, The Symbolism of Freemasonry ─────────────────────────────────

// Slips in the transcription's chapter titles, checked against the 1882 printing.
const MACKEY_TITLES = [["He Symbolism", "The Symbolism"], ["Instuction", "Instruction"]];
const fixTitle = (t) => MACKEY_TITLES.reduce((s, [a, b]) => s.replace(a, b), t);

async function mackey() {
  const lines = await gutenberg(11937);
  // The last of each: the contents name them too.
  const end = lines.findLastIndex((l) => l.trim() === "Footnotes");
  const index = lines.findLastIndex((l) => l.trim() === "Synoptical Index.");
  if (end < 0 || index < 0) throw new Error("Mackey: no index or footnotes");
  const chapters = cut(lines.slice(0, index), (l, i, ls) => {
    if (!/^[IVXL]+\.$/.test(l.trim())) return null;
    const t = ls.slice(i + 1, i + 5).find((x) => x.trim());
    return { title: `${l.trim()} ${titleCase(t.trim().replace(/\.$/, "").replace(/\[\d+\]/g, ""))}` };
  }).map((s) => lead({ title: fixTitle(s.title), paras: unpictured(prose(lines.slice(s.from, s.to)).slice(1)) }));
  if (chapters.length !== 31) throw new Error(`Mackey: ${chapters.length} chapters (expected 31)`);
  // The synoptical index, a glossary of the symbols, one section a letter.
  const gloss = lines.slice(index + 1, end);
  const letters = cut(gloss, (l) => (/^[A-Z]$/.test(l.trim()) ? { title: `Index: ${l.trim()}` } : null)).map((s) => ({ title: s.title, paras: prose(gloss.slice(s.from, s.to)) }));
  return {
    id: "mackey",
    title: "The Symbolism of Freemasonry",
    author: "Albert G. Mackey",
    year: "1869",
    source: "https://www.gutenberg.org/ebooks/11937",
    gist: "Why the lodge is Solomon's Temple: the Temple builders, Hiram Abif and the legend of the third degree, the pillars, the winding stairs, the lost word. With Mackey's glossary of the symbols.",
    sections: [...chapters, ...letters],
  };
}

// ── Pike, Morals and Dogma (excerpts) ─────────────────────────────────────

/** The degrees most about Solomon, his Temple and its builder, and the nineteenth, the one quoted about Lucifer. */
const PIKE_DEGREES = [1, 2, 3, 13, 19];

async function pike() {
  const lines = await gutenberg(19447);
  const degrees = cut(lines, (l, i, ls) => {
    const m = /^([IVXL]+)\.$/.exec(l.trim());
    if (!m) return null;
    const t = ls.slice(i + 1, i + 5).find((x) => x.trim());
    return { n: m[1], title: `${m[1]}. ${titleCase(t.trim().replace(/\.$/, ""))}` };
  });
  const sections = PIKE_DEGREES.map((n) => {
    const d = degrees.find((x) => x.n === ROMAN(n));
    if (!d) throw new Error(`Pike: no degree ${n}`);
    return lead({ title: d.title, paras: unpictured(prose(lines.slice(d.from, d.to)).slice(1)) });
  });
  return {
    id: "pike",
    title: "Morals and Dogma",
    author: "Albert Pike",
    year: "1871",
    source: "https://www.gutenberg.org/ebooks/19447",
    excerpt: "Five of the thirty-two degrees: the Apprentice, the Fellow-craft and the Master, the Royal Arch of Solomon, and the Grand Pontiff, where Pike's \"Lucifer, the Light-bearer\" stands.",
    gist: "The Scottish Rite's lectures, degree by degree. Pike's passage on Lucifer, the Light-bearer, is quoted more than anything else he wrote, and often without the sentence around it.",
    sections,
  };
}

// ── The Goetia ────────────────────────────────────────────────────────────

/**
 * The Book of the Goetia (Mathers, ed. Crowley, 1904), from de Laurence's
 * reprint (1916). The prefaces, the 72 spirits one by one, the notes on their
 * rank, and the glossary of names. The book's rite (the circle and its
 * implements, the conjurations and the licence to depart) is left to the
 * book itself: the cabinet shows the catalogue, not the ceremony.
 */
async function goetia() {
  const lines = await gutenberg(72679);
  const find = (re, from = 0) => {
    const i = lines.findIndex((l, k) => k >= from && re.test(l.trim()));
    if (i < 0) throw new Error(`Goetia: no line ${re}`);
    return i;
  };
  const part = (title, from, to, opts = {}) => ({ title, paras: prose(lines.slice(from + 1, to)).filter((p) => !/^Transcriber/.test(p)), ...opts });
  const preface = find(/^Preface\.$/);
  const invocation = find(/^PRELIMINARY INVOCATION\.$/);
  const initiated = find(/^THE INITIATED INTERPRETATION OF CEREMONIAL MAGIC\.$/);
  const definition = find(/^PRELIMINARY DEFINITION OF MAGIC\.$/);
  const brief = find(/^THE BRIEF INTRODUCTORY DESCRIPTION\.$/);
  const shem = find(/^SHEMHAMPHORASH\.$/);
  const obs = find(/^OBSERVATIONS\.$/);
  const rank = find(/^RESPECTIVE RANK\.$/);
  const circle = find(/^THE MAGICAL CIRCLE\.$/);
  const names = find(/^EXPLANATION OF CERTAIN NAMES USED IN THIS BOOK LEMEGETON\.$/);
  const triangle = find(/^AN EXPLANATION OF SOLOMON’S TRIANGLE/);

  // The spirits: "(1.) BAEL.—The First Principal Spirit ..." until the vessel of brass.
  const spiritLines = lines.slice(shem + 1, obs);
  const spirits = cut(spiritLines, (l) => {
    const m = /^\((\d+)\.?\) (\p{Lu}[^—]+?)\.?—/u.exec(l);
    return m && { title: `${m[1]}. ${titleCase(m[2])}`, first: l };
  }).map((s) => {
    const paras = prose([s.first, ...spiritLines.slice(s.from, s.to)]);
    return { title: s.title, paras: [paras[0].replace(/^\(\d+\.?\) [^—]+?\.?—/, ""), ...paras.slice(1)] };
  });
  if (spirits.length !== 72) throw new Error(`Goetia: ${spirits.length} spirits (expected 72)`);
  // The vessel of brass, after the 72nd, is its own section.
  const last = spirits[71];
  const vessel = last.paras.findIndex((p) => p.startsWith("THESE be the 72"));
  const sections = [
    part("Preface", preface, invocation),
    part("The Initiated Interpretation of Ceremonial Magic", initiated, definition, { sub: "Aleister Crowley" }),
    part("Preliminary Definition of Magic", definition, brief),
    part("The Lemegeton", brief, shem),
    ...spirits.slice(0, 71),
    { title: last.title, paras: last.paras.slice(0, vessel) },
    { title: "The Vessel of Brass", paras: last.paras.slice(vessel) },
    part("Observations", obs, rank),
    part("Respective Rank", rank, circle),
    part("Explanation of Certain Names", names, triangle),
  ];
  const bestiary = spiritsOf(spirits, sections.find((x) => x.title === "Respective Rank").paras);
  return {
    bestiary,
    id: "goetia",
    title: "The Goetia",
    sub: "The Lesser Key of Solomon, Book I",
    author: "translated by S. L. MacGregor Mathers, edited by Aleister Crowley",
    year: "1904",
    source: "https://www.gutenberg.org/ebooks/72679",
    excerpt: "The prefaces, the seventy-two spirits and their ranks, and the glossary. The circle, the conjurations and the licence to depart are left in the book.",
    gist: "A seventeenth-century catalogue of the seventy-two spirits Solomon is said to have shut in a brass vessel, each with a rank, a shape and a number of legions. It grew from the Testament of Solomon.",
    note: "Text from L. W. de Laurence's reprint (Chicago, 1916) of the 1904 edition.",
    sections,
  };
}

const RANK = { KINGS: "King", DUKES: "Duke", "PRINCES AND PRELATES": "Prince", MARQUISES: "Marquis", PRESIDENTS: "President", "EARLS, or COUNTS": "Earl", KNIGHTS: "Knight" };

/**
 * The bestiary's facts, by rule from the book itself: each spirit's ranks and
 * the metal of its seal from the table "Respective Rank" ("(Seal in Gold.)
 * KINGS.—(1.) Bael; (9.) Paimon; ..."), and its legions from the first "n
 * Legions" in its own section. The build stops if a spirit is missing either.
 */
export function spiritsOf(spirits, rankParas) {
  const ranks = new Map();
  for (const p of rankParas) {
    const m = /^\(Seal in ([^)]+?)\.\) (.+?)\.—(.*)$/.exec(p);
    if (!m || !RANK[m[2]]) continue;
    for (const [, n] of m[3].matchAll(/\((\d+)\.\)/g)) {
      const r = ranks.get(+n) ?? { ranks: [], metals: [] };
      r.ranks.push(RANK[m[2]]);
      const metal = m[1].replace(/ alike equal$/, "");
      if (!r.metals.includes(metal)) r.metals.push(metal);
      ranks.set(+n, r);
    }
  }
  return spirits.map((s, i) => {
    const n = i + 1;
    const [, name, aka] = /^\d+\. ([^,]+?)(?:,? (?:or )?(.+))?$/.exec(s.title) ?? [];
    const legions = /(\d+) Legions/.exec(s.paras.join(" "))?.[1];
    const r = ranks.get(n);
    if (!r || !legions || !name) throw new Error(`Goetia: spirit ${n} (${s.title}) has no rank or legions`);
    return { n, name, ...(aka ? { aka: aka.split(/,? or |, /) } : {}), ranks: r.ranks, metals: r.metals, legions: +legions, section: s.title };
  });
}

// ── Wikisource: Dionysius, James's Apocalypse of Peter ───────────────────

/** Where a Wikisource page's text ends: its notes or its licence. */
const END = /^(↑|Footnotes$|This work (was|is) |Public domain|PD-|\[edit\]$)/;

async function dionysius() {
  const sections = [];
  const NUM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
  for (const n of NUM) {
    const paras = htmlParas(await wikisource(`The Works of Dionysius the Areopagite/On the Heavenly Hierarchy/Caput ${n}`, `dionysius-${n}`));
    // The page header ends with the work's catalogue line ("...Caput VII" then the translator).
    const head = paras.findIndex((p) => /The Works of Dionysius the Areopagite — Caput/.test(p));
    // The chapter's title, then its sections ("Section I"); a short chapter has none.
    // The chapter's title, then its sections ("Section I"); a short chapter has none, and
    // one (xiv) runs its title into the text.
    if (head < 0) throw new Error(`Dionysius, Caput ${n}: the page's layout has changed`);
    let first = paras.findIndex((p, i) => i > head && /^Section I$/.test(p));
    if (first < 0 && !paras[head + 2]) {
      const p = paras[head + 1];
      const dot = p.indexOf(". ") + 1;
      paras.splice(head + 1, 1, p.slice(0, dot), p.slice(dot + 1));
    }
    if (first < 0) first = head + 2;
    const title = paras.slice(head + 1, first).join(" ");
    const body = [];
    for (const p of paras.slice(first)) {
      if (END.test(p) && p !== "[edit]") break;
      if (p === "[edit]") continue;
      const s = /^Section ([IVXL]+)$/.exec(p);
      body.push(s ? `## ${s[1]}` : p.replace(/\s*\n\s*/g, " "));
    }
    sections.push({ title: `Caput ${n}`, sub: title.replace(/\s*\n\s*/g, " "), paras: body.filter((p, i) => !(i === 0 && p === "## I")) });
  }
  return {
    id: "dionysius",
    title: "The Celestial Hierarchy",
    author: "Pseudo-Dionysius the Areopagite",
    translator: "John Parker",
    year: "1899",
    source: "https://en.wikisource.org/wiki/The_Works_of_Dionysius_the_Areopagite/On_the_Heavenly_Hierarchy",
    gist: "The nine orders of angels in three hierarchies, seraphim and cherubim and thrones down to archangels and angels. Written about 500 under the name of Paul's convert at Athens; the source of every chart of the choirs since.",
    sections,
  };
}

async function apocalypseOfPeter() {
  const all = htmlParas(await wikisource("The Apocryphal New Testament (1924)/Apocalypses/The Apocalypse of Peter", "james-peter"));
  const paras = between(all, "APOCALYPSE OF PETER", null, "Apocalypse of Peter").slice(1).map((p) => p.replace(/\s*\n\s*/g, " "));
  // James's parts, lettered: A, the quotations; B, the Akhmim fragment; C, the Bodleian leaf; D, the Ethiopic.
  const sections = [{ title: "Introduction", paras: [] }];
  for (let i = 0; i < paras.length; i++) {
    if (/^[A-E]$/.test(paras[i])) {
      const named = /^[A-Z][A-Z .,’'-]+$/.test(paras[i + 1] ?? "");
      sections.push({ title: `${paras[i]}. ${named ? titleCase(paras[i + 1]) : "The Ancient Quotations"}`, paras: [] });
      if (named) i++;
      continue;
    }
    sections[sections.length - 1].paras.push(paras[i]);
  }
  if (sections.length < 5) throw new Error(`Apocalypse of Peter: ${sections.length} parts (expected the introduction and A to D)`);
  return {
    id: "apocalypse-of-peter",
    title: "The Apocalypse of Peter",
    translator: "M. R. James",
    year: "1924",
    source: "https://en.wikisource.org/wiki/The_Apocryphal_New_Testament_(1924)/Apocalypses/The_Apocalypse_of_Peter",
    gist: "The first Christian tour of hell, each sin with its punishment. The Muratorian list of the second century names it beside John's Revelation. Kept in fragments, Greek and Ethiopic, as James set them side by side.",
    sections,
  };
}

// ── building ──────────────────────────────────────────────────────────────

async function main() {
  const texts = [await goetia(), await dionysius(), await apocalypseOfPeter(), await inferno(), await paradiseLost(), await mackey(), await pike()];
  const catalogue = [];
  const { bestiary } = texts[0];
  delete texts[0].bestiary;
  writeJson("bestiary.json", bestiary);
  console.log(`  bestiary             ${bestiary.length} spirits`);
  for (const t of texts) {
    for (const s of t.sections) if (!s.paras.length) throw new Error(`${t.title}: "${s.title}" is empty`);
    const p = writeJson(`library/${t.id}.json`, t);
    const words = t.sections.reduce((n, s) => n + s.paras.join(" ").split(/\s+/).length, 0);
    console.log(`  ${t.id.padEnd(20)} ${String(t.sections.length).padStart(3)} sections ${String(words).padStart(7)} words ${kb(p)}`);
    const { sections, ...meta } = t;
    catalogue.push({ ...meta, licence: "Public domain", words, sections: sections.map((s) => ({ title: s.title, ...(s.sub && { sub: s.sub }) })) });
  }
  writeJson("library.json", catalogue);
}

// Built when run, not when a test imports the parsers.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();

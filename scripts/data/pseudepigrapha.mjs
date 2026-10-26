// More books for the Pseudepigrapha shelf, beside 1 Enoch (enoch.mjs), each a
// companion text every translation borrows (build-bible.mjs):
//
//   Jubilees            R. H. Charles (SPCK, 1917), from Sefaria's text of it
//   Testament of Solomon F. C. Conybeare (Jewish Quarterly Review, 1898)
//   Gospel of Nicodemus, Apocalypse of Paul
//                       M. R. James, The Apocryphal New Testament (1924)
//
// Wikisource pages come as rendered HTML (lib.mjs, `htmlParas`), Sefaria as
// JSON; both are read as text. A verse number counts only where it is the
// next one, or close after it, so a number in the prose is never a marker.
// Text an editor set before the first number of a chapter joins its verse 1.

import { htmlParas, wikisource, cached } from "./lib.mjs";
import { roman } from "./enoch.mjs";

/** The paragraphs from the one starting `from` (or matching it) up to the one starting `to` (or the footnotes). */
export function between(paras, from, to, what) {
  const starts = (p, s) => (s instanceof RegExp ? s.test(p) : p.startsWith(s));
  const a = paras.findIndex((p) => starts(p, from));
  if (a < 0) throw new Error(`${what}: the text's layout has changed (no "${from}")`);
  let z = to ? paras.findIndex((p, i) => i > a && starts(p, to)) : -1;
  if (z < 0) z = paras.findIndex((p, i) => i > a && (p.startsWith("↑") || p === "Footnotes"));
  if (z < 0) throw new Error(`${what}: the text's layout has changed (no "${to ?? "Footnotes"}")`);
  return paras.slice(a, z);
}

const tidy = (s) =>
  s
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s+([,;:.!?’”])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Number markers in running text: "1 At what time", "12. And", at the start
 * of a paragraph or after a sentence. Returns [[verse, text]] for one chapter.
 * `dotted` for Conybeare's "12." style.
 */
export function numbered(paras, { dotted = false, max = 999 } = {}) {
  const verses = new Map();
  let v = 0;
  const add = (n, t) => {
    const s = tidy(t);
    if (!s) return;
    verses.set(n, verses.has(n) ? `${verses.get(n)} ${s}` : s);
  };
  const MARK = dotted ? /(?:^|(?<=[.;:?!’”)\]…] ))(\d{1,3})\. (?=\S)/g : /(?:^|(?<=[.;:?!’”)\]…,] ))(\d{1,3}) (?=[A-Z(\[‘“'])/g;
  for (const p of paras) {
    let from = 0;
    let at = v || 1;
    for (const m of p.matchAll(MARK)) {
      const n = +m[1];
      // The next verse, or one a few on (James and Conybeare skip a number now and then).
      if (n <= v || n > v + 4 || n > max) continue;
      add(at, p.slice(from, m.index));
      v = at = n;
      from = m.index + m[0].length;
    }
    add(at, p.slice(from));
  }
  return [...verses].sort((a, b) => a[0] - b[0]);
}

// ── the Testament of Solomon ──────────────────────────────────────────────

// A slip in the transcription, checked against the scan: a comma for the point.
const CONYBEARE_FIXES = [["12, And the angel bade", "12. And the angel bade"]];

/** Conybeare numbers his paragraphs through the book (1 to 130): one chapter of them. */
export function parseConybeare(paras, fixes = CONYBEARE_FIXES) {
  for (const [from, to] of fixes) {
    const i = paras.findIndex((p) => p.startsWith(from));
    if (i < 0) throw new Error(`Testament of Solomon: a known slip is gone (${from}); check CONYBEARE_FIXES`);
    paras = paras.with(i, to + paras[i].slice(from.length));
  }
  const body = between(paras, "1. Testament of Solomon", null, "Testament of Solomon");
  return [{ c: 1, v: numbered(body, { dotted: true }) }];
}

// ── James: chapters headed by a Roman numeral, verses by Arabic ───────────

/** Chapters of James's text: a paragraph that is only a numeral ("IV", or "II (XVIII)", the second the running number) heads one. */
export function parseJamesChapters(paras) {
  const chapters = [];
  let cur = null;
  for (const p of paras) {
    const h = /^([IVXL]+)(?: \(([IVXL]+)\))?$/.exec(p);
    if (h) {
      cur = { c: roman(h[2] ?? h[1]), paras: [] };
      chapters.push(cur);
      continue;
    }
    // James's own notes between the chapters, in square brackets.
    if (/^\[[^\]]*\]$/.test(p)) continue;
    cur?.paras.push(p);
  }
  return chapters.map(({ c, paras }) => ({ c, v: numbered(paras, { max: 60 }) }));
}

/**
 * The Gospel of Nicodemus as most readers have met it: Part I, the Acts of
 * Pilate (Greek, recension A, chapters i-xvi), then Part II, the Descent
 * into Hell, in the Latin A text James translates first (xvii-xxix). The
 * prologue, absent from some manuscripts, and James's notes are left out.
 */
export function parseNicodemus(paras) {
  const one = between(paras, /^I$/, "The Coptic agrees", "Gospel of Nicodemus, part I");
  const two = between(paras, "Latin A.", "Greek.", "Gospel of Nicodemus, part II").slice(1);
  return [...parseJamesChapters(one), ...parseJamesChapters(two)];
}

/** The Apocalypse of Paul: James's 51 numbered sections, from the full Latin, as one chapter. */
export function parsePaul(paras) {
  const body = between(paras, "But I will come to visions", "[Here the Greek, Latin, and Syriac texts end", "Apocalypse of Paul");
  return [{ c: 1, v: numbered(body, { max: 51 }) }];
}

// ── Jubilees, from Sefaria ────────────────────────────────────────────────

const SEFARIA_VERSION = "The Book of Jubilees, trans. R. H. Charles. London [1917]";

/** One chapter from Sefaria's API: an array of verses, with <br> where Charles breaks a line. */
export function parseSefariaChapter(c, json) {
  const ver = json.versions?.find((x) => x.versionTitle === SEFARIA_VERSION);
  if (!ver) throw new Error(`Jubilees ${c}: Sefaria no longer has Charles's version`);
  return { c, v: ver.text.map((t, i) => [i + 1, tidy(t.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, ""))]).filter(([, t]) => t) };
}

// ── building them ─────────────────────────────────────────────────────────

const count = (chapters) => chapters.reduce((n, c) => n + c.v.length, 0);

function check(name, chapters, wantChapters, minVerses) {
  const n = count(chapters);
  if (chapters.length !== wantChapters || n < minVerses) throw new Error(`${name}: parsed ${chapters.length} chapters, ${n} verses (expected ${wantChapters} and at least ${minVerses})`);
  return n;
}

/** The companion texts for the shelf: [{ meta, books }], one per translator. */
export async function buildPseudepigrapha() {
  const jub = [];
  for (let c = 1; c <= 50; c++) {
    const url = `https://www.sefaria.org/api/v3/texts/Book_of_Jubilees.${c}?version=${encodeURIComponent(`english|${SEFARIA_VERSION}`)}`;
    jub.push(parseSefariaChapter(c, JSON.parse((await cached(url, `sefaria/jubilees-${c}.json`)).toString("utf8"))));
  }
  check("Jubilees", jub, 50, 1300);

  const tsol = parseConybeare(htmlParas(await wikisource("The Testament of Solomon", "testament-of-solomon")));
  check("Testament of Solomon", tsol, 1, 125);

  const nic = parseNicodemus(htmlParas(await wikisource("The Apocryphal New Testament (1924)/Passion Gospels/The Gospel of Nicodemus", "james-nicodemus")));
  check("Gospel of Nicodemus", nic, 29, 75);
  const paul = parsePaul(htmlParas(await wikisource("The Apocryphal New Testament (1924)/Apocalypses/The Apocalypse of Paul", "james-paul")));
  check("Apocalypse of Paul", paul, 1, 50);

  return [
    {
      meta: { id: "jubilees", name: "Jubilees (R. H. Charles)", abbr: "Charles", language: "English", year: "1917", note: "Charles's translation of the Ethiopic, as Sefaria transcribes it.", source: "https://www.sefaria.org/Book_of_Jubilees", licence: "Public domain" },
      books: [{ osis: "Jub", chapters: jub }],
    },
    {
      meta: { id: "conybeare", name: "Testament of Solomon (F. C. Conybeare)", abbr: "Conybeare", language: "English", year: "1898", note: "Conybeare numbers his paragraphs through the book; here they are the verses of one chapter. His notes are left out.", source: "https://en.wikisource.org/wiki/The_Testament_of_Solomon", licence: "Public domain" },
      books: [{ osis: "TSol", chapters: tsol }],
    },
    {
      meta: { id: "james", name: "The Apocryphal New Testament (M. R. James)", abbr: "James", language: "English", year: "1924", note: "Nicodemus: the Acts of Pilate in Greek (A), then the Descent into Hell in Latin (A); the prologue and James's notes are left out. Paul: the full Latin, sections 1 to 51.", source: "https://en.wikisource.org/wiki/The_Apocryphal_New_Testament_(1924)", licence: "Public domain" },
      books: [
        { osis: "GosNic", chapters: nic },
        { osis: "ApPaul", chapters: paul },
      ],
    },
  ];
}

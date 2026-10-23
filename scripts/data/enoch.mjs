// 1 Enoch in R. H. Charles's translation (SPCK, 1917; public domain), from
// the Project Gutenberg transcription (#77935), for the Pseudepigrapha shelf.
//
// The book is parsed as text. Chapters open with a Roman numeral ("XLVI. 1.")
// and verses with an Arabic one ("2. And ..."), inline or at a line start. A
// numeral counts only where it is the next chapter or verse, so a number in
// the prose is never taken for a marker. Charles prints some chapters twice,
// the Ethiopic beside a Greek fragment: the Ethiopic is kept. His critical
// signs (〚 〛 ⌜ ⌝ ‹ › [ ] †) and the transcriber's _italics_ and =bold= are
// dropped, so the text reads plainly; the printed edition has them.

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100 };

export function roman(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN[s[i]], next = ROMAN[s[i + 1]] ?? 0;
    if (!v) return 0;
    n += v < next ? -v : v;
  }
  return n;
}

// Slips in the transcription, checked against the printed page: Charles moves
// lx. 25 after lx. 6, and its number lost the first digit. The markers say
// where the verse numbers jump (see prose()).
const FIXES = [
  ["inquisition.\n\n5. When the punishment", "inquisition.\n\n§60.24§\n25. When the punishment"],
  ["His patience.’\n\n7. And on that day", "His patience.’\n\n§60.6§\n7. And on that day"],
];

/** The book's body: from the title over chapter I to the printer's line. */
function body(text, fixes) {
  text = text.replace(/\r\n/g, "\n");
  for (const [from, to] of fixes) {
    if (!text.includes(from)) throw new Error(`1 Enoch: a known slip is gone (${from.slice(0, 30)}...); check FIXES`);
    text = text.replace(from, to);
  }
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l, i) => /^\s*THE BOOK OF ENOCH\s*$/.test(l) && /^\s*I-XXXVI\.\s*$/.test(lines[i + 1] ?? ""));
  const end = lines.findIndex((l) => /^PRINTED IN GREAT BRITAIN/.test(l));
  if (start < 0 || end < 0) throw new Error("1 Enoch: the text's layout has changed (no title or colophon)");
  return lines.slice(start + 2, end);
}

const indent = (l) => l.length - l.trimStart().length;

/** Drop the Greek parallels, recension letters, section headings and footnotes. */
function prose(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], t = l.trim();
    if (/^G\^/.test(t)) {
      // A Greek column: everything indented at least this far, until the text comes back.
      const k = indent(l);
      while (i + 1 < lines.length && (!lines[i + 1].trim() || indent(lines[i + 1]) >= k)) i++;
      continue;
    }
    if (t === "E") continue;
    // Section titles in capitals ("THE DREAM-VISIONS. (LXXXIII-XC.)").
    if (/^[A-Z][A-Z .,’'-]{6,}(?:\([IVXLC.-]+\))?$/.test(t)) continue;
    // The editors' notes in square brackets, signed "EDD."
    if (/^\[.*EDD\.\]$/.test(t)) continue;
    if (/^Footnote \d+:/.test(t)) {
      while (i + 1 < lines.length && (!lines[i + 1].trim() || /^\s/.test(lines[i + 1]))) i++;
      continue;
    }
    // A heading: numerals and ranges, then an italic or bold title, maybe over
    // two lines. One naming a single chapter leaves a marker ("§91.11§": the
    // text resumes at xci. 12), since some chapters start with a bare "1.".
    const head = /^\[?[IVXLC0-9][IVXLC0-9.,\-\s]*[_=]/;
    if ((head.test(t) && !/^\d*\s?_[a-z]\._/.test(t)) || /^=.*=\.?$/.test(t) || /^[IVXLC]+(?:-[IVXLC]+)?\.$/.test(t)) {
      if (!/[_=]\.?$/.test(t)) while (i + 1 < lines.length && lines[i + 1].trim() && !/[_=]\.?\s*$/.test(lines[i])) i++;
      const lead = /^\[?([IVXLC0-9][IVXLC0-9.,\-\s]*)/.exec(t)[1];
      const romans = lead.match(/[IVXLC]+/g) ?? [];
      const from = /(\d+)/.exec(lead);
      if (romans.length === 1 && head.test(t)) out.push(`§${roman(romans[0])}.${from ? +from[1] - 1 : 0}§`);
      continue;
    }
    out.push(t);
  }
  return out.join(" ").replace(/\s+/g, " ");
}

function clean(s) {
  return s
    .replace(/[〚〛⌜⌝‹›†]/g, "")
    .replace(/\[(\d+)\]/g, "")
    .replace(/[[\]]/g, "")
    .replace(/[_=]/g, "")
    .replace(/\^\{[^}]*\}|\^\w/g, "")
    .replace(/\s+([,;:.!?’”])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse the Gutenberg text into chapters: [{ c, v: [[verse, text]] }], in
 * chapter order. A chapter may be printed out of order (Charles moves
 * xci. 12-17 after xciii), so a marker like "XCI. 12." resumes that chapter.
 * `fixes` are the transcription slips to mend (tests pass none).
 */
export function parseCharles(text, fixes = FIXES) {
  const s = prose(body(text, fixes));
  const verses = new Map(); // "c.v" -> [text, ...]
  const seen = (c, v) => verses.has(`${c}.${v}`);
  // Heading markers ("§91.11§"), chapter markers ("XLVI. 1. ", "XLIV. Also"),
  // lettered half-verses Charles reorders ("6 _a._", "_b._") and verses ("12. ").
  const MARK = /§(\d+)\.(\d+)§|(?<=^|[\s‘“(])\[?(?:([IVXLC]+)\.\s+(?:\[?(\d+)\.\s+)?|(\d+)?\s?_([a-z])\._\s*|(\d+)\^[a-z]\.\s+|(\d+)\.\s+)(?=\S)/g;
  let c = 0, v = 0, from = -1;
  const flush = (to) => {
    if (!c || !v || from < 0) return;
    const t = clean(s.slice(from, to));
    if (!t) return;
    const key = `${c}.${v}`;
    if (!verses.has(key)) verses.set(key, []);
    verses.get(key).push(t);
  };
  for (const m of s.matchAll(MARK)) {
    let nc = c, nv = v;
    if (m[1]) {
      flush(m.index);
      c = +m[1];
      v = +m[2];
      from = -1;
      continue;
    }
    if (m[3]) {
      nc = roman(m[3]);
      nv = m[4] ? +m[4] : 1;
      // The next chapter, or one resumed later (Charles moves xci. 12-17 after xciii).
      const ok = !seen(nc, nv) && ((nc === c && nv > v) || nc === c + 1 || nc === c + 2 || (nv > 1 && seen(nc, nv - 1)) || (nv === 1 && nc < c));
      if (!ok) continue;
    } else if (m[6] || m[7]) {
      // A lettered part of a verse ("6 _a._", "48^b."): joined to the rest of it.
      if (m[5] || m[7]) nv = +(m[5] || m[7]);
      if (!nv || Math.abs(nv - v) > 7) continue;
    } else {
      nv = +m[8];
      // A verse not yet printed, near the last: Charles reorders a few (cvi. 14, 17, 15).
      if (seen(c, nv) || nv < 1 || Math.abs(nv - v) > 7) continue;
    }
    flush(m.index);
    c = nc;
    v = nv;
    from = m.index + m[0].length;
  }
  flush(s.length);
  const chapters = new Map();
  for (const [key, parts] of verses) {
    const t = parts.join(" ");
    const [ch, vs] = key.split(".").map(Number);
    if (!chapters.has(ch)) chapters.set(ch, []);
    chapters.get(ch).push([vs, t]);
  }
  return [...chapters]
    .sort((a, b) => a[0] - b[0])
    .map(([ch, list]) => ({ c: ch, v: list.sort((a, b) => a[0] - b[0]) }));
}

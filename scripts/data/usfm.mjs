// A small USFM reader for eBible's KJV and WEB, which carry what the
// verse-per-line files strip: Strong's numbers on each word, the words of
// Christ, supplied words and paragraph breaks.
//
// Each verse becomes the same printed form the app already reads, plus marks:
//   [supplied words]        \add ... \add*           (KJV italics)
//   ⸢words of Christ⸣       \wj ... \wj*             (red letter)
//   ¶ at the start          a \p before the verse    (paragraph)
// and, separately, the verse's tagged words: [[word, "H776"], ...].
// Footnotes and cross-reference notes are dropped; headings and psalm titles
// are not verse text.

export const WJ_OPEN = "⸢";
export const WJ_CLOSE = "⸣";

const BS = "\\";

/** Strip a verse body to printed text, collecting Strong's-tagged words. */
export function verseBody(body) {
  const words = [];
  let s = body
    // Headings, speaker labels and section references are not verse text.
    .replace(/\\(s\d?|sp|ms\d?|mr|r|cl|mt\d?|sr)\s[^\n]*/g, " ")
    // Notes (footnotes, cross references) are not text.
    .replace(/\\f\s[\s\S]*?\\f\*/g, "")
    .replace(/\\x\s[\s\S]*?\\x\*/g, "")
    .replace(/\\fe\s[\s\S]*?\\fe\*/g, "");
  // \w word|strong="H0776" \w*  (and \+w inside \wj): keep the word, record the tag.
  s = s.replace(/\\\+?w\s+([^|\\]*?)\|([^\\]*?)\\\+?w\*/g, (_, word, attrs) => {
    const m = /strong="([^"]+)"/.exec(attrs);
    if (m) {
      for (const code of m[1].split(/[\s,]+/).filter(Boolean)) {
        const norm = code.replace(/^([HG])0*(\d+)([a-z]?)$/i, (_, l, n, x) => `${l.toUpperCase()}${n}${x}`);
        words.push([word.trim(), norm]);
      }
    }
    return word;
  });
  // Closing markers first, so "\add*" is never read as an opening "\add".
  // An opening marker takes its one separating space; a closing one takes none.
  s = s
    .replace(/\\\+?add\*/g, "]")
    .replace(/\\\+?add /g, "[")
    .replace(/\\wj\*/g, WJ_CLOSE)
    .replace(/\\wj ?/g, WJ_OPEN)
    // Character styles whose text stays as is: divine name, transliteration, etc.
    .replace(/\\\+?(nd|tl|sc|bk|qt|k|it|bd|em|pn|w)\*/g, "")
    .replace(/\\\+?(nd|tl|sc|bk|qt|k|it|bd|em|pn|w) /g, "")
    // The KJV text carries its own pilcrows; the paragraph flag comes from \p or ¶.
    .replace(/¶\s*/g, "")
    // Any remaining paragraph or poetry markers.
    .replace(/\\[a-z]+[0-9]*\*?/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?’”)\]⸣])/g, "$1")
    .replace(/([\[(⸢“‘])\s+/g, "$1")
    .trim();
  // A supplied-word bracket that spans the red-letter boundary, or empty pairs, are cleaned up.
  s = s.replace(/\[\]/g, "").replace(new RegExp(`${WJ_OPEN}${WJ_CLOSE}`, "g"), "");
  return { raw: s, words };
}

/**
 * Parse one USFM book: returns { id, chapters: Map<c, [[v, raw]]>, tags: Map<"c.v", words> }.
 */
export function parseBook(text) {
  const id = /\\id\s+(\S+)/.exec(text)?.[1];
  const chapters = new Map();
  const tags = new Map();
  let c = 0;
  let pendingPara = false;
  // Split on chapter and verse markers, keeping them.
  const parts = text.split(/(\\c\s+\d+|\\v\s+\d+(?:-\d+)?)/);
  let current = null;
  let title = ""; // a psalm title (\d) belongs to the verse after it, as in eBible's VPL
  const flush = () => {
    if (!current) return;
    const para = current.para || /^\s*¶/.test(current.body.replace(/\\[a-z]+\d*\s*/g, ""));
    const { raw, words } = verseBody(current.body);
    const printed = (para ? "¶ " : "") + raw;
    if (!chapters.has(c)) chapters.set(c, []);
    chapters.get(c).push([current.v, printed]);
    if (words.length) tags.set(`${c}.${current.v}`, words);
    current = null;
  };
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const cm = /^\\c\s+(\d+)$/.exec(p);
    const vm = /^\\v\s+(\d+)/.exec(p);
    if (cm) {
      flush();
      c = +cm[1];
      pendingPara = false;
    } else if (vm) {
      flush();
      current = { v: +vm[1], body: title ? `${title} ` : "", para: pendingPara };
      title = "";
      pendingPara = false;
    } else if (current) {
      // A paragraph marker inside this chunk belongs to the NEXT verse when it
      // comes after the verse text, so split there.
      const idx = p.search(/\\(p|m|pi\d?|nb)\b(?!\*)/);
      if (idx >= 0 && p.slice(idx).replace(/\\[a-z]+\d*\s*/g, "").trim() === "") {
        current.body += p.slice(0, idx);
        pendingPara = true;
      } else current.body += p;
    } else {
      if (/\\p\b/.test(p)) pendingPara = true;
      // The title runs to the end of its line; tagged words inside it are cleaned by verseBody.
      const d = /\\d\s+([^\n]*)/.exec(p);
      if (d) title = verseBody(d[1]).raw;
    }
  }
  flush();
  return { id, chapters, tags, BS };
}

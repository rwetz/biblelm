// Compare a USFM-derived translation with its verse-per-line twin: same verses,
// same words. Run after build-bible:  node scripts/data/check-usfm.mjs eng-kjv kjv
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { BOOKS, OUT, SRC } from "./lib.mjs";
import { parseBook, WJ_CLOSE, WJ_OPEN } from "./usfm.mjs";

const [ebible = "eng-kjv", id = "kjv"] = process.argv.slice(2);
const plain = (s) =>
  s.replaceAll(WJ_OPEN, "").replaceAll(WJ_CLOSE, "").replace(/[[\]¶]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();

const files = unzipSync(new Uint8Array(readFileSync(join(SRC, "ebible", `${ebible}_usfm.zip`))));
const byUsfm = new Map(BOOKS.map((b) => [b.usfm, b]));
const usfm = new Map();
let tagged = 0, wj = 0;
for (const [name, data] of Object.entries(files)) {
  if (!name.endsWith(".usfm")) continue;
  const book = parseBook(strFromU8(data));
  const b = byUsfm.get(book.id);
  if (!b) continue;
  for (const [c, vs] of book.chapters) for (const [v, raw] of vs) {
    usfm.set(`${b.osis}.${c}.${v}`, raw);
    if (raw.includes(WJ_OPEN)) wj++;
  }
  tagged += book.tags.size;
}
const vpl = JSON.parse(readFileSync(join(OUT, "bible", `${id}.json`), "utf8"));
let same = 0, diff = 0, missing = 0;
const examples = [];
for (const b of vpl.books)
  for (const c of b.chapters)
    for (const [v, raw] of c.v) {
      const key = `${b.osis}.${c.c}.${v}`;
      const u = usfm.get(key);
      if (u === undefined) { missing++; continue; }
      if (plain(u) === plain(raw)) same++;
      else { diff++; if (examples.length < 6) examples.push([key, raw.slice(0, 90), u.slice(0, 90)]); }
    }
console.log({ usfmVerses: usfm.size, same, diff, missing, tagged, wordsOfChrist: wj });
for (const e of examples) console.log(e.join("\n   "));

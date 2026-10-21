// The interlinear: every word of the Hebrew Old Testament and the Greek New
// Testament with its transliteration, an English gloss, its Strong's number
// and its grammar, keyed by the English (KJV) verse.
//
//   node scripts/data/interlinear.mjs
//
// Source: STEPBible's Translators Amalgamated Hebrew OT (TAHOT, Leningrad
// Codex) and Greek NT (TAGNT), Tyndale House, CC BY 4.0. Parsed as text.
// The Greek is the NA28 base text (words whose edition type includes N).
//
// Output: public/data/interlinear/<Book>.json, { "c.v": [[word, translit,
// gloss, strong, grammar], ...] }, one file per book so a chapter loads alone.

import { cached, stepBook, writeJson } from "./lib.mjs";

const BASE = "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT/";
const FILES = [
  ["TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt", "tahot-1.txt"],
  ["TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt", "tahot-2.txt"],
  ["TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt", "tahot-3.txt"],
  ["TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt", "tahot-4.txt"],
  ["TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt", "tagnt-1.txt"],
  ["TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt", "tagnt-2.txt"],
];

/** "H0430G", "{H1254A}", "G2424G" -> "H430", "H1254", "G2424" (the lexicon's keys). */
const strong = (s) => {
  const m = /([HG])0*(\d+)/.exec(s);
  return m ? `${m[1]}${m[2]}` : "";
};

async function main() {
  const books = new Map();
  let words = 0;
  for (const [remote, local] of FILES) {
    const text = (await cached(BASE + encodeURIComponent(remote), `stepbible/${local}`)).toString("utf8");
    const greek = local.startsWith("tagnt");
    for (const line of text.split(/\r?\n/)) {
      // "Gen.1.1#01=L" or, where the Hebrew numbers differ, "Mal.4.1(3.19)#01=L".
      const m = /^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)(?:\([^)]*\))?#\d+=(\S+)\t/.exec(line);
      if (!m) continue;
      const osis = stepBook(m[1]);
      if (!osis) continue;
      const f = line.split("\t");
      let row;
      if (greek) {
        if (!m[4].includes("N")) continue; // not in the NA28 text
        const g = /^(.*?)\s*\((.*)\)\s*$/.exec(f[1]) ?? [, f[1], ""];
        const [code, gram] = (f[3] ?? "").split("=");
        row = [g[1].replace(/¶/g, ""), g[2], (f[2] ?? "").trim(), strong(code ?? ""), gram ?? ""];
      } else {
        if (!/[LQ]/.test(m[4])) continue; // a ketiv with its qere elsewhere
        // The main word's Strong's sits in braces; the rest are prefixes.
        const main = /\{([^}]+)\}/.exec(f[4] ?? "")?.[1] ?? f[4] ?? "";
        row = [f[1].replace(/[/\\]/g, ""),(f[2] ?? "").replace(/\//g, ""), (f[3] ?? "").replace(/\/\s*/g, " ").trim(), strong(main), f[5] ?? ""];
      }
      const key = `${m[2]}.${m[3]}`;
      let book = books.get(osis);
      if (!book) books.set(osis, (book = {}));
      (book[key] ??= []).push(row);
      words++;
    }
  }
  for (const [osis, data] of books) writeJson(`interlinear/${osis}.json`, data);
  console.log(`  interlinear ${books.size} books, ${words} words`);
}

console.log("interlinear");
await main();

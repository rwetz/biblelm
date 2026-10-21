// The Daily page's data, and the control text for the Bible-codes lesson.
//
//   node scripts/data/daily.mjs
//
// Sources, parsed as text:
//   The Daily Office Lectionary of the 1979 Book of Common Prayer (public
//   domain: the BCP has never been under copyright), as JSON by Reuben Lillie
//   (github.com/reubenlillie/daily-office, MIT). Two years of psalms and
//   lessons for every day, and the holy days.
//   Moby-Dick (Project Gutenberg #2701, public domain): the novel McKay and
//   colleagues searched for "codes" to show Genesis is not special (IDEAS.md).
//
// Outputs (public/data): lectionary.json, moby-dick.txt (letters only).

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { OUT, cached, ensureDir, kb, writeJson } from "./lib.mjs";

const DOL = "https://raw.githubusercontent.com/reubenlillie/daily-office/master/json/readings";

/** Psalms and lessons as plain labels: "Isa 1:1-9" (hyphens; the app parses them). */
function entry(e) {
  const dash = (s) => s.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  const lessons = e.lessons ?? {};
  // Holy days split morning and evening lessons; ordinary days have one set.
  const flat = { ...(lessons.morning ?? {}), ...Object.fromEntries(Object.entries(lessons).filter(([, v]) => typeof v === "string")) };
  const evening = lessons.evening ?? {};
  return {
    ...(e.season ? { season: e.season } : {}),
    ...(e.week ? { week: e.week } : {}),
    day: e.day,
    ...(e.title ? { title: e.title } : {}),
    psalms: { morning: (e.psalms?.morning ?? []).map(dash), evening: (e.psalms?.evening ?? []).map(dash) },
    lessons: Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, dash(v)])),
    ...(Object.keys(evening).length ? { evening: Object.fromEntries(Object.entries(evening).map(([k, v]) => [k, dash(v)])) } : {}),
  };
}

async function lectionary() {
  const get = async (name) => JSON.parse((await cached(`${DOL}/${name}.json`, `lectionary/${name}.json`)).toString("utf8"));
  const out = {
    source: "The Daily Office Lectionary, Book of Common Prayer (1979)",
    one: (await get("dol-year-1")).map(entry),
    two: (await get("dol-year-2")).map(entry),
    holy: (await get("dol-holy-days")).map(entry),
  };
  const p = writeJson("lectionary.json", out);
  console.log(`  lectionary ${out.one.length + out.two.length} days, ${out.holy.length} holy days ${kb(p)}`);
}

async function moby() {
  const raw = (await cached("https://www.gutenberg.org/cache/epub/2701/pg2701.txt", "gutenberg/moby-dick.txt")).toString("utf8");
  // The novel only: between Gutenberg's start and end markers, from Chapter 1 on.
  const start = raw.indexOf("*** START OF");
  const end = raw.indexOf("*** END OF");
  let body = raw.slice(raw.indexOf("\n", start) + 1, end > 0 ? end : undefined);
  const ch1 = body.search(/CHAPTER 1\. Loomings\.\s*\n\s*\n/);
  const ch1b = ch1 >= 0 ? body.indexOf("CHAPTER 1. Loomings.", ch1 + 10) : -1;
  if (ch1b > 0) body = body.slice(ch1b);
  const letters = body.toUpperCase().replace(/[^A-Z]/g, "");
  const p = join(ensureDir(OUT), "moby-dick.txt");
  writeFileSync(p, letters);
  console.log(`  moby-dick ${letters.length} letters ${kb(p)}`);
}

console.log("daily");
await lectionary();
await moby();

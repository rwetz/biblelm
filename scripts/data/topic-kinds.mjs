// Tag each of OpenBible's 6,700 topics with what kind of topic it is (a person,
// a place, a virtue, a sin...), so the Topics index can be filtered. Jev reads
// the topic's name and its most endorsed verse; the tags are stored with their
// source and confidence, and the app only filters by them (docs/ML.md: Jev
// tags offline, rules stay in code).
//
//   node scripts/data/topic-kinds.mjs    (TYPESAFE_API_KEY in the environment)
//
// Resumable: answers so far are kept in data/topic-kinds.partial.json.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib.mjs";

const KEY = process.env.TYPESAFE_API_KEY?.trim();
if (!KEY) {
  console.error("Set TYPESAFE_API_KEY first.");
  process.exit(1);
}
const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";
const PER_CALL = 20;
const PARALLEL = 4;

export const KINDS = {
  person: "A named person or people group in the Bible, such as Abraham, Mary or the Pharisees",
  place: "A place, land, city, river, mountain or building",
  god: "God, Christ or the Holy Spirit, or what they are and do: grace, salvation, the cross, the Trinity",
  virtue: "A virtue or good quality to grow in, such as patience, humility or faithfulness",
  sin: "A sin, vice or danger to avoid, such as pride, lust or gossip",
  practice: "Something believers do: worship, prayer, giving, fasting, baptism, church life",
  life: "Everyday life and relationships: marriage, children, work, money, health, aging, death",
  feeling: "An emotion or inner struggle, such as anxiety, grief, joy or loneliness",
  event: "A story, event or time: the Flood, the Exodus, the Last Supper, the end times",
  thing: "An object, creature or part of nature: bread, lions, rain, stars",
  modern: "A present-day subject the Bible does not name, such as abortion, the internet or a year",
};

const topics = JSON.parse(readFileSync(join(ROOT, "public", "data", "topics.json"), "utf8"));
const refs = JSON.parse(readFileSync(join(ROOT, "public", "data", "refs.json"), "utf8"));
const kjv = JSON.parse(readFileSync(join(ROOT, "public", "data", "bible", "kjv.json"), "utf8"));
const text = new Map();
for (const b of kjv.books) for (const c of b.chapters) for (const [v, t] of c.v) text.set(`${b.osis}.${c.c}.${v}`, t.replace(/[¶‹›]/g, "").trim());

/** The topic's most endorsed verse, for context ("Abel" the man, not the town). */
function sample(t) {
  let best = -1, at = 0;
  for (let i = 0; i < t.p.length; i += 3) if (t.p[i + 2] > best) { best = t.p[i + 2]; at = t.p[i]; }
  const ref = refs[at];
  return ref ? `${ref.replace(/\./g, " ")}: ${(text.get(ref) ?? "").slice(0, 220)}` : "";
}

const partialPath = join(ROOT, "data", "topic-kinds.partial.json");
const done = existsSync(partialPath) ? JSON.parse(readFileSync(partialPath, "utf8")) : {};
const todo = topics.filter((t) => !done[t.name]).slice(0, Number(process.env.LIMIT ?? Infinity));
console.log(`${Object.keys(done).length} tagged, ${todo.length} to go`);

async function ask(batch) {
  const state = { topics: batch.map((t) => ({ name: t.name, verse: sample(t) })) };
  const questions = Object.fromEntries(
    batch.map((_, i) => [
      `t${i}`,
      {
        type: "choice",
        instructions: `\`topics[${i}].name\` is a subject in a topical Bible index; \`topics[${i}].verse\` is the verse readers most often file under it. What kind of subject is it?`,
        criteria: KINDS,
      },
    ]),
  );
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, state, questions }),
    });
    if (res.ok) {
      const { answers } = await res.json();
      batch.forEach((t, i) => {
        const a = answers[`t${i}`];
        if (a?.choice) done[t.name] = [a.choice, Math.round((a.probabilities?.[a.choice] ?? a.confidence ?? 0) * 100) / 100];
      });
      return;
    }
    if (res.status < 500 && res.status !== 429) throw new Error(`${res.status} ${await res.text()}`);
    await new Promise((ok) => setTimeout(ok, 2000 * (attempt + 1)));
  }
  throw new Error("Jev kept failing");
}

const batches = [];
for (let i = 0; i < todo.length; i += PER_CALL) batches.push(todo.slice(i, i + PER_CALL));
let next = 0, finished = 0;
const t0 = performance.now();
await Promise.all(
  Array.from({ length: PARALLEL }, async () => {
    while (next < batches.length) {
      const b = batches[next++];
      await ask(b);
      if (++finished % 20 === 0) {
        writeFileSync(partialPath, JSON.stringify(done));
        console.log(`  ${finished}/${batches.length} calls, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
      }
    }
  }),
);
writeFileSync(partialPath, JSON.stringify(done));

const counts = {};
for (const [k] of Object.values(done)) counts[k] = (counts[k] ?? 0) + 1;
writeFileSync(
  join(ROOT, "public", "data", "topic-kinds.json"),
  JSON.stringify({ source: `Jev (${MODEL}), from each topic's name and its most endorsed verse`, kinds: Object.keys(KINDS), tags: done }),
);
console.log("kinds:", counts);

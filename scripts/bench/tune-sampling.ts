// Which sampling settings make the Lab's model read most like the King James
// Version and make the most sense? Scores every sample from
// `python -m biblelm.sample_grid` with Jev's judge, exactly as the Generate tab
// asks (src/lib/jev-contracts.ts), and ranks the settings.
//
//   python -m biblelm.sample_grid --run-dir runs/current > data/tune/samples.jsonl
//   node scripts/bench/tune-sampling.ts data/tune/samples.jsonl
//
// Every setting sees the same prompts and the same random draws, so the
// comparison is between settings, not luck.

import { readFileSync, writeFileSync } from "node:fs";
import { JUDGE_QUESTIONS, MODEL } from "../../src/lib/jev-contracts.ts";

const KEY = process.env.TYPESAFE_API_KEY?.trim();
if (!KEY) {
  console.error("Set TYPESAFE_API_KEY first.");
  process.exit(1);
}
const file = process.argv[2] ?? "data/tune/samples.jsonl";
const PARALLEL = 6;

type Sample = { temperature: number; top_k: number; prompt: string; text: string; style?: number; sense?: number };
const samples: Sample[] = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));

async function judge(s: Sample) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, state: { generated: s.prompt + s.text }, questions: JUDGE_QUESTIONS }),
    });
    if (res.ok) {
      const { answers } = await res.json();
      s.style = answers.style?.score;
      s.sense = answers.sense?.score;
      return;
    }
    if (res.status < 500 && res.status !== 429) throw new Error(`${res.status} ${await res.text()}`);
    await new Promise((ok) => setTimeout(ok, 1500 * (attempt + 1)));
  }
}

const t0 = performance.now();
let next = 0;
await Promise.all(
  Array.from({ length: PARALLEL }, async () => {
    while (next < samples.length) await judge(samples[next++]);
  }),
);
console.log(`${samples.length} samples judged in ${((performance.now() - t0) / 1000).toFixed(0)} s\n`);
writeFileSync(file.replace(/\.jsonl$/, ".scored.jsonl"), samples.map((s) => JSON.stringify(s)).join("\n"));

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const se = (xs: number[]) => Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1) / xs.length);
const groups = new Map<string, Sample[]>();
for (const s of samples) if (s.style !== undefined && s.sense !== undefined) {
  const k = `${s.temperature}|${s.top_k}`;
  groups.set(k, [...(groups.get(k) ?? []), s]);
}
const rows = [...groups.entries()]
  .map(([k, ss]) => {
    const [t, top] = k.split("|").map(Number);
    const both = ss.map((s) => s.style! + s.sense!);
    return { t, top, style: mean(ss.map((s) => s.style!)), sense: mean(ss.map((s) => s.sense!)), both: mean(both), se: se(both), n: ss.length };
  })
  .sort((a, b) => b.both - a.both);
console.log("temp  top-k   style  sense  sum (± s.e.)   n");
for (const r of rows)
  console.log(`${r.t.toFixed(1).padStart(4)}  ${(r.top || "off").toString().padStart(5)}   ${r.style.toFixed(2)}   ${r.sense.toFixed(2)}   ${r.both.toFixed(2)} ± ${r.se.toFixed(2)}   ${r.n}`);
const best = rows[0];
const bestText = samples.filter((s) => s.temperature === best.t && s.top_k === best.top).sort((a, b) => b.style! + b.sense! - (a.style! + a.sense!))[0];
console.log(`\nbest: temperature ${best.t}, top-k ${best.top || "off"}. Its best sample:\n${bestText.prompt}${bestText.text}`);

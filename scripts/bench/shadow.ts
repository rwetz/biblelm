// M9 shadow evaluation: does Jev's rerank make search better? For 30 study
// questions, take the app's semantic candidates (the top 20 by meaning, as
// SearchView sends them) and score two orders against hand-labelled answers:
// the embedding order alone, and the order after Jev's rerank, decided by the
// app's own decideRerank. Writes docs/evals/shadow.md.
//
//   node scripts/bench/shadow.ts       (TYPESAFE_API_KEY set; pnpm data:embed done)
//
// The labels are the passages a study Bible or a pastor would point to first;
// a candidate counts as relevant if it falls inside one. Relevance is binary.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { env, pipeline } from "@huggingface/transformers";
import { decideRerank, MODEL, rerankQuestions } from "../../src/lib/jev-contracts.ts";

const KEY = process.env.TYPESAFE_API_KEY?.trim();
if (!KEY) {
  console.error("Set TYPESAFE_API_KEY first.");
  process.exit(1);
}
const ROOT = join(import.meta.dirname, "..", "..");
const DATA = join(ROOT, "public", "data");
env.cacheDir = join(ROOT, "data-src", "models");
const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const K = 20;

/** [question, labelled passages ("Book.c.v" or "Book.c.v-w")] */
const QUESTIONS: [string, string[]][] = [
  ["how can I be forgiven", ["1John.1.9", "Acts.3.19", "Ps.103.12", "Eph.1.7", "Isa.1.18", "Col.1.14", "Ps.32.5"]],
  ["what does God say about worry", ["Phil.4.6-7", "Matt.6.25-34", "1Pet.5.7", "Ps.55.22", "John.14.27"]],
  ["how do I resist temptation", ["1Cor.10.13", "Jas.4.7", "Matt.26.41", "Heb.4.15-16", "2Tim.2.22", "Jas.1.12-15", "Matt.4.1-11"]],
  ["why does God allow suffering", ["Rom.8.18", "Rom.8.28", "Jas.1.2-4", "2Cor.4.17", "1Pet.4.12-13", "Rom.5.3-5", "Job.1.21"]],
  ["how should I pray", ["Matt.6.5-13", "Phil.4.6", "1Thess.5.17", "Luke.11.1-4", "Jas.5.16", "Luke.18.1"]],
  ["what is faith", ["Heb.11.1", "Heb.11.6", "Rom.10.17", "Eph.2.8", "Jas.2.17"]],
  ["how to deal with anger", ["Eph.4.26", "Jas.1.19-20", "Prov.15.1", "Prov.16.32", "Col.3.8", "Eph.4.31"]],
  ["what happens after death", ["John.11.25-26", "2Cor.5.8", "Phil.1.21-23", "1Thess.4.13-17", "Heb.9.27", "Rev.21.4", "John.14.2-3"]],
  ["how do I find peace", ["John.14.27", "Phil.4.7", "Isa.26.3", "Rom.5.1", "John.16.33", "Col.3.15"]],
  ["is it wrong to lie", ["Exod.20.16", "Prov.12.22", "Col.3.9", "Eph.4.25", "Prov.6.16-19", "Lev.19.11"]],
  ["how should husbands treat their wives", ["Eph.5.25-33", "1Pet.3.7", "Col.3.19", "Prov.5.18-19"]],
  ["what does the Bible say about money", ["1Tim.6.10", "Matt.6.24", "Heb.13.5", "Prov.22.7", "Matt.6.19-21", "Eccl.5.10", "1Tim.6.17-19"]],
  ["how can I be saved", ["Rom.10.9-10", "Acts.16.31", "Eph.2.8-9", "John.3.16", "Acts.4.12", "John.14.6", "Rom.6.23"]],
  ["what is love", ["1Cor.13.4-8", "1John.4.7-8", "1John.4.16", "John.15.13", "Rom.5.8"]],
  ["how do I overcome fear", ["Isa.41.10", "2Tim.1.7", "Ps.23.4", "Ps.27.1", "Josh.1.9", "1John.4.18", "Ps.56.3"]],
  ["why should I forgive others", ["Matt.6.14-15", "Col.3.13", "Eph.4.32", "Matt.18.21-35", "Mark.11.25", "Luke.6.37"]],
  ["what is the purpose of my life", ["Eccl.12.13", "Eph.2.10", "Matt.22.37-39", "Col.3.23", "Mic.6.8", "1Cor.10.31", "Isa.43.7"]],
  ["how should I treat my enemies", ["Matt.5.44", "Luke.6.27-28", "Rom.12.20", "Prov.25.21", "Rom.12.14"]],
  ["what does God say about pride", ["Prov.16.18", "Jas.4.6", "1Pet.5.5", "Prov.11.2", "Prov.29.23", "Phil.2.3"]],
  ["how do I stay pure", ["Ps.119.9", "1Thess.4.3-5", "1Cor.6.18-20", "Matt.5.8", "2Tim.2.22", "Job.31.1"]],
  ["what is the Holy Spirit", ["John.14.16-17", "John.14.26", "Acts.1.8", "Gal.5.22-23", "Rom.8.26", "John.16.13"]],
  ["how can I be content", ["Phil.4.11-13", "1Tim.6.6-8", "Heb.13.5", "Prov.30.8-9"]],
  ["what does the Bible say about loneliness", ["Deut.31.6", "Ps.68.6", "Matt.28.20", "Ps.25.16", "Heb.13.5", "Eccl.4.9-12", "Ps.34.18"]],
  ["why did Jesus die", ["Rom.5.8", "1Pet.3.18", "Isa.53.5", "2Cor.5.21", "John.3.16", "Mark.10.45", "1Cor.15.3"]],
  ["how should I raise children", ["Prov.22.6", "Eph.6.4", "Deut.6.6-7", "Col.3.21", "Prov.13.24"]],
  ["what does God say about laziness", ["Prov.6.6-11", "Prov.13.4", "2Thess.3.10", "Prov.10.4", "Prov.24.30-34", "Prov.20.4"]],
  ["how do I know God's will", ["Rom.12.2", "Prov.3.5-6", "Jas.1.5", "Ps.32.8", "1Thess.5.16-18", "Eph.5.17"]],
  ["is drinking alcohol a sin", ["Eph.5.18", "Prov.20.1", "Prov.23.29-35", "1Cor.6.10", "Rom.14.21", "Gal.5.21"]],
  ["how do I grieve someone I lost", ["Matt.5.4", "Ps.34.18", "1Thess.4.13-14", "Rev.21.4", "John.11.35", "Ps.147.3", "Eccl.3.4"]],
  ["what is grace", ["Eph.2.8-9", "2Cor.12.9", "Rom.3.23-24", "Titus.2.11", "Rom.6.14", "John.1.16-17"]],
];

// ── data ─────────────────────────────────────────────────────────────────
const refs = JSON.parse(readFileSync(join(DATA, "refs.json"), "utf8")) as string[];
const meta = JSON.parse(readFileSync(join(DATA, "embeddings.json"), "utf8")) as { model: string; dim: number; count: number; scale: number; query: string };
const vecs = new Int8Array(readFileSync(join(DATA, "embeddings.i8")).buffer.slice(0));
const kjv = JSON.parse(readFileSync(join(DATA, "bible", "kjv.json"), "utf8")) as { books: { osis: string; chapters: { c: number; v: [number, string][] }[] }[] };
const text = new Map<string, string>();
for (const b of kjv.books) for (const c of b.chapters) for (const [v, t] of c.v) text.set(`${b.osis}.${c.c}.${v}`, t.replace(/\[([^\]]*)\]/g, "$1").replace(/¶\s*/g, ""));
const NAMES: Record<string, string> = JSON.parse(readFileSync(join(ROOT, "src", "lib", "data", "books.json"), "utf8")).reduce((m: Record<string, string>, b: { osis: string; name: string }) => ((m[b.osis] = b.name), m), {});
const label = (osis: string) => {
  const [b, c, v] = osis.split(".");
  return `${NAMES[b] ?? b} ${c}:${v}`;
};

function goldSet(labels: string[]): Set<string> {
  const out = new Set<string>();
  for (const l of labels) {
    const [b, c, vs] = l.split(".");
    const [a, z] = vs.split("-").map(Number);
    for (let v = a; v <= (z ?? a); v++) out.add(`${b}.${c}.${v}`);
  }
  return out;
}

const embed = await pipeline("feature-extraction", meta.model, { dtype: "q8" });
async function candidates(q: string): Promise<string[]> {
  const out = await embed(meta.query + q, { pooling: "cls", normalize: true });
  const qv = out.data as Float32Array;
  const scores = new Float32Array(meta.count);
  for (let i = 0; i < meta.count; i++) {
    let s = 0;
    const o = i * meta.dim;
    for (let d = 0; d < meta.dim; d++) s += qv[d] * vecs[o + d];
    scores[i] = s;
  }
  // The 66 books: the default shelf.
  const idx = [...scores.keys()].filter((i) => !/^(Tob|Jdt|Wis|Sir|Bar|1Macc|2Macc|3Macc|4Macc|1Esd|2Esd|PrMan|AddEsth|AddDan|EsthGr|DanGr|PrAzar|Sus|Bel|EpJer|Ps151)\./.test(refs[i]));
  return idx.sort((a, b) => scores[b] - scores[a]).slice(0, K).map((i) => refs[i]);
}

async function jev(q: string, items: string[]) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, state: { question: q }, questions: rerankQuestions(q, items.map((r) => ({ ref: label(r), text: text.get(r) ?? "" }))) }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`);
  return decideRerank(items, body).map((x) => x.item);
}

// ── metrics (binary relevance) ───────────────────────────────────────────
const rr = (list: string[], g: Set<string>) => {
  const i = list.findIndex((r) => g.has(r));
  return i < 0 || i >= 10 ? 0 : 1 / (i + 1);
};
const pAt = (list: string[], g: Set<string>, k: number) => list.slice(0, k).filter((r) => g.has(r)).length / k;
const ndcg = (list: string[], g: Set<string>, k = 10) => {
  const dcg = list.slice(0, k).reduce((s, r, i) => s + (g.has(r) ? 1 / Math.log2(i + 2) : 0), 0);
  const ideal = Math.min(k, list.filter((r) => g.has(r)).length);
  let idcg = 0;
  for (let i = 0; i < ideal; i++) idcg += 1 / Math.log2(i + 2);
  return idcg ? dcg / idcg : 0;
};

type Row = { q: string; found: number; base: { rr: number; p5: number; nd: number; top: string }; jev: { rr: number; p5: number; nd: number; top: string } };
const rows: Row[] = [];
for (const [q, labels] of QUESTIONS) {
  const g = goldSet(labels);
  const base = await candidates(q);
  const ranked = await jev(q, base);
  const m = (l: string[]) => ({ rr: rr(l, g), p5: pAt(l, g, 5), nd: ndcg(l, g), top: label(l[0]) });
  rows.push({ q, found: base.filter((r) => g.has(r)).length, base: m(base), jev: m(ranked) });
  process.stdout.write(".");
}
console.log();

const mean = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0) / rows.length;
const f2 = (x: number) => x.toFixed(2);
const better = rows.filter((r) => r.jev.nd > r.base.nd + 1e-9).length;
const worse = rows.filter((r) => r.jev.nd < r.base.nd - 1e-9).length;
const summary = [
  ["MRR@10", mean((r) => r.base.rr), mean((r) => r.jev.rr)],
  ["Precision@5", mean((r) => r.base.p5), mean((r) => r.jev.p5)],
  ["nDCG@10", mean((r) => r.base.nd), mean((r) => r.jev.nd)],
] as const;

const md = `# Shadow evaluation: search with and without Jev (M9)

Run ${new Date().toISOString().slice(0, 10)} with \`node scripts/bench/shadow.ts\`, model alias \`${MODEL}\`.

30 study questions, typed as a person would. For each, the app's semantic
candidates (top ${K} by meaning over the 66 books, bge-small-en-v1.5, exactly
what SearchView hands to Jev) are scored in two orders against hand-labelled
passages: **without Jev** (embedding order) and **with Jev** (the app's
\`decideRerank\` over Jev's relevance scores). Jev can only reorder; it cannot
add a passage the embeddings missed, so both orders share the same
candidates. Relevance is binary: a candidate inside a labelled passage.

| Metric | Without Jev | With Jev | Change |
|---|---|---|---|
${summary.map(([n, a, b]) => `| ${n} | ${f2(a)} | ${f2(b)} | ${b >= a ? "+" : ""}${f2(b - a)} |`).join("\n")}

Jev improved nDCG@10 on ${better} questions, made it worse on ${worse}, and left
${rows.length - better - worse} unchanged. Labelled passages among the ${K}
candidates: ${rows.reduce((s, r) => s + r.found, 0)} in all, ${rows.filter((r) => !r.found).length} questions with none (no reordering can help those).

| Question | Labelled in top ${K} | nDCG@10 without | with | First result without | with |
|---|---|---|---|---|---|
${rows.map((r) => `| ${r.q} | ${r.found} | ${f2(r.base.nd)} | ${f2(r.jev.nd)} | ${r.base.top} | ${r.jev.top} |`).join("\n")}

The labels are the passages a study Bible would point to first, so a strong
result outside them counts as a miss for both orders alike.
`;
writeFileSync(join(ROOT, "docs", "evals", "shadow.md"), md);
console.log(summary.map(([n, a, b]) => `${n}: ${f2(a)} -> ${f2(b)}`).join("\n"));
console.log(`better ${better}, worse ${worse}`);

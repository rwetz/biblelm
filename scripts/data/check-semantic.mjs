// Spot-check the semantic index from the command line: node scripts/data/check-semantic.mjs "your query"
import { readFileSync } from "node:fs";
import { env, pipeline } from "@huggingface/transformers";
import { ROOT as root } from "./lib.mjs";
env.cacheDir = root + "/data-src/models";
const meta = JSON.parse(readFileSync(root + "/public/data/embeddings.json"));
const v = new Int8Array(readFileSync(root + "/public/data/embeddings.i8").buffer.slice(0));
const refs = JSON.parse(readFileSync(root + "/public/data/refs.json"));
const kjv = JSON.parse(readFileSync(root + "/public/data/bible/kjv.json"));
const txt = new Map(); for (const b of kjv.books) for (const c of b.chapters) for (const [n,t] of c.v) txt.set(`${b.osis}.${c.c}.${n}`, t);
const ex = await pipeline("feature-extraction", meta.model, { dtype: "q8" });
for (const q of process.argv.length > 2 ? process.argv.slice(2) : ["when I feel anxious and afraid", "forgiving someone who hurt me", "angels fighting the devil"]) {
  const e = (await ex(meta.query + q, { pooling: "cls", normalize: true })).data;
  const s = []; for (let i = 0; i < meta.count; i++) { let d = 0; for (let k = 0; k < 384; k++) d += e[k] * v[i*384+k]; s.push([d, i]); }
  s.sort((a,b)=>b[0]-a[0]); console.log("\n" + q); for (const [d,i] of s.slice(0,5)) console.log("  ", refs[i], (txt.get(refs[i])||"").slice(0,90));
}

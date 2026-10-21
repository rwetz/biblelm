// Jev benchmark: latency and agreement for every question BibleLM asks, sent
// exactly as the app sends them (src/lib/jev-contracts.ts).
//
//   node scripts/bench/jev.ts            (TYPESAFE_API_KEY in the environment)
//
// One kept-alive connection, like the desktop app; the first call opens it and
// is reported apart. Small hand-labelled sets: a smoke check that the questions
// read sensibly, not a full evaluation.

import { answerQuestions, clauses, JUDGE_QUESTIONS, MODEL, ROUTE_QUESTIONS, VERSE_QUESTIONS, xrefQuestions } from "../../src/lib/jev-contracts.ts";
import { NOTES } from "../../src/lib/notes.ts";

const KEY = process.env.TYPESAFE_API_KEY?.trim();
if (!KEY) {
  console.error("Set TYPESAFE_API_KEY first.");
  process.exit(1);
}
const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const RUNS = Number(process.env.RUNS ?? 1);

type Answer = { choice?: string; score?: number; confidence?: number };
async function ask(state: unknown, questions: unknown): Promise<{ ms: number; answers: Record<string, Answer> }> {
  const t0 = performance.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, state, questions }),
  });
  const body = (await res.json()) as { answers: Record<string, Answer> };
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`);
  return { ms: performance.now() - t0, answers: body.answers };
}

const ROUTE: [string, string][] = [
  ["fear not", "words"],
  ["\"the LORD is my shepherd\"", "words"],
  ["in the beginning", "words"],
  ["verses about forgiveness", "theme"],
  ["when I feel anxious", "theme"],
  ["patience in suffering", "theme"],
  ["God's love for the lost", "theme"],
  ["david and goliath", "story"],
  ["the prodigal son", "story"],
  ["moses", "story"],
  ["the road to emmaus", "story"],
  ["what is grace?", "question"],
  ["why did Jesus weep", "question"],
  ["how should I pray", "question"],
  ["who wrote hebrews", "question"],
  ["is it wrong to be angry", "question"],
];

const VERSES: [string, string, string][] = [
  ["Psalm 22:1", "My God, my God, why hast thou forsaken me? why art thou so far from helping me, and from the words of my roaring?", "lament"],
  ["Nehemiah 10:17", "Ater, Hizkijah, Azzur,", "list"],
  ["Psalm 150:6", "Let every thing that hath breath praise the LORD. Praise ye the LORD.", "praise"],
  ["Acts 27:41", "And falling into a place where two seas met, they ran the ship aground.", "narrative"],
  ["Exodus 20:13", "Thou shalt not kill.", "law"],
  ["Proverbs 15:1", "A soft answer turneth away wrath: but grievous words stir up anger.", "teaching"],
  ["Isaiah 7:14", "Therefore the Lord himself shall give you a sign; Behold, a virgin shall conceive, and bear a son, and shall call his name Immanuel.", "prophecy"],
  ["Psalm 51:10", "Create in me a clean heart, O God; and renew a right spirit within me.", "prayer"],
];

// John 3:16 and some of its cross references; the first two say the same thing.
const XREF_SOURCE = { ref: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." };
const XREFS = [
  { ref: "Romans 5:8", text: "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us." },
  { ref: "1 John 4:9", text: "In this was manifested the love of God toward us, because that God sent his only begotten Son into the world, that we might live through him." },
  { ref: "Genesis 22:2", text: "And he said, Take now thy son, thine only son Isaac, whom thou lovest, and get thee into the land of Moriah; and offer him there for a burnt offering." },
  { ref: "Numbers 21:9", text: "And Moses made a serpent of brass, and put it upon a pole, and it came to pass, that if a serpent had bitten any man, when he beheld the serpent of brass, he lived." },
  { ref: "Ezra 2:3", text: "The children of Parosh, two thousand an hundred seventy and two." },
  { ref: "John 1:14", text: "And the Word was made flesh, and dwelt among us, (and we beheld his glory, the glory as of the only begotten of the Father,) full of grace and truth." },
];

const JUDGE: [string, string, "high" | "low"][] = [
  ["kjv-like", "And it came to pass in those days, that the people went up unto the house of the LORD, and they offered burnt offerings before the altar, and they rejoiced with great joy.", "high"],
  ["word salad", "And the hath unto saying wherefore the of LORD came, and thee ye be be wrath sheep the went to and.", "low"],
];

const pct = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))];
const row = (name: string, ms: number[], extra = "") =>
  console.log(`${name.padEnd(22)} n=${String(ms.length).padStart(3)}  p50 ${pct(ms, 0.5).toFixed(0).padStart(4)} ms  p95 ${pct(ms, 0.95).toFixed(0).padStart(4)} ms  max ${Math.max(...ms).toFixed(0).padStart(4)} ms  ${extra}`);

const warm = await ask({ query: "warm up" }, ROUTE_QUESTIONS);
console.log(`model ${MODEL}; first call (opens the connection): ${warm.ms.toFixed(0)} ms\n`);

const routeMs: number[] = [];
let routeOk = 0;
const misses: string[] = [];
for (let run = 0; run < RUNS; run++)
  for (const [query, want] of ROUTE) {
    const r = await ask({ query }, ROUTE_QUESTIONS);
    routeMs.push(r.ms);
    const got = r.answers.intent?.choice;
    if (got === want) routeOk++;
    else if (run === 0) misses.push(`"${query}": ${got} (${Math.round((r.answers.intent?.confidence ?? 0) * 100)}%), labelled ${want}`);
  }
row("route (as you type)", routeMs, `agrees ${routeOk}/${ROUTE.length * RUNS}`);

const verseMs: number[] = [];
let verseOk = 0;
for (let run = 0; run < RUNS; run++)
  for (const [reference, text, want] of VERSES) {
    const r = await ask({ reference, text }, VERSE_QUESTIONS);
    verseMs.push(r.ms);
    const got = r.answers.kind?.choice;
    if (got === want) verseOk++;
    else if (run === 0) misses.push(`${reference}: ${got}, labelled ${want}`);
  }
row("verse kind", verseMs, `agrees ${verseOk}/${VERSES.length * RUNS}`);

const xrefMs: number[] = [];
let order = "";
for (let run = 0; run < Math.max(3, RUNS); run++) {
  const r = await ask({ verse: XREF_SOURCE.ref }, xrefQuestions(XREF_SOURCE, XREFS));
  xrefMs.push(r.ms);
  order = XREFS.map((x, i) => [x.ref, r.answers[`x${i}`]?.score ?? 0] as const)
    .sort((a, b) => b[1] - a[1])
    .map(([ref, s]) => `${ref} ${s.toFixed(1)}`)
    .join(", ");
}
row(`xref (${XREFS.length} in one call)`, xrefMs, "");
console.log(`  order: ${order}`);

const judgeMs: number[] = [];
const judged: string[] = [];
for (const [name, text, want] of JUDGE) {
  const r = await ask({ generated: text }, JUDGE_QUESTIONS);
  judgeMs.push(r.ms);
  judged.push(`${name} (expect ${want}): style ${r.answers.style?.score?.toFixed(1)}, sense ${r.answers.sense?.score?.toFixed(1)}`);
}
row("judge generated", judgeMs, "");
for (const j of judged) console.log(`  ${j}`);

// Questions: the right note, or the right passage and words, out of a mixed set.
const ANSWER_SET: { q: string; note?: string; best?: string; passages: [string, string][] }[] = [
  { q: "why is LORD in capitals in the Bible?", note: "lord", passages: [["Exodus 3:15", "And God said moreover unto Moses, Thus shalt thou say unto the children of Israel, The LORD God of your fathers, the God of Abraham, the God of Isaac, and the God of Jacob, hath sent me unto you: this is my name for ever, and this is my memorial unto all generations."], ["Psalms 23:1", "The LORD is my shepherd; I shall not want."]] },
  { q: "what does selah mean", note: "selah", passages: [["Psalms 46:3", "Though the waters thereof roar and be troubled, though the mountains shake with the swelling thereof. Selah."]] },
  { q: "who added verse numbers to the Bible", note: "numbers", passages: [["Revelation 22:18", "For I testify unto every man that heareth the words of the prophecy of this book, If any man shall add unto these things, God shall add unto him the plagues that are written in this book:"]] },
  { q: "what is love?", best: "1 Corinthians 13:4", passages: [["Genesis 29:20", "And Jacob served seven years for Rachel; and they seemed unto him but a few days, for the love he had to her."], ["1 Corinthians 13:4", "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,"], ["Song of Solomon 8:6", "Set me as a seal upon thine heart, as a seal upon thine arm: for love is strong as death; jealousy is cruel as the grave: the coals thereof are coals of fire, which hath a most vehement flame."]] },
  { q: "how should I pray", best: "Matthew 6:9", passages: [["Genesis 5:3", "And Adam lived an hundred and thirty years, and begat a son in his own likeness, after his image; and called his name Seth:"], ["Matthew 6:9", "After this manner therefore pray ye: Our Father which art in heaven, Hallowed be thy name."], ["Luke 18:1", "And he spake a parable unto them to this end, that men ought always to pray, and not to faint;"]] },
];
const answerMs: number[] = [];
let answerOk = 0;
for (const a of ANSWER_SET) {
  const passages = a.passages.map(([ref, text]) => ({ ref, text, clauses: clauses(text) }));
  const r = await ask({ question: a.q }, answerQuestions(a.q, passages, NOTES.map((n) => ({ id: n.id, about: n.about }))));
  answerMs.push(r.ms);
  const note = r.answers.note?.choice;
  const scores = passages.map((p, i) => [p.ref, r.answers[`a${i}`]?.score ?? 0] as const).sort((x, y) => y[1] - x[1]);
  const ok = a.note ? note === a.note : scores[0][0] === a.best && note === "none";
  if (ok) answerOk++;
  const top = passages.findIndex((p) => p.ref === scores[0][0]);
  const clause = r.answers[`c${top}`]?.choice;
  console.log(`  ${ok ? "ok  " : "miss"} "${a.q}": note ${note}, best ${scores[0][0]} ${scores[0][1].toFixed(1)}${clause ? `, words "${passages[top].clauses[+clause.slice(1)]}"` : ""}`);
}
row("answer a question", answerMs, `right ${answerOk}/${ANSWER_SET.length}`);

if (misses.length) {
  console.log("\nDisagreements with the labels:");
  for (const m of misses) console.log(`  ${m}`);
}

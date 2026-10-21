# Benchmarks

Run on the development machine, 2026-10-20. Re-run with the commands given.

## Jev (TypeSafe), live API

`node scripts/bench/jev.ts` with `TYPESAFE_API_KEY` set (`RUNS=2`). The requests
are the app's own (`src/lib/jev-contracts.ts`), over one kept-alive connection,
as the desktop app now sends them. Model alias `jev-latest` (jev-1.13.0).

| Question | Calls | p50 | p95 | Agreement with hand labels |
|---|---|---|---|---|
| Read a query (as you type) | 32 | 101 ms | 235 ms | 30 / 32 |
| Kind of verse (verse panel) | 16 | 106 ms | 145 ms | 16 / 16 |
| Rank 6 cross references, one call | 3 | 127 ms | 179 ms | Romans 5:8 and 1 John 4:9 first, Ezra 2:3 last |
| Judge generated text (2 scores) | 2 | 103 ms | | KJV-like 2.8 / 3.0, word salad 1.1 / 0.3 |
| Answer a question: 10 notes, 1 to 3 passages and their clauses, one call | 5 | 512 ms | 958 ms | 5 / 5 (right note for 3 questions about the book; right passage for 2 about Scripture) |

The first call, which opens the TLS connection, took 268 ms; a fresh connection
for every call (the app's old behaviour) measured 222 to 330 ms. Network ping to
the API is about 16 ms, so Jev itself answers in roughly 85 to 110 ms.

The one disagreement was "what is grace?", read as a theme (60%) rather than a
question: a fair reading. These sets are a smoke check of the questions, not
the M9 shadow evaluation.

## Live dithering, in the webview

Timed in the dev browser (device pixel ratio 1.5) by importing
`src/art/dither.ts`: levels, edge fade and dither, median of 10.

| Picture | Grid (dots) | Algorithm | Median | Max |
|---|---|---|---|---|
| Home hero | 672 x 367 | Atkinson | 8.5 ms | 20.9 ms |
| Lab hero, full bleed | 1000 x 84 | Atkinson | 2.7 ms | 4.8 ms |
| Sidebar vignette | 224 x 256 | Floyd-Steinberg | 2.5 ms | 8.7 ms |
| Search lens plate | 176 x 220 | Floyd-Steinberg | 1.2 ms | 2.0 ms |

One frame of the reveal or of a confidence change (`paint`) costs 1.7 ms at hero
size and 0.4 ms at vignette size, well inside a 16 ms frame.

# BibleLM: notes for coding agents

BibleLM is becoming an **illustrated Bible study tool with an ML lab inside
it**. Read [docs/ROADMAP.md](docs/ROADMAP.md) first, then the doc for the area
you are touching:

| Area | Doc |
|---|---|
| What exists and why it is changing | [docs/AUDIT.md](docs/AUDIT.md) |
| Texts, canon shelves, notebooks, data | [docs/STUDY.md](docs/STUDY.md) |
| Embeddings, Jev, LLM, Lab, Axon | [docs/ML.md](docs/ML.md) |
| Nexis design, themes, typography | [docs/DESIGN.md](docs/DESIGN.md) |
| Illustrations and dithering | [docs/ART.md](docs/ART.md) |
| Algorithm ideas | [docs/IDEAS.md](docs/IDEAS.md) |

## Principles

1. **The machine finds, Scripture speaks.** ML returns real verses with
   references. Generated text is always labelled and never shown as, or mixed
   into, Bible text.
2. **Rules stay in code.** Lookups, counts and exact search are deterministic
   (SQLite/Rust). Jev only ranks, routes and flags.
3. **Your notes are sacred data.** `notes.db` is never rebuilt, migrated without
   a backup, or deleted by code. Migrations get a test.
4. **Public domain only** for texts and art, with provenance recorded
   (`public/art/CREDITS.md`, `translation.licence`).
5. **Study features must not require Python.** Python is for offline build
   scripts and the Lab only.

## Layout

```
src/                  React (Tauri webview). Moving to @nexis/design (M1).
  lib/backend.ts        every invoke() goes through here; has a browser mock
src-tauri/            Rust: verse store, search, Python/Axon workers
python/biblelm/       Lab: GPT, training, generation, ONNX export
scripts/              offline builders (import_ebible, embed, art/dither)
public/art/           dithered 1-bit PNGs + CREDITS.md (committed)
art-src/              source scans (git-ignored)
docs/                 plans; keep ROADMAP status current
```

## Rules

- **UI** follows `nexis-suite/nexis-design/AGENTS.md`: tokens only, one accent
  (rubric red / gilt), `<Icon name>` only, no emoji, no em dashes in any text a
  person reads, every action in the command palette, `m` not `motion.*`.
- **Art** is a 1-bit PNG drawn through `mask-image` with a token colour; never
  `brand`, never under body text above 8% opacity. Add a CREDITS row with every
  image.
- Changing a Rust type returned by a command: update `src/lib/backend.ts`
  types and its mock in the same change.
- Never commit `data/`, `runs/`, `art-src/`, `*.db`, model weights or keys.
  `TYPESAFE_API_KEY` and any LLM key live only in the user's environment or OS
  keychain.
- Never run downloaded scripts; importers parse data, they do not execute it.

## Verify

```sh
pnpm typecheck
pnpm test                 # vitest (added in M0)
pnpm dev                  # browser preview with the backend mock
.venv/Scripts/python -m pytest python
```

Avoid local Rust release builds (they overheat this machine); `cargo check` is
fine, CI builds the app. Say before starting a `pnpm tauri dev` the first time.

## When you finish a milestone

Tick it in `docs/ROADMAP.md`, add a CHANGELOG `Unreleased` entry, and note any
decision that changed a plan doc in that doc.

# BibleLM: notes for coding agents

BibleLM is an **illustrated Bible study tool with an ML lab inside it**. Read
[docs/ROADMAP.md](docs/ROADMAP.md) first (status and what changed from the
plan), then the doc for the area you are touching:

| Area | Doc |
|---|---|
| Why it changed from 1.x | [docs/AUDIT.md](docs/AUDIT.md) |
| Texts, canon shelves, notebooks | [docs/STUDY.md](docs/STUDY.md) |
| The data files and how to rebuild them | [docs/DATA.md](docs/DATA.md) |
| Embeddings, Jev, commentary, the Lab | [docs/ML.md](docs/ML.md) |
| Nexis design, themes, typography | [docs/DESIGN.md](docs/DESIGN.md) |
| Illustrations | [docs/ART.md](docs/ART.md), [docs/art-credits.md](docs/art-credits.md) |
| Algorithm ideas | [docs/IDEAS.md](docs/IDEAS.md) |

## Principles

1. **The machine finds, Scripture speaks.** ML returns real verses with
   references. Generated text is always labelled and never shown as, or mixed
   into, Bible text.
2. **Rules stay in code.** References, counts, exact search, genre are
   deterministic (`src/lib/search.ts`, `src/lib/jev.ts` GENRE). Jev only ranks
   and routes.
3. **Notes are sacred data.** `notes.json` in the app data folder is written
   atomically with 14 daily backups (`src-tauri/src/study.rs`). Loading never
   drops fields (`migrate` in `src/store/notebooks.ts`); a shape change bumps
   `VERSION` with a migration and a test.
4. **Public domain (or CC-BY, credited) only**, provenance recorded.
5. **Study features need no Python and no backend.** Python is for the Lab;
   Rust only stores notes, holds keys and makes the two opt-in network calls.

## Layout

```
src/
  app/              shell (App.tsx), Scriptorium theme
  art/Art.tsx       Engraving, PlateFigure, CornerPlate, DitherHero, ornaments
  features/         home, read (+VersePanel), search, topics (+map, structure),
                    notebooks, lab (corpus, training, inference, model, inside), settings
  lib/              canon, bible (verse store), search, xrefs (graph), topics,
                    semantic (+ worker), jev, commentary, art, backend
  store/            study (prefs + place), notebooks (your notes)
src-tauri/src/      lib.rs (Lab workers, paths), study.rs (notes, keys, Jev, commentary)
python/biblelm/     the Lab: GPT, training, generation, ONNX, inspect_model
scripts/data|art/   offline builders (pnpm data); outputs are git-ignored
```

## Rules

- **UI** follows `@nexis/design` (its AGENTS.md ships in node_modules): tokens
  only, one accent (rubric red on Vellum, gilt on Nocturne), `<Icon name>` only,
  no emoji, **no em dashes in any text a person reads**, every action in the
  command palette (`useCommands` in App.tsx), `m` not `motion.*`.
- **Every Tauri call goes through `src/lib/backend.ts`**, which has a browser
  fallback. Changing a Rust command's shape changes its type there in the same
  commit.
- **Art**: plates are positive engravings (`.engraving`), never dithered;
  heroes are 1-bit and drawn by `DitherHero`. Never under body text above 8%
  opacity, never in the accent colour. Each page has art at its tier
  (`PAGE_PLATES` in `src/lib/art.ts`).
- Never commit `data/`, `runs/`, `data-src/`, `art-src/`, `public/data`,
  `public/art/dore|heroes`, `public/models`, weights or keys.
  `TYPESAFE_API_KEY` stays in the user's environment; the Anthropic key in the
  OS keychain. Neither may reach the webview.
- Importers parse downloads as text; never execute downloaded content.

## Verify

```sh
pnpm data                 # once, to build the static data (see docs/DATA.md)
pnpm typecheck && pnpm test
pnpm dev                  # the whole study app runs in a browser
python -m pytest python   # with PYTHONPATH unset; pytest.ini sets it
cargo check -j 2          # in src-tauri, at low priority
```

No local Rust release builds or `cargo test` (a full Tauri link overheats
this machine); CI runs `cargo check` and `cargo test --lib`. Say before starting
a `pnpm tauri dev` the first time.

## When you finish a milestone

Tick it in `docs/ROADMAP.md`, add a CHANGELOG `Unreleased` entry, and record
any decision that changed a plan doc as an "As built" note in that doc.

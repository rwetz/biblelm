# BibleLM: notes for coding agents

BibleLM is an **illustrated Bible study tool with an ML lab inside it**. The
2.x roadmap is complete (v2.1.0). Read [docs/ROADMAP.md](docs/ROADMAP.md) first
(status and what changed from the plan), then the doc for the area you are
touching:

| Area | Doc |
|---|---|
| Why it changed from 1.x | [docs/AUDIT.md](docs/AUDIT.md) |
| Texts, canon shelves, notebooks | [docs/STUDY.md](docs/STUDY.md) |
| The data files and how to rebuild them | [docs/DATA.md](docs/DATA.md) |
| Embeddings, Jev, the Lab | [docs/ML.md](docs/ML.md) |
| Nexis design, themes, typography | [docs/DESIGN.md](docs/DESIGN.md) |
| Illustrations | [docs/ART.md](docs/ART.md), [docs/art-credits.md](docs/art-credits.md), [docs/painting-credits.md](docs/painting-credits.md) |
| Algorithm ideas | [docs/IDEAS.md](docs/IDEAS.md) |
| Sub Rosa, the curiosities mode | [docs/SUBROSA.md](docs/SUBROSA.md) |

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
   Rust only stores notes and makes the one opt-in network call (Jev).

## Layout

```
src/
  app/              shell (App.tsx), Palette, controls, Sections, Scriptorium theme
  art/Art.tsx       Engraving, PlateFigure, CornerPlate, DitherHero, ornaments
  features/         home, read (+VersePanel), search, topics (+map, structure,
                    words, links, echoes), atlas, gallery, look, daily, notebooks,
                    lab (corpus, training, inference, model, inside, lessons), settings,
                    cabinet (Sub Rosa's page and library reader)
  lib/              canon (shelves), bible (verse store, companion texts), search,
                    xrefs (graph), topics, studies, semantic (+ worker), suffix
                    (+ worker), words, els, atlas, interlinear, lectionary,
                    plans, fsrs, jev, art, library, companions, backend
  store/            study (prefs + place), notebooks (your notes)
src-tauri/src/      lib.rs (Lab workers, paths), study.rs (notes, export, Jev)
python/biblelm/     the Lab: GPT, training, generation, ONNX, inspect_model
scripts/data|art/   offline builders (pnpm data); outputs are git-ignored
```

## Rules

- **UI** follows `@nexis/design` (its AGENTS.md ships in node_modules): tokens
  only, one accent (rubric red on Vellum, gilt on Nocturne), `<Icon name>` only,
  no emoji, **no em dashes in any text a person reads**, the machine is never
  named on screen and shows no scores or timings (its confidence is drawn as
  clarity: `Sigil`, `level` on `Dither`; see DESIGN.md), every action in the
  command palette (`useCommands` in App.tsx), `m` not `motion.*`.
- **Every Tauri call goes through `src/lib/backend.ts`**, which has a browser
  fallback. Changing a Rust command's shape changes its type there in the same
  commit.
- **Art**: a plate beside its passage is a positive engraving (`.engraving`),
  never dithered, and only in the chapter it depicts. A painting is kept as
  painted (resized only) and dotted only where it dissolves (`Painting`,
  `src/art/painting.ts`); it opens its chapter as a frontispiece, never between
  verses. Words over a hero band need a painting in colour. Heroes, corner plates,
  the sidebar vignette and empty-state spots are 1-bit, dithered live at their
  drawn size by `Dither` (`src/art/dither.ts`). Never under body text above 8%
  opacity, never in the accent colour (the `CrossLoader` is live progress, not
  art). Each page has art at its tier (`PAGE_PLATES`, `SIDEBAR_PLATES` in
  `src/lib/art.ts`). Blackletter is for big titles, book names and drop caps
  only; anything smaller or longer is Garamond.
- Never commit `data/`, `runs/`, `data-src/`, `art-src/`, `public/data`,
  `public/art/dore|heroes|paintings|woodcuts|curios`, `public/models`, weights or keys.
  `TYPESAFE_API_KEY` stays in the user's environment and never reaches the
  webview. No hosted large model (Opus 5.5 or larger) is used: ask first.
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

## Workspace conventions

Added by the 2026-10-30 workspace audit. Workspace-level rules live in `Dev/AGENTS.md`; this section only records how they apply here.

- **Registry.** This project has a row in `Dev/PROJECTS.md`. Update it in the same change as any move, rename or archive.
- **File header.** New source files a human authors start with the Ryan Wetzstein box (project line: `Biblelm`, year 2026) in the language's comment syntax, above imports and below any shebang. Skip generated files, lockfiles, JSON, Markdown and vendored code.
- **Builds.** Avoid local Rust/GPUI builds (they overheat the user's CPU); let CI build and test the release `.exe`.
- **README.** Ferrite-style README pattern (see `Dev/AGENTS.md`, Creating a new project, step 4) whenever this README is touched. Keep the heptagram footer.
- **Jev.** Bounded judgments (pick one, score, yes/no) go through the TypeSafe skill or the contract in `apps/job-app-finder/src/job_app_finder/jev_fit.py`. Jev only ranks, routes or flags; irreversible actions stay behind human confirmation.

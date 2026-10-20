# Roadmap to BibleLM 2.0

From "a tiny GPT with a dashboard" to **an illustrated Bible study tool with an
ML lab inside it.** Each milestone is sized for one agent session on one
branch, with a definition of done an agent can check. Background:
[AUDIT.md](AUDIT.md). Detail lives in [STUDY.md](STUDY.md), [ML.md](ML.md),
[DESIGN.md](DESIGN.md), [ART.md](ART.md) and [IDEAS.md](IDEAS.md).

## Information architecture

| Page | Art tier | Contents |
|---|---|---|
| **Home** | Hero | Verse of the day, search box over the hero, recent notebooks, continue reading |
| **Read** | Hero on landing, ornaments in text | Book/chapter reader, verse panel (cross refs, notes, other translations) |
| **Search** | Plate | Exact + semantic hybrid, Ask-style questions, shelf grouping |
| **Topics** | Plate | Nave's topics, study walks, the Scripture map |
| **Notebooks** | Plate | One per study; dockview layout per notebook |
| **Lab** | Hero on landing, plates inside | Corpus, Training, Generate, Model, Interpretability (today's five tabs live here) |
| **Settings** | Ornament | Translations, shelves, illustrations, keys |

## Milestones

Legend: **Deps** = milestones that must land first. Milestones with no shared
deps can run in parallel sessions.

### M0 · Housekeeping (Deps: none)
- Move `finished/biblelm` to `apps/biblelm` (work has resumed) and update its
  `PROJECTS.md` row. Run `git status` before and after.
- `AGENTS.md` + `CLAUDE.md` (done in this planning pass).
- CI from `_templates/workflows/`: typecheck, vitest, pytest, `cargo check` on
  `ubuntu-latest`, `pull_request` + `main` only, concurrency cancel.
- Baseline tests: `search.py` parses 31,102 verses / 66 books, `Genesis 1:1`
  resolves; a vitest smoke test renders `App`.
- `src/lib/backend.ts`: one typed wrapper around every `invoke`, with a browser
  mock, so UI milestones can be checked in `pnpm dev` without a Tauri build.
- **Done when:** CI is green on a PR; `pnpm dev` renders every view with mocks.

### M1 · Nexis shell (Deps: M0)
- Adopt `@nexis/design`: providers, `TitleBar`, `SidebarNav`, `StatusBar`,
  `CommandPalette`, `<Icon>`. Delete `src/components/ui/*` copies.
- New IA above; today's five views move under **Lab** unchanged.
- Register **Vellum** and **Nocturne** themes; load the fonts in DESIGN.md.
- **Done when:** the design package's tripwire tests pass against this app;
  every existing feature still works; no em dashes in UI strings.

### M2 · Verse store in Rust (Deps: M0)
- `scripts/import_ebible.py` (offline build step) → `bible.db` (schema in
  STUDY.md) for KJV first. Commit the importer, not the db.
- Rust commands: `chapter(translation, book, ch)`, `verse(ref)`,
  `search_exact(q)` on FTS5. Port the Ask grammar from `search.py` to Rust.
- **Done when:** Ask answers match the Python engine on a 50-query golden file;
  search returns in under 20 ms; Ask works with Python uninstalled.

### M3 · Reader (Deps: M1, M2)
- Read page: book picker, chapter view, two columns above 1100 px, verse tap
  panel, reading position remembered.
- Typography: blackletter book titles and drop caps, Fell/Garamond body,
  rubric verse numbers, optional Gothic reading mode.
- **Done when:** all 1,189 chapters render; keyboard navigation (`[`/`]`
  chapter, `g` go to reference) is in the command palette.

### M4 · Art pipeline and placement (Deps: M1; parallel with M2/M3)
- `scripts/art/dither.py` with Atkinson, Bayer 8x8, blue noise; `art-src/`
  ignored; `public/art/` + `CREDITS.md` committed.
- Components: `<ArtHero>`, `<ArtPlate corner>`, `<DropCap>`, `<Ornament>`; all
  use `mask-image` + tokens. Illumination-reveal shader on `SceneEnter`.
- First set: Home hero, Lab hero, one plate per page, four evangelist symbols,
  empty-state and error spots (ART.md placement tables).
- Settings: Illustrations Full / Margins / Off; reduced motion honoured.
- **Done when:** every page has art at its tier; text contrast passes WCAG AA
  with art on; total art under 3 MB.

### M5 · Translations and shelves (Deps: M2, M3)
- Import WEB, ASV, Douay-Rheims, KJV with Apocrypha, Brenton LXX, Vulgate.
- Canon shelves with badges and "Also found in" grouping.
- Compare view (one verse, all translations, word diff); parallel reading in
  dockview.
- **Done when:** a verse ref resolves in every translation that has it, and a
  disabled shelf never appears in default results.

### M6 · Notebooks (Deps: M3)
- `notes.db`, notebooks with their own translations/shelves/layout, verse-range
  notes in Markdown, highlights, tags, Markdown folder export, daily backup.
- **Done when:** notes survive a restart, follow a verse across translations,
  and round-trip through export.

### M7 · Semantic search and topics (Deps: M2)
- `scripts/embed.py` (offline) builds int8 passage embeddings per translation;
  Rust `ort` embeds queries. Hybrid BM25 + cosine with reciprocal rank fusion.
- Import Nave's Topical Bible; Topics page with topic → verses → "more like this".
- **Done when:** "verses about forgiveness" returns relevant verses that do not
  contain the word *forgive*; everything runs offline.

### M8 · Cross-reference graph (Deps: M2)
- Import OpenBible + TSK. Verse panel shows ranked refs. Study walk
  (personalised PageRank), shortest path between passages, arc diagram.
- **Done when:** study walk from any verse returns in under 200 ms.

### M9 · Jev (Deps: M7)
- Query routing, top-30 reranking, genre flags, offline topic tagging, all per
  ML.md and the workspace Jev rules. Hidden when `TYPESAFE_API_KEY` is unset.
- **Done when:** a shadow comparison (Jev vs no Jev) on 30 study questions is
  recorded in `docs/evals/`.

### M10 · Map and structure (Deps: M7)
- Scripture map (UMAP star field), chiasm finder, allusion finder (IDEAS.md).

### M11 · Lab 2.0 (Deps: M1)
- Interpretability: attention viewer, logit lens, per-verse perplexity.
- In the **Axon repo** (separate session): release `gbdt-trees`, then a burn
  transformer template that can load BibleLM's config. BibleLM's Lab switches
  to Axon when that ships, and PyTorch becomes optional.

### M12 · Grounded commentary (Deps: M7)
- Opt-in Claude API, keychain-stored key, retrieval-first prompts, mandatory
  citations, labelled output (ML.md section 3).

### M13 · Release 2.0 (Deps: M1 to M8 at least)
- Fix `project_root()` (use the app data dir, never `CARGO_MANIFEST_DIR` in
  release). Study features need no Python. Release workflow on `v*` tags.

## Suggested order

```
M0 ─┬─ M1 ─┬─ M3 ─┬─ M5
    │      │      └─ M6
    │      ├─ M4 (parallel)
    │      └─ M11
    └─ M2 ─┬─ M7 ─┬─ M9
           │      ├─ M10
           │      └─ M12
           └─ M8
                         all ── M13
```

## Running a milestone agentically

1. Start a session (own branch) with the brief: "Implement M<n> from
   docs/ROADMAP.md. Read AGENTS.md first. Stop at the definition of done."
2. The agent updates this file's checkbox list below and the CHANGELOG
   `Unreleased` section in the same branch.
3. Verify with the commands in AGENTS.md; let CI do Rust builds.
4. Review the diff, merge, delete the branch.

## Status

- [x] M0 Housekeeping
- [x] M1 Nexis shell
- [x] M2 Verse store (built as JSON in the webview, see STUDY.md)
- [x] M3 Reader
- [x] M4 Art pipeline and placement
- [x] M5 Translations and shelves
- [x] M6 Notebooks
- [x] M7 Semantic search and topics
- [x] M8 Cross-reference graph
- [~] M9 Jev (built and unit-tested; the live shadow eval waits on TYPESAFE_API_KEY)
- [x] M10 Map and structure
- [~] M11 Lab 2.0 (inspection tools done; the Axon transformer is separate work in the Axon repo)
- [-] M12 Grounded commentary (dropped: no large hosted model, see ML.md)
- [~] M13 Release 2.0 (release paths, bundled scripts and version done; installer not built or tagged)

## What changed from the plan

Decisions taken while building 2.0, recorded in each doc's "As built" note:
JSON verse store in the webview instead of SQLite in Rust (M2), OpenBible
topics instead of Nave's (M7), a parallel grid instead of dockview (M5),
transformers.js instead of `ort` (M7), engraved rather than dithered plates
(M4), genre as a lookup rather than a Jev question (M9). Not built yet:
Strong's word study, red-letter text (needs USFM markup), the Axon transformer.

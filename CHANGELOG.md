# Changelog

All notable changes to BibleLM. Format based on
[Keep a Changelog](https://keepachangelog.com/); this project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Planning docs for 2.0**: `AGENTS.md` and `docs/` (audit, roadmap, study,
  ML, design, art, ideas) describing the move to an illustrated study tool.
- **Tests and CI**: pytest for the corpus cleaner and the KJV parser/Ask engine
  (31,102 verses, 66 books, 1,189 chapters), a vitest smoke test that mounts
  every view with the Tauri APIs stubbed, and a GitHub Actions workflow running
  both plus `cargo check`.

## [1.2.0] — 2026-09-02

### Added

- **Drop-in model import** — drag a `.pt` checkpoint, a `.onnx` graph, or a
  `tokenizer.json` onto the app (**Model** tab) to run the released
  model without training. Each file is validated by `python/biblelm/model_io.py`
  before it replaces anything, so a wrong or corrupt file fails at import with a real
  message instead of at generation time. A path field covers cases where dragging
  isn't practical.
- **Self-contained checkpoints** — training now embeds the character vocabulary in the
  `.pt` (`tokenizer_stoi`), so a single checkpoint file is enough to generate from;
  the import unpacks `tokenizer.json` from it. Older checkpoints that only reference
  the tokenizer still import, and the report says to drop that file too.
- **Remove a custom translation** — the trash icon on a user-added row deletes it and
  its downloaded corpus. A mistyped URL used to be permanent.

### Changed

- **The Export tab is now the Model tab**, covering both directions: import a model to
  run without training, or export a checkpoint you trained to ONNX. The view moved to
  `src/modules/model/ModelView.tsx` alongside the import card.

### Fixed

- **Gutenberg book pages were silently trained on as scripture.** Pasting the URL from
  your browser's address bar (`gutenberg.org/ebooks/10`) returns an HTML page with
  status 200, so nothing errored: the markup was saved as a corpus, given real-looking
  stats, and marked ready. That form is now rewritten to the corresponding `.txt`, and
  any other response that is a web page is rejected with an explanation.
- **The selected translation reset to KJV on every restart**, so a run started after a
  restart could train on a different corpus than the one shown as selected. The choice
  now persists, and a selection pointing at a translation that was removed or never
  downloaded falls back to one that is actually available.
- **The VRAM guard always assumed a 75-token vocabulary** regardless of the selected
  translation — nothing ever populated the corpus stats it reads. The Training tab's
  estimate now follows the selected corpus.
- **Carriage returns were tokens.** Gutenberg files are CRLF, so a bare `
` took a
  vocabulary slot and preceded all ~100k newlines; the model spent capacity learning
  to emit it and leaked stray CRs into generated text. Corpora are normalised to LF
  (KJV vocabulary: 75 → 74).
- **Ask was missing the entire book of Genesis.** The KJV parser found the start
  of the text by a hardcoded line offset (`TOC_END = 140`) measured against an older
  Project Gutenberg layout. Gutenberg has since shortened the front matter, so both
  Genesis headers fell before the cutoff and were skipped: the parser began at Exodus
  and produced 29,569 verses across 65 books. Every answer was wrong as a result —
  "how many books" said 65, "how many verses" said 29,569, and `Genesis 1:1` could not
  be found at all. The body is now located by structure (a table-of-contents entry is
  followed by another heading; a real one is followed by verse content), which is not
  sensitive to reformatting. Parses 31,102 verses across 66 books, matching the
  canonical KJV.
- **A built-in Ask example returned no results** — "find do unto others" is not the
  KJV's wording, so the one example demonstrating phrase search demonstrated it
  failing. Replaced with "find fishers of men".
- **The Ask tab had no title** in the window header — `ask` was missing from the
  header's label map. The map is now typed by `View`, so a future view without a label
  fails to compile instead of rendering blank.
- **The VRAM meter could sit on "querying GPU…" forever.** The probe shells out to
  Python/torch and fails for ordinary reasons (no venv, torch missing), but the error
  was swallowed. It now reports the failure and offers a retry.
- **Corpus sample and vocabulary count were hardcoded to the KJV** and didn't change
  when another translation was selected. Both now come from the selected corpus.
- **Translations named in a non-Latin script could not be added at all** — the id was
  slugged from the name and came out empty, permanently disabling the Add button with
  no explanation. Names now fold accents, fall back to a stable hash, and the form
  says which field is blocking.
- **User-added translations never showed the "custom" badge** — they were written to
  the registry as `verified: true`.
- Checkpoints are loaded with `weights_only=True` at import, generation, and export. A
  `.pt` is a pickle, and these files now come from the internet.

## [1.0.0] — 2026-06-23

First public release — a complete, from-scratch language-model pipeline with a live
training dashboard.

### Added

- **From-scratch GPT** (`python/biblelm/model.py`) — character-level decoder-only
  transformer: token + positional embeddings, causal multi-head attention, pre-norm
  blocks, weight-tied LM head. No model libraries.
- **Live training** — PyTorch training loop that streams loss / val-loss / throughput
  metrics on a ~20 Hz wall-clock cadence; checkpoints the best validation loss. CUDA
  auto-detected.
- **Real-time dashboard** — Tauri 2 + React 19 + Tailwind v4 UI with a hand-rolled SVG
  loss chart that fills its container at any aspect ratio, live metric cards, and a
  borderless window chrome.
- **Multi-translation corpus** — download Bible translations or add your own by URL
  (any language; the char tokenizer adapts to the script). Select which translation to
  train on.
- **Streaming inference** — prompt the model and stream a completion token by token,
  with temperature / max-tokens / top-k controls.
- **ONNX export** — convert a checkpoint to a portable `.onnx` graph, validated with
  `onnx.checker`.
- **Plain-English help** — every ML knob (d_model, n_heads, temperature, top-k, …) has
  an info tooltip aimed at readers with zero ML background.
- **Architecture** — Rust backend spawns the Python scripts and bridges their NDJSON
  stdout to Tauri events; the frontend never touches PyTorch.

[1.2.0]: https://github.com/rwetz/biblelm/releases/tag/v1.2.0
[1.0.0]: https://github.com/rwetz/biblelm/releases/tag/v1.0.0

# Changelog

All notable changes to BibleLM. Format based on
[Keep a Changelog](https://keepachangelog.com/); this project follows
[Semantic Versioning](https://semver.org/).

## [2.0.0] (unreleased)

BibleLM becomes an illustrated Bible study tool with the ML lab inside it.

### Added

- **A reader**: every chapter of six public-domain translations (KJV with the
  1611 Apocrypha, WEB, ASV, Douay-Rheims, Brenton Septuagint, Vulgate), with
  blackletter titles and drop caps, Garamond or Fell English text, the KJV's
  supplied words in italics, two-column and parallel reading, `[` and `]` to
  turn chapters.
- **All 241 Doré plates** from the 1866 *Grande Bible de Tours*, each set beside
  the verse it depicts; dithered Doré heroes on Home (changing with the church
  year) and the Lab; a plate in the corner of every other page.
- **A verse panel**: the verse in your translations, a word-level comparison
  across all six, cross references (341k, OpenBible.info), topics, verses like
  it by meaning, highlights and notes.
- **Search** by reference, word, question (the old Ask grammar, now in-app and on
  every translation), and by meaning with a local embedding model; hidden
  shelves are listed apart, never mixed in.
- **Topics**: OpenBible's 6,712-topic index, study walks (personalised
  PageRank over cross references), the strongest chain between two passages,
  a map of every verse placed by meaning, and a chiasm finder.
- **Notebooks**: one per study, each with its own translations, canon and cover
  plate; verse-anchored notes with tags; Markdown export; daily backups.
- **Canon shelves**: Protestant, Deuterocanon, Apocrypha.
- **Lab, Inside the model**: attention heads, the logit lens, and the most and
  least surprising verses to the model.
- **Optional machine help**: Jev query routing and reranking, with the user's
  own TypeSafe key. No large hosted model is used.
- The Scriptorium theme (Vellum and Nocturne) on `@nexis/design`, with a command
  palette for every action.
- Planning docs, tests (TypeScript, Python, Rust), and CI.

### Changed

- The five ML tabs moved under **Lab**. Ask is now part of Search and no longer
  needs Python.
- Release builds find their files properly: the Lab's scripts are bundled and
  its data lives in the app data folder, not the folder the app was built in.

### Removed

- The Python search worker for Ask (`bible_search`), replaced by the in-app engine.

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

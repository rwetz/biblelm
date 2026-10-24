# BibleLM audit (2026-10-20, v1.2.0)

What the app is today, judged against what it is about to become: a Bible
**study tool** with an ML lab inside it, rather than an ML lab that happens to
use the Bible.

## What exists

| Area | State |
|---|---|
| Frontend | Tauri 2 + React 19, five tabs (Corpus, Training, Inference, Ask, Model). Own shadcn copy, Inter, Hugeicons, amber "parchment" brand. About 3,700 lines of TSX. |
| Backend | `src-tauri/src/lib.rs` (716 lines): spawns Python modules, bridges NDJSON to Tauri events. |
| ML | `python/biblelm/`: hand-written char-level GPT (3.2M params, val loss 1.19), training loop, sampling, ONNX export, VRAM guard. |
| Search | `search.py`: deterministic KJV parser (31,102 verses, 66 books) plus a small intent grammar (reference lookup, counts, phrase find, longest/shortest). |
| Tests / CI | None. |
| Docs | Good README and CHANGELOG. `docs/SPEC.md` is the original idea note. |

## Usability

**Works well**

- The pipeline is honest and legible: corpus, train, watch, sample, export. The
  live loss chart and VRAM guard are genuinely nice.
- Drop-in model import with validation (v1.2.0) removed the "must train first"
  wall.
- The CHANGELOG is unusually good: real causes, real fixes.

**Gets in the way**

1. **Python is a hard dependency.** A user needs Python 3.13, a venv and the
   right PyTorch wheel before anything works, including the Ask tab, which uses
   no ML at all. This is the single biggest usability problem.
2. **The installer is tied to the build machine.** `project_root()` falls back to
   `CARGO_MANIFEST_DIR`, a compile-time path. The README already tells people to
   build from source instead.
3. **Every search spawns Python and re-parses the whole KJV.** Fine on a fast
   machine, but it is a cold process per keystroke-submit and blocks any
   "search as you type".
4. **Search only understands the Gutenberg KJV layout.** The header table in
   `search.py` is Gutenberg-specific, so added translations can be trained on but
   not read, searched or compared.
5. **No reading view.** You cannot open a chapter and read it. For a study tool
   this is the core screen and it does not exist yet.
6. **No persistence of your own work.** No notes, highlights, bookmarks or
   history.
7. **The five tabs are ML stages, not study tasks.** A new user meets "Corpus"
   and "Training" first.

## Creativity

- The idea (own every piece of a language model, on a text people care about)
  is strong and a good portfolio story.
- The visual identity is generic: stock shadcn neutrals plus one amber accent.
  Nothing on screen says "old Bible" except a serif in verse cards.
- The generated text is a curiosity, not a study aid: a 3.2M-parameter
  character model produces KJV-sounding prose with no grounding. That is fine
  for the Lab, and should never be presented as scripture.

## Pros

- Clean, small, readable codebase; the GPT is written to be understood.
- Clear process boundary (Rust spawns workers, NDJSON events) that is easy to
  extend with new workers.
- Deterministic search proves the "exact rules stay in code" principle.
- Public-domain corpus, MIT license, no telemetry.

## Cons

- Python + PyTorch for everything, including non-ML features.
- No tests, no CI, so every refactor is on trust.
- Not on `@nexis/design`: its own component copy, fonts and icons break the
  family rules (one accent, `<Icon>` only, Geist, motion vocabulary, command
  palette).
- One translation, one canon, one text format.
- The ML that would actually help study (semantic search, topic discovery,
  cross references) is missing; the ML that exists (generation) does not help
  study.
- Axon (the Rust engine this project was meant to prove out, per `SPEC.md`) is
  not used at all. Axon today trains MLPs, CNNs and gradient-boosted trees, not
  transformers, and its v0.9.0 work on the `gbdt-trees` branch is unreleased.

> **Since (2026-10):** this audit describes 1.x and is kept as it was. Axon
> has since gained trees (v0.10.0) and a text GPT (v0.11.0) on its `text-gpt`
> branch, which BibleLM's Lab drives when it is installed (ML.md); the release
> waits on that branch's pull request to Axon's `main`.

## Verdict

Keep the Lab, it is the best-built part. Build a study app around it:
a structured verse store in Rust, a reading view, notebooks, multi-translation
and canon support, semantic search, and an art direction worthy of the subject.
See [ROADMAP.md](ROADMAP.md).

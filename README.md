<div align="center">

# BibleLM

**A tiny GPT-style transformer, trained from scratch on the Bible — with a live training dashboard.**

Tauri 2 · React 19 · TypeScript · Tailwind v4 · PyTorch · CUDA

</div>

---

BibleLM is a desktop app for training a small, from-scratch GPT (a character-level
transformer) on the King James Bible — or any Bible translation, in any language —
and watching it learn in real time. No pre-trained weights, no fine-tuning: the
tokenizer, the transformer, the training loop, and the sampling are all built here
from the ground up. It's a complete, owned, end-to-end language-model pipeline:
**corpus → tokenizer → training → inference → ONNX export.**

It is not trying to be a useful chatbot. The KJV is ~4MB of text; a model this size
will produce convincing *Biblical-sounding* prose, not answer questions. The point is
to **see a transformer learn** — and to own every piece of the stack.

## What it does

Four tabs, one pipeline:

| Tab | What it does |
|---|---|
| **Corpus** | Download Bible translations (KJV preset, or add any plain-text URL in any language). Pick one to train on. |
| **Training** | Configure the model (layers, heads, context, etc.), start training, and watch the **live loss chart**, loss/val/throughput numbers update at ~20 Hz. Every knob has a plain-English explanation. |
| **Inference** | Prompt the trained model and stream a KJV-style completion token by token, with temperature / max-tokens / top-k controls. |
| **Export** | Convert the trained checkpoint to **ONNX** (a portable, framework-neutral model file) so it can run outside this app. |

## How it works

The frontend never touches PyTorch. The Rust backend spawns the Python ML scripts as
child processes and bridges their output to the UI:

```
React (Tauri webview)  ──invoke──►   Rust (Tauri)   ──spawn──►   Python (PyTorch + CUDA)
        ▲                                   │                              │
        └──────────── Tauri events ◄────────┴────── NDJSON on stdout ──────┘
            (train:metric, inference:token, corpus:progress, …)
```

Each Python process emits **one JSON object per line** on stdout (a metric, a token, a
progress tick); Rust parses those and re-emits them as Tauri events the React store
subscribes to. It's the same "spawn a CLI, parse a line protocol" pattern a language
server uses.

The model ([`python/biblelm/model.py`](python/biblelm/model.py)) is a standard
decoder-only transformer — token + positional embeddings, causal multi-head attention,
pre-norm blocks, a weight-tied LM head — written for legibility, no model libraries.

## Quick start

**Prerequisites:** [Node + pnpm](https://pnpm.io/), [Rust](https://rustup.rs/),
[Python 3.13](https://www.python.org/), and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/). An NVIDIA GPU is
recommended (CUDA) but CPU works.

```sh
# 1. Frontend dependencies
pnpm install

# 2. Python environment + PyTorch
py -3.13 -m venv .venv
.venv\Scripts\python -m pip install -U pip
.venv\Scripts\python -m pip install -r python/requirements.txt
# NVIDIA GPU — install the CUDA build instead of the default CPU wheel:
.venv\Scripts\python -m pip install torch --index-url https://download.pytorch.org/whl/cu124

# 3. Run the app
pnpm tauri dev
```

Then: **Corpus** → Download KJV → **Training** → Start Training → watch it learn →
**Inference** → generate.

The Rust backend finds the interpreter at `.venv/` automatically (override with the
`BIBLELM_PYTHON` env var; override the project root with `BIBLELM_ROOT`).

## Using other translations and languages

The Corpus tab isn't limited to the KJV. Click **Add translation**, give it a name and
language, and paste any plain-text Bible URL (e.g. a Project Gutenberg `.txt`). The
character-level tokenizer adapts to any script, so Greek, Latin, Spanish, German, etc.
all work — the model simply learns whatever vocabulary the text contains. Added
translations are saved to `data/custom_sources.json`.

## The released model

The [v1.0.0 release](https://github.com/rwetz/biblelm/releases/tag/v1.0.0) includes a
KJV model trained with this app:

- `ckpt.pt` — the trained PyTorch weights + config
- `model.onnx` — the same model exported to ONNX
- `tokenizer.json` — the character vocabulary

Drop `ckpt.pt` and `tokenizer.json` into `runs/current/` to generate from it without
training, or load `model.onnx` in any ONNX runtime.

## Project layout

```
src/                  React frontend (modules per view, Zustand store, SVG loss chart)
src-tauri/            Rust backend — spawns Python, bridges NDJSON ↔ Tauri events
python/biblelm/       PyTorch stack: model, tokenizer, training, generation, ONNX export, corpus
```

See [`python/README.md`](python/README.md) for the training stack and the event protocol.

## License

[MIT](LICENSE). The KJV text is public domain (Project Gutenberg #10).

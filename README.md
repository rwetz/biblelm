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

It is not trying to be a useful chatbot. The KJV is ~4 MB of text; a model this size
will produce convincing *Biblical-sounding* prose, not answer questions. The point is
to **see a transformer learn** — and to own every piece of the stack.

---

## What the app provides vs. what you bring

### The app provides

- A full desktop UI: corpus manager, live training dashboard, inference panel, exact
  KJV search engine, and ONNX export — all wired together.
- The PyTorch training stack (`python/biblelm/`): tokenizer, GPT model, training loop,
  generation, search engine, and ONNX export script.
- KJV Bible download built in (Project Gutenberg #10, ~4.4 MB — fetched from inside
  the app; no manual download needed).
- Live training telemetry at ~20 Hz (loss chart, val loss, tokens/sec, device).
- **GPU memory guard**: estimates VRAM usage from your config before you start —
  prevents out-of-memory crashes by blocking runs that won't fit your GPU.

### What you need to bring

| Requirement | Notes |
|---|---|
| **Python 3.13** | Exact version — PyTorch wheels are built for 3.13. Avoid system Python 3.14. |
| **PyTorch** | CPU build works; CUDA build strongly recommended for speed. Install separately after setting up the venv (see Quick Start). |
| **An NVIDIA GPU** | Optional but highly recommended. The default config trains in ~5 min on an RTX 4070; on CPU, expect 10–50× slower. |
| **Rust + Tauri prerequisites** | Only needed if building from source. |
| **Node + pnpm** | Only needed if building from source. |

> **About the pre-built installer:** The NSIS installer bundles the app binary and
> the Python scripts, but **not** Python itself or PyTorch. After installing, you still
> need to create a Python venv, install PyTorch, and point the app at it — the same
> steps as a source build, minus the compile step. See Quick Start below.
>
> The installer is also built from a fixed source path and expects your Python venv
> at that same path. For the easiest experience, **build from source** rather than
> using the installer — `pnpm tauri build` produces a working installer for your
> own machine in ~3 minutes.

---

## What it does

Five tabs, one pipeline:

| Tab | What it does |
|---|---|
| **Corpus** | Download Bible translations (KJV preset, or add any plain-text URL in any language). Pick one to train on. |
| **Training** | Configure the model (layers, heads, context, batch size, etc.), start training, and watch the **live loss chart** update at ~20 Hz. Shows estimated VRAM usage and blocks runs that would OOM. |
| **Inference** | Prompt the trained model and stream a KJV-style completion token by token, with temperature / max-tokens / top-k controls. |
| **Ask** | Deterministic search over all 31,102 KJV verses. Look up any reference (`John 3:16`), count word occurrences, find the longest verse, get book stats, or search for any phrase — instant, no LLM. |
| **Export** | Convert the trained checkpoint to **ONNX** (a portable, framework-neutral model file) so it can run outside this app. |

---

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
subscribes to.

The model ([`python/biblelm/model.py`](python/biblelm/model.py)) is a standard
decoder-only transformer — token + positional embeddings, causal multi-head attention,
pre-norm blocks, a weight-tied LM head — written for legibility, no model libraries.

---

## Quick start (from source)

**Prerequisites:** [Node + pnpm](https://pnpm.io/), [Rust](https://rustup.rs/),
[Python 3.13](https://www.python.org/), and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/).

```sh
# 1. Frontend dependencies
pnpm install

# 2. Python environment
py -3.13 -m venv .venv
.venv\Scripts\python -m pip install -U pip
.venv\Scripts\python -m pip install -r python/requirements.txt

# 3. PyTorch — choose one:
#    NVIDIA GPU (recommended):
.venv\Scripts\python -m pip install torch --index-url https://download.pytorch.org/whl/cu124
#    CPU only:
.venv\Scripts\python -m pip install torch

# 4. Run
pnpm tauri dev
```

Then: **Corpus** → Download KJV → **Training** → Start Training → watch it learn →
**Inference** → generate.

The Rust backend finds the interpreter at `.venv/` automatically. Override with
`BIBLELM_PYTHON` (path to Python exe) or `BIBLELM_ROOT` (project root).

---

## GPU memory guard

The Training tab shows a live **Est. VRAM** bar that updates as you move any config
slider. It accounts for model weights, gradients, Adam optimizer states, attention
activation maps, and CUDA runtime overhead — and errs on the conservative side. The
**Start Training** button is disabled (showing "Over VRAM limit") when the estimate
exceeds 90% of your GPU's total memory.

The biggest VRAM consumers in order are:

1. `batch_size × context_len` — the attention map scales quadratically with context length
2. `d_model` — wider models grow parameters and activations together
3. `n_layers` — each layer adds a full copy of the activation stack

**If you hit the limit**, reduce `batch_size` first (most headroom, least impact on
quality), then `context_len`, then `d_model`.

---

## Using other translations and languages

The Corpus tab isn't limited to the KJV. Click **Add translation**, give it a name and
language, and paste any plain-text Bible URL. The character-level tokenizer adapts to
any script — Greek, Latin, Spanish, Hebrew (romanized), etc. all work. Added
translations are saved to `data/custom_sources.json`.

---

## The released model

The [v1.1.0 release](https://github.com/rwetz/biblelm/releases/tag/v1.1.0) includes a
KJV model trained with this app:

- `ckpt.pt` — trained PyTorch weights + config  
- `model.onnx` — same model exported to ONNX  
- `tokenizer.json` — character vocabulary  

Drop `ckpt.pt` and `tokenizer.json` into `runs/current/` to generate from it without
training, or load `model.onnx` in any ONNX runtime.

Model specs: 256 d_model / 4 layers / 4 heads / 256 context — 3.2M parameters, 15
epochs on KJV, val loss 1.19, ~290K tok/s on RTX 4070 SUPER.

---

## Project layout

```
src/                  React frontend (modules per view, Zustand store, SVG loss chart)
src-tauri/            Rust backend — spawns Python, bridges NDJSON ↔ Tauri events
python/biblelm/       PyTorch stack:
  model.py              GPT-mini transformer (embeddings, causal MHA, LM head)
  train.py              Training loop, metric emission, checkpoint saving
  tokenizer.py          Character-level tokenizer (BPE stubbed)
  generate.py           Autoregressive sampling with temperature / top-k
  search.py             Deterministic KJV verse parser + query engine (31,102 verses)
  gpu_info.py           CUDA device probe — total/free VRAM, GPU name
  corpus.py             Multi-version corpus registry + streaming download
  export_onnx.py        PyTorch → ONNX conversion
```

---

## License

[MIT](LICENSE). The KJV text is public domain (Project Gutenberg #10).

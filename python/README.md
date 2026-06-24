# BibleLM — training stack

A small, from-scratch GPT (PyTorch) trained on the King James Bible, plus the
tokenizer, corpus tooling, generation, and ONNX export. The Tauri/Rust backend
drives these modules as child processes and parses their stdout (one JSON event
per line — see [`biblelm/protocol.py`](biblelm/protocol.py)) into live UI events.

## Setup

```sh
py -3.13 -m venv .venv
.venv\Scripts\python -m pip install -U pip
.venv\Scripts\python -m pip install -r python/requirements.txt
# NVIDIA GPU: install the CUDA build instead of the default CPU wheel —
.venv\Scripts\python -m pip install torch --index-url https://download.pytorch.org/whl/cu124
```

The Rust backend auto-discovers `.venv` at the repo root (override with the
`BIBLELM_PYTHON` env var; override the repo root with `BIBLELM_ROOT`).

## Modules

| Module | Role |
|---|---|
| `protocol.py` | JSON-line event emitter (stdout = events, stderr = logs) |
| `corpus.py` | Multi-version Bible registry, streaming download, Gutenberg cleanup, stats |
| `tokenizer.py` | Character-level tokenizer (BPE stubbed for later) |
| `model.py` | GPT-mini: token+pos embeddings, causal MHA, blocks, tied LM head, sampling |
| `data.py` | train/val split + batch sampler |
| `train.py` | training loop streaming live metrics + checkpoints |
| `generate.py` | autoregressive sampling, streams tokens |
| `export_onnx.py` | trace a checkpoint to ONNX |

## Run standalone

```sh
set PYTHONPATH=python
python -m biblelm.corpus download --version kjv --data-dir data
python -m biblelm.train --corpus data/kjv.txt --run-dir runs/current \
    --d-model 256 --n-layers 4 --n-heads 4 --context-len 256 \
    --batch-size 32 --lr 3e-4 --epochs 10 --eval-interval 200
python -m biblelm.generate --run-dir runs/current --prompt "In the beginning" \
    --temperature 0.8 --max-tokens 256 --top-k 40
python -m biblelm.export_onnx --run-dir runs/current --out runs/current/model.onnx
```

## Adding a translation

`corpus.py` has a `SOURCES` registry. KJV is verified (Project Gutenberg #10);
add an entry with a public-domain plain-text `url` and set `verified=True` to
enable another version — that is the whole extension point.

## Event protocol

```jsonc
{"type":"status",  "phase":"start", "device":"cuda", "params":12345678, "total_steps":21600}
{"type":"progress","bytes":123, "total":456}                         // downloads
{"type":"metric",  "step":100, "epoch":1, "train_loss":2.4, "val_loss":1.9, "tokens_per_sec":72000}
{"type":"token",   "token":"a"}                                      // generation
{"type":"done",    "checkpoint":"runs/current/ckpt.pt", "best_val_loss":1.83}
{"type":"error",   "message":"..."}
```

# Changelog

All notable changes to BibleLM. Format based on
[Keep a Changelog](https://keepachangelog.com/); this project follows
[Semantic Versioning](https://semver.org/).

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

[1.0.0]: https://github.com/rwetz/biblelm/releases/tag/v1.0.0

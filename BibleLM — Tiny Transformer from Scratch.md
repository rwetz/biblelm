---
created: 2026-06-22
tags:
  - status/raw
  - type/experiment
---

# BibleLM — Tiny Transformer from Scratch

## The Idea
Train a small GPT-style transformer entirely from scratch on the King James Bible, then run inference through nexis-ml-rs (custom Rust engine). The goal isn't a useful chatbot — it's a complete, owned, end-to-end LM pipeline: tokenizer → training loop → ONNX export → Rust inference.

## Motivation
Nexis-ml-rs needs real models to prove out. The Bible is a well-structured, freely available, single-domain corpus — perfect for a constrained training experiment where you can actually see the model learn. Bonus: it's a conversation starter ("I trained a language model from scratch and ran it without Python").

## Honest Scope Check
The KJV Bible is ~4MB / ~800k words. A model trained only on this will:
- Generate plausible Biblical-style text ✅
- Answer questions about scripture ❌ (not enough data or RLHF)

**Don't position this as a product.** Position it as: "from-scratch transformer training + custom Rust inference runtime." That's the portfolio story.

## Rough Shape
- **Tokenizer:** BPE or character-level (character-level is simpler and surprisingly good at small scale)
- **Architecture:** GPT-2 mini (4–6 layers, ~10M params — trainable on a single GPU in hours)
- **Training:** PyTorch training loop with nexis-ml protocol for live metric streaming
- **Export:** ONNX → load into nexis-ml-rs
- **Inference:** Rust binary — prompt in, Bible-style completion out
- **Stretch:** Plug into Nexis terminal as an AI agent that speaks in KJV

## Potential Next Steps
- [ ] Download KJV Bible plain text (Project Gutenberg)
- [ ] Build character-level or BPE tokenizer in Python
- [ ] Train GPT-mini with PyTorch, stream metrics via nexis-ml protocol
- [ ] Export to ONNX, load in nexis-ml-rs
- [ ] Write a simple completion CLI in Rust

## Related
- [[My Profile]]
- [[nexis-ml-rs]] (inference backend)
- [[nexis-ml]] (Python training predecessor)
- [[Nexis]] (stretch: plug in as a KJV agent)
- [[Transfer Learning vs From-Scratch Audio Classification]] (same "train from scratch" theme)

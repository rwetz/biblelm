"""Look inside the trained GPT: attention, the logit lens, and surprise.

CLI (prints one JSON event, see protocol.py):
    python -m biblelm.inspect_model lens --run-dir runs/current --text "In the beginning"
    python -m biblelm.inspect_model surprise --run-dir runs/current --corpus data/kjv.txt --limit 20

lens      For each position of a short text: every head's attention pattern,
          the model's top guesses for the next character after each layer
          (the "logit lens": decode the residual stream early, through the
          final LayerNorm and the tied head), and the loss on the actual text.
surprise  Mean per-character loss of every KJV verse: the verses the model
          finds most predictable and most surprising. A statistic about a
          small model's habits, not a judgement about the verses.

Nothing here changes model.py; it re-runs the same modules step by step.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import torch
from torch.nn import functional as F

from . import protocol
from .generate import load
from .search import parse_kjv

MAX_LENS = 96  # characters shown in the attention view


@torch.no_grad()
def lens(model, tok, text: str, top: int = 3) -> dict:
    ids = tok.encode(text)[-MAX_LENS:]
    if len(ids) < 2:
        raise ValueError("type at least two characters the model knows")
    idx = torch.tensor([ids], dtype=torch.long)
    T = idx.shape[1]
    x = model.tok_emb(idx) + model.pos_emb(torch.arange(T))
    attention, guesses = [], []
    for block in model.blocks:
        a = block.attn
        h = block.ln1(x)
        q, k, v = a.qkv(h).split(h.shape[-1], dim=2)
        q = q.view(1, T, a.n_heads, a.d_head).transpose(1, 2)
        k = k.view(1, T, a.n_heads, a.d_head).transpose(1, 2)
        att = (q @ k.transpose(-2, -1)) / math.sqrt(a.d_head)
        att = att.masked_fill(a.mask[:, :, :T, :T] == 0, float("-inf")).softmax(-1)
        attention.append([[[round(float(p), 3) for p in row] for row in head] for head in att[0]])
        x = block(x)  # the real block, so the residual stream is exactly the model's
        probs = F.softmax(model.head(model.ln_f(x))[0], -1)
        pv, pi = probs.topk(top, -1)
        guesses.append([[[tok.decode([int(i)]), round(float(p), 3)] for p, i in zip(pv[t], pi[t])] for t in range(T)])
    logits = model.head(model.ln_f(x))[0]
    loss = F.cross_entropy(logits[:-1], idx[0, 1:], reduction="none")
    return {
        "chars": [tok.decode([i]) for i in ids],
        "attention": attention,  # [layer][head][query][key]
        "lens": guesses,  # [layer][position] -> [[char, p], ...]
        "loss": [None] + [round(float(l), 3) for l in loss],  # loss of predicting char t from < t
        "layers": len(model.blocks),
        "heads": model.blocks[0].attn.n_heads,
    }


@torch.no_grad()
def surprise(model, tok, corpus: Path, limit: int, device: torch.device) -> dict:
    verses = parse_kjv(corpus)
    ctx = model.cfg.context_len
    scored = []
    for v in verses:
        ids = tok.encode(" " + v["text"])[: ctx]
        if len(ids) < 8:
            continue
        idx = torch.tensor([ids], dtype=torch.long, device=device)
        logits, _ = model(idx)
        loss = F.cross_entropy(logits[0, :-1], idx[0, 1:]).item()
        scored.append((loss, v["ref"], v["text"]))
    scored.sort()
    mean = sum(s[0] for s in scored) / max(1, len(scored))
    pick = lambda rows: [{"ref": r, "text": t, "loss": round(l, 3)} for l, r, t in rows]
    return {
        "mean": round(mean, 3),
        "count": len(scored),
        "predictable": pick(scored[:limit]),
        "surprising": pick(scored[-limit:][::-1]),
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("mode", choices=["lens", "surprise"])
    ap.add_argument("--run-dir", type=Path, default=Path("runs/current"))
    ap.add_argument("--text", default="In the beginning God created")
    ap.add_argument("--corpus", type=Path, default=Path("data/kjv.txt"))
    ap.add_argument("--limit", type=int, default=15)
    args = ap.parse_args(argv)
    try:
        device = torch.device("cuda" if torch.cuda.is_available() and args.mode == "surprise" else "cpu")
        model, tok = load(args.run_dir, None, None, device)
        model.eval()
        if args.mode == "lens":
            protocol.emit({"type": "inspect", **lens(model, tok, args.text)})
        else:
            protocol.emit({"type": "inspect", **surprise(model, tok, args.corpus, args.limit, device)})
        return 0
    except Exception as e:  # surfaced in the UI as the real message
        protocol.error(str(e))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

"""Sample a trained checkpoint across a grid of sampling settings, for tuning.

Loads the model once and writes one JSON line per sample to stdout:

    {"temperature":0.8,"top_k":40,"prompt":"And it came to pass","text":"..."}

`scripts/bench/tune-sampling.ts` scores each sample with Jev's judge (the same
questions the Generate tab asks) and reports which settings read most like
the King James Version and make the most sense.

    python -m biblelm.sample_grid --run-dir runs/current > samples.jsonl
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import torch

from .generate import load
from .model import sample_next
from .train import pick_device

PROMPTS = ["And it came to pass", "Blessed are", "Thus saith the LORD", "In the beginning"]


@torch.no_grad()
def sample(model, tokenizer, prompt: str, n: int, temperature: float, top_k: int, max_tokens: int, device) -> list[str]:
    ids = tokenizer.encode(prompt) or tokenizer.encode("\n")
    idx = torch.tensor([ids] * n, dtype=torch.long, device=device)
    for _ in range(max_tokens):
        idx = torch.cat([idx, sample_next(model, idx, temperature, top_k or None)], dim=1)
    return [tokenizer.decode(row[len(ids):].tolist()) for row in idx]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="biblelm.sample_grid")
    ap.add_argument("--run-dir", type=Path, default=Path("."))
    ap.add_argument("--temperatures", default="0.5,0.6,0.7,0.8,0.9,1.0,1.2")
    ap.add_argument("--top-ks", default="0,10,20,40", help="0 means no top-k cut")
    ap.add_argument("--per", type=int, default=4, help="samples per prompt and setting")
    ap.add_argument("--max-tokens", type=int, default=220)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda", "gpu"])
    args = ap.parse_args(argv)

    device = pick_device(args.device)
    model, tokenizer = load(args.run_dir, None, None, device)
    for t in (float(x) for x in args.temperatures.split(",")):
        for k in (int(x) for x in args.top_ks.split(",")):
            for prompt in PROMPTS:
                torch.manual_seed(args.seed)  # the same draws for every setting
                for text in sample(model, tokenizer, prompt, args.per, t, k, args.max_tokens, device):
                    sys.stdout.write(json.dumps({"temperature": t, "top_k": k, "prompt": prompt, "text": text}, ensure_ascii=False) + "\n")
            sys.stdout.flush()
            print(f"  t={t} k={k}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

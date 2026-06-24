"""Generate a completion from a trained checkpoint, streaming token by token.

Run by the Rust backend:

    python -m biblelm.generate --run-dir <runs>/<id> --prompt "In the beginning" \
        --temperature 0.8 --max-tokens 256 --top-k 40

Emits one {"type":"token","token":"<char>"} per sampled character, then a
{"type":"done"}. The checkpoint carries its own GPTConfig, so no architecture
flags are needed at generation time.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import torch

from . import protocol
from .model import GPTConfig, GPTMini, sample_next
from .tokenizer import CharTokenizer
from .train import pick_device


def load(run_dir: Path, checkpoint: Path | None, tokenizer: Path | None, device: torch.device):
    ckpt_path = checkpoint or (run_dir / "ckpt.pt")
    tok_path = tokenizer or (run_dir / "tokenizer.json")
    if not ckpt_path.exists():
        raise FileNotFoundError(f"no checkpoint at {ckpt_path} — train a model first")

    ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    cfg = GPTConfig(**ckpt["config"])
    model = GPTMini(cfg).to(device)
    model.load_state_dict(ckpt["model"])
    model.eval()
    return model, CharTokenizer.load(tok_path)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="biblelm.generate")
    ap.add_argument("--run-dir", type=Path, default=Path("."))
    ap.add_argument("--checkpoint", type=Path, default=None)
    ap.add_argument("--tokenizer", type=Path, default=None)
    ap.add_argument("--prompt", default="")
    ap.add_argument("--temperature", type=float, default=0.8)
    ap.add_argument("--max-tokens", type=int, default=256)
    ap.add_argument("--top-k", type=int, default=40)
    ap.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda", "gpu"])
    ap.add_argument("--protocol", action="store_true")
    args = ap.parse_args(argv)

    try:
        device = pick_device(args.device)
        model, tokenizer = load(args.run_dir, args.checkpoint, args.tokenizer, device)

        # Seed the context. An empty prompt starts from a single newline so the
        # model still has something to condition on.
        seed = args.prompt if args.prompt else "\n"
        ids = tokenizer.encode(seed) or tokenizer.encode("\n")
        idx = torch.tensor([ids], dtype=torch.long, device=device)

        for _ in range(args.max_tokens):
            nxt = sample_next(model, idx, args.temperature, args.top_k)
            idx = torch.cat([idx, nxt], dim=1)
            protocol.token(tokenizer.decode([int(nxt.item())]))
        protocol.done()
        return 0
    except Exception as exc:  # noqa: BLE001
        protocol.error(str(exc))
        return 1


if __name__ == "__main__":
    sys.exit(main())

"""Train GPT-mini and stream live metrics.

Run by the Rust backend as a child process:

    python -m biblelm.train --corpus <data>/kjv.txt --run-dir <runs>/<id> \
        --d-model 256 --n-layers 4 --n-heads 4 --context-len 256 \
        --batch-size 32 --lr 3e-4 --epochs 10 --eval-interval 200

Every line on stdout is a JSON event (protocol.py). Metrics are emitted
frequently so the loss chart fills in as training proceeds; a full
train+val estimate is taken every `eval-interval` steps. The best-val
checkpoint, the tokenizer, and an append-only metrics.jsonl are written to
`run-dir`. SIGINT/SIGTERM stop cleanly, saving a checkpoint first.
"""

from __future__ import annotations

import argparse
import json
import signal
import time
from dataclasses import asdict
from pathlib import Path

import torch

from . import protocol, tokenizer as tok
from .data import Dataset
from .model import GPTConfig, GPTMini

_STOP = False


def _install_signal_handlers() -> None:
    def handler(signum, _frame):
        global _STOP
        _STOP = True
        protocol.log(f"received signal {signum}; stopping after this step")

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            signal.signal(sig, handler)
        except (ValueError, OSError):
            pass  # not on the main thread / unsupported platform


def pick_device(requested: str) -> torch.device:
    if requested == "cpu":
        return torch.device("cpu")
    if requested in ("cuda", "gpu") or requested == "auto":
        if torch.cuda.is_available():
            return torch.device("cuda")
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return torch.device("mps")
    return torch.device("cpu")


@torch.no_grad()
def estimate_loss(model: GPTMini, ds: Dataset, args, device, iters: int = 20) -> dict[str, float]:
    model.eval()
    out = {}
    for split in ("train", "val"):
        losses = torch.zeros(iters)
        for k in range(iters):
            x, y = ds.get_batch(split, args.batch_size, args.context_len, device)
            _, loss = model(x, y)
            losses[k] = loss.item()
        out[split] = losses.mean().item()
    model.train()
    return out


def save_checkpoint(path: Path, model: GPTMini, cfg: GPTConfig, step: int, val_loss: float | None) -> None:
    torch.save(
        {
            "model": model.state_dict(),
            "config": asdict(cfg),
            "tokenizer": "tokenizer.json",
            "step": step,
            "val_loss": val_loss,
        },
        path,
    )


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="biblelm.train")
    ap.add_argument("--corpus", required=True, type=Path)
    ap.add_argument("--run-dir", required=True, type=Path)
    ap.add_argument("--tokenizer", default="char", choices=["char", "bpe"])
    ap.add_argument("--d-model", type=int, default=256)
    ap.add_argument("--n-layers", type=int, default=4)
    ap.add_argument("--n-heads", type=int, default=4)
    ap.add_argument("--context-len", type=int, default=256)
    ap.add_argument("--batch-size", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--epochs", type=int, default=10)
    ap.add_argument("--eval-interval", type=int, default=200)
    ap.add_argument("--dropout", type=float, default=0.0)
    ap.add_argument("--val-split", type=float, default=0.1)
    ap.add_argument("--seed", type=int, default=1337)
    ap.add_argument(
        "--metric-hz",
        type=float,
        default=20.0,
        help="max metric updates per second (chart/number refresh rate)",
    )
    ap.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda", "gpu"])
    ap.add_argument("--protocol", action="store_true", help="(events always go to stdout)")
    args = ap.parse_args(argv)

    try:
        return _run(args)
    except Exception as exc:  # noqa: BLE001 — report any failure as an event
        protocol.error(str(exc))
        return 1


def _run(args) -> int:
    _install_signal_handlers()
    torch.manual_seed(args.seed)
    device = pick_device(args.device)
    args.run_dir.mkdir(parents=True, exist_ok=True)

    # ── data + tokenizer ────────────────────────────────────────────────
    protocol.status("tokenize", "Building tokenizer and encoding corpus")
    text = args.corpus.read_text(encoding="utf-8")
    tokenizer = tok.build(args.tokenizer, text)
    tokenizer.save(args.run_dir / "tokenizer.json")
    ids = torch.tensor(tokenizer.encode(text), dtype=torch.long)
    ds = Dataset(ids, val_split=args.val_split)

    # ── model ───────────────────────────────────────────────────────────
    cfg = GPTConfig(
        vocab_size=tokenizer.vocab_size,
        context_len=args.context_len,
        d_model=args.d_model,
        n_layers=args.n_layers,
        n_heads=args.n_heads,
        dropout=args.dropout,
    )
    model = GPTMini(cfg).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)

    steps_per_epoch = ds.steps_per_epoch(args.batch_size, args.context_len)
    total_steps = max(1, args.epochs * steps_per_epoch)
    # Emit on a wall-clock cadence (decoupled from step speed) so the chart and
    # numbers refresh smoothly regardless of how fast steps run.
    min_emit_dt = 1.0 / max(args.metric_hz, 0.5)

    protocol.status(
        "start",
        f"Training on {device.type}",
        device=device.type,
        vocab_size=tokenizer.vocab_size,
        params=model.num_params(),
        total_steps=total_steps,
        steps_per_epoch=steps_per_epoch,
        tokens=len(ids),
    )

    metrics_file = (args.run_dir / "metrics.jsonl").open("w", encoding="utf-8")
    best_val = float("inf")
    recent_losses: list[float] = []
    window_tokens = 0
    window_start = time.time()
    last_emit = 0.0
    tps_ema: float | None = None

    model.train()
    for step in range(1, total_steps + 1):
        x, y = ds.get_batch("train", args.batch_size, args.context_len, device)
        _, loss = model(x, y)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()

        recent_losses.append(loss.item())
        window_tokens += args.batch_size * args.context_len

        now = time.time()
        is_eval = step % args.eval_interval == 0 or step == total_steps
        if (now - last_emit) >= min_emit_dt or is_eval or step == 1:
            last_emit = now
            epoch = min(args.epochs, (step - 1) // steps_per_epoch + 1)
            train_loss = sum(recent_losses) / len(recent_losses)
            recent_losses.clear()
            elapsed = max(now - window_start, 1e-6)
            tps_now = window_tokens / elapsed
            # Smooth throughput so the number moves fluidly instead of jittering.
            tps_ema = tps_now if tps_ema is None else 0.7 * tps_ema + 0.3 * tps_now
            tps = tps_ema
            window_tokens = 0
            window_start = now

            val_loss = None
            if is_eval:
                est = estimate_loss(model, ds, args, device)
                val_loss = est["val"]
                if val_loss < best_val:
                    best_val = val_loss
                    save_checkpoint(args.run_dir / "ckpt.pt", model, cfg, step, val_loss)

            protocol.metric(step, epoch, train_loss, val_loss, tps)
            metrics_file.write(
                json.dumps(
                    {"step": step, "epoch": epoch, "train_loss": train_loss,
                     "val_loss": val_loss, "tokens_per_sec": tps}
                )
                + "\n"
            )
            metrics_file.flush()

        if _STOP:
            protocol.status("stopping", "Stopped by request")
            break

    save_checkpoint(args.run_dir / "last.pt", model, cfg, step, best_val if best_val != float("inf") else None)
    metrics_file.close()
    protocol.done(
        checkpoint=str(args.run_dir / "ckpt.pt"),
        best_val_loss=(best_val if best_val != float("inf") else None),
        steps=step,
        stopped=_STOP,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

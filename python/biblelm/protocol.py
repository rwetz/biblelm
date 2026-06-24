"""Protocol — one JSON object per line on stdout, human logs on stderr.

This is the contract between the Python ML processes and the Rust backend.
The Rust side reads stdout line by line, parses each as JSON, and dispatches on
the ``type`` field; anything it does not recognise it ignores. Human-readable
progress goes to stderr so it never pollutes the machine stream.

Event types emitted here:

    {"type":"status",  "phase":"tokenize", "message":"...", ...}
    {"type":"progress","bytes":123, "total":456}                # downloads
    {"type":"metric",  "step":100, "epoch":1, "train_loss":2.4,
                        "val_loss":1.9, "tokens_per_sec":12000}
    {"type":"token",   "token":"a"}                             # generation
    {"type":"done",    ...}
    {"type":"error",   "message":"..."}

Keep this module dependency-free (stdlib only) so it imports instantly even
before torch is available.
"""

from __future__ import annotations

import json
import sys
from typing import Any


def emit(event: dict[str, Any]) -> None:
    """Write one compact JSON line to stdout and flush immediately."""
    line = json.dumps(event, separators=(",", ":"), ensure_ascii=False)
    sys.stdout.write(line + "\n")
    sys.stdout.flush()


def status(phase: str, message: str = "", **extra: Any) -> None:
    emit({"type": "status", "phase": phase, "message": message, **extra})


def progress(done_bytes: int, total_bytes: int) -> None:
    emit({"type": "progress", "bytes": done_bytes, "total": total_bytes})


def metric(
    step: int,
    epoch: int,
    train_loss: float,
    val_loss: float | None = None,
    tokens_per_sec: float = 0.0,
    **extra: Any,
) -> None:
    emit(
        {
            "type": "metric",
            "step": step,
            "epoch": epoch,
            "train_loss": train_loss,
            "val_loss": val_loss,
            "tokens_per_sec": tokens_per_sec,
            **extra,
        }
    )


def token(text: str) -> None:
    emit({"type": "token", "token": text})


def done(**extra: Any) -> None:
    emit({"type": "done", **extra})


def error(message: str) -> None:
    emit({"type": "error", "message": message})


def log(*args: Any) -> None:
    """Human-readable line to stderr (never parsed by the backend)."""
    print(*args, file=sys.stderr, flush=True)

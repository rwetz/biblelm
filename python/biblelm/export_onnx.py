"""Export a trained checkpoint to ONNX.

Inference for BibleLM runs through `generate.py` (pure PyTorch), so ONNX is not
on the critical path — but the Export view exists and ONNX is a useful, portable
artifact (it loads in onnxruntime, the browser via onnxruntime-web, etc.). This
traces the model at the full context length with dynamic batch/sequence axes.

    python -m biblelm.export_onnx --run-dir <runs>/<id> --out model.onnx
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import torch

from . import protocol
from .model import GPTConfig, GPTMini


class _LogitsOnly(torch.nn.Module):
    """Wrap GPTMini so the ONNX graph has a single tensor output (logits)."""

    def __init__(self, model: GPTMini):
        super().__init__()
        self.model = model

    def forward(self, idx: torch.Tensor) -> torch.Tensor:
        logits, _ = self.model(idx)
        return logits


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="biblelm.export_onnx")
    ap.add_argument("--run-dir", type=Path, default=Path("."))
    ap.add_argument("--checkpoint", type=Path, default=None)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--opset", type=int, default=17)
    args = ap.parse_args(argv)

    try:
        ckpt_path = args.checkpoint or (args.run_dir / "ckpt.pt")
        if not ckpt_path.exists():
            raise FileNotFoundError(f"no checkpoint at {ckpt_path}")

        protocol.status("load", "Loading checkpoint")
        ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        cfg = GPTConfig(**ckpt["config"])
        model = GPTMini(cfg)
        model.load_state_dict(ckpt["model"])
        model.eval()

        wrapper = _LogitsOnly(model)
        dummy = torch.zeros((1, cfg.context_len), dtype=torch.long)

        args.out.parent.mkdir(parents=True, exist_ok=True)
        protocol.status("export", f"Tracing to ONNX (opset {args.opset})")
        torch.onnx.export(
            wrapper,
            dummy,
            str(args.out),
            input_names=["idx"],
            output_names=["logits"],
            dynamic_axes={"idx": {0: "batch", 1: "seq"}, "logits": {0: "batch", 1: "seq"}},
            opset_version=args.opset,
        )

        protocol.status("validate", "Validating ONNX graph")
        import onnx  # local import so the export path stays torch-only until needed

        onnx.checker.check_model(str(args.out))

        size = args.out.stat().st_size
        protocol.status("validate", "ONNX valid", size_bytes=size)
        protocol.done(path=str(args.out), size_bytes=size)
        return 0
    except Exception as exc:  # noqa: BLE001
        protocol.error(str(exc))
        return 1


if __name__ == "__main__":
    sys.exit(main())

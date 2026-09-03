"""Inspect and import model files — the backend for the app's drop zone.

Someone who doesn't want to train can download the released model from GitHub
and drop the files straight onto the app. This module validates each file
*before* it is installed into the run directory, so a wrong or corrupt file
fails loudly here instead of surfacing as a confusing error at generation time.

What it accepts:

    ckpt.pt / *.pt / *.pth   a trained checkpoint   -> <run-dir>/ckpt.pt
    model.onnx / *.onnx      an exported ONNX graph -> <run-dir>/model.onnx
    tokenizer.json           a char vocabulary      -> <run-dir>/tokenizer.json

Checkpoints written by `train.py` embed their vocabulary (`tokenizer_stoi`), so
dropping a single .pt is enough — the tokenizer is unpacked from it. Older
checkpoints only *reference* tokenizer.json, and for those the file has to be
dropped alongside; the report says so rather than failing later.

Checkpoints are read with ``weights_only=True``. A .pt is a pickle, and these
files come from the internet: the restricted loader refuses to execute code
during unpickling. Our own payload is tensors, dicts and primitives, so it
loads cleanly under that restriction.

CLI:
    python -m biblelm.model_io inspect --run-dir <runs>/current
    python -m biblelm.model_io import  --run-dir <runs>/current --file <path> [--file <path> ...]
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

from . import protocol

CHECKPOINT_SUFFIXES = {".pt", ".pth", ".ckpt"}
ONNX_SUFFIXES = {".onnx"}
TOKENIZER_SUFFIXES = {".json"}

# Suffixes the drop zone will even attempt, for the UI's "unsupported file" copy.
SUPPORTED_SUFFIXES = sorted(CHECKPOINT_SUFFIXES | ONNX_SUFFIXES | TOKENIZER_SUFFIXES)


def kind_of(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in CHECKPOINT_SUFFIXES:
        return "checkpoint"
    if suffix in ONNX_SUFFIXES:
        return "onnx"
    if suffix in TOKENIZER_SUFFIXES:
        return "tokenizer"
    raise ValueError(
        f"{path.name}: unsupported file type. Drop a .pt checkpoint, a .onnx "
        "graph, or a tokenizer.json."
    )


# -- validation ----------------------------------------------------------


def read_checkpoint(path: Path) -> dict:
    """Load a checkpoint safely and confirm the weights match its own config."""
    import torch

    from .model import GPTConfig, GPTMini

    try:
        ckpt = torch.load(path, map_location="cpu", weights_only=True)
    except Exception as exc:  # noqa: BLE001 — any load failure means a bad file
        raise ValueError(
            f"{path.name} isn't a checkpoint this app can read ({exc}). "
            "Expected a .pt saved by BibleLM training."
        ) from exc

    if not isinstance(ckpt, dict) or "model" not in ckpt or "config" not in ckpt:
        raise ValueError(
            f"{path.name} is a .pt file but not a BibleLM checkpoint - it has no "
            "'model'/'config' entries."
        )

    try:
        cfg = GPTConfig(**ckpt["config"])
    except TypeError as exc:
        raise ValueError(f"{path.name}: unreadable model config ({exc})") from exc

    # Instantiating and strict-loading proves the weights really fit the config,
    # so a truncated or mismatched file is caught now rather than at generation.
    model = GPTMini(cfg)
    try:
        model.load_state_dict(ckpt["model"])
    except RuntimeError as exc:
        raise ValueError(
            f"{path.name}: the weights don't match the config saved beside them ({exc})"
        ) from exc

    return {
        "config": ckpt["config"],
        "params": model.num_params(),
        "step": ckpt.get("step"),
        "valLoss": ckpt.get("val_loss"),
        "stoi": ckpt.get("tokenizer_stoi"),
    }


def read_onnx(path: Path) -> dict:
    """Validate an ONNX graph. Falls back to a header check if onnx is absent."""
    try:
        import onnx
    except ImportError:
        header = path.read_bytes()[:16]
        # ONNX is protobuf; a real graph starts with the ir_version field (0x08).
        if not header.startswith(b"\x08"):
            raise ValueError(f"{path.name} doesn't look like an ONNX graph") from None
        return {
            "validated": False,
            "note": "onnx package not installed - graph structure not checked",
        }

    try:
        model = onnx.load(str(path))
        onnx.checker.check_model(model)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"{path.name} is not a valid ONNX graph ({exc})") from exc

    return {
        "validated": True,
        "opset": max((imp.version for imp in model.opset_import), default=0),
        "inputs": [i.name for i in model.graph.input],
        "outputs": [o.name for o in model.graph.output],
    }


def read_tokenizer(path: Path) -> dict:
    from .tokenizer import CharTokenizer

    try:
        tokenizer = CharTokenizer.load(path)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"{path.name} isn't a BibleLM tokenizer ({exc})") from exc
    return {"vocabSize": tokenizer.vocab_size}


# -- install -------------------------------------------------------------


def _install(src: Path, dest: Path) -> None:
    """Copy via a temp file so an interrupted copy can't leave a half-written
    checkpoint in place of a working one."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if src.resolve() == dest.resolve():
        return
    tmp = dest.with_suffix(dest.suffix + ".importing")
    shutil.copyfile(src, tmp)
    tmp.replace(dest)


def import_file(path: Path, run_dir: Path) -> dict:
    """Validate one dropped file and install it. Returns a UI-facing summary."""
    if not path.exists():
        raise ValueError(f"{path} doesn't exist")
    if not path.is_file():
        raise ValueError(f"{path.name} is a folder - drop the model files themselves")

    kind = kind_of(path)
    protocol.status("validate", f"Checking {path.name}", file=path.name, kind=kind)

    if kind == "checkpoint":
        info = read_checkpoint(path)
        _install(path, run_dir / "ckpt.pt")
        stoi = info.pop("stoi", None)
        tokenizer_path = run_dir / "tokenizer.json"
        if stoi:
            # Self-contained checkpoint: unpack its vocabulary so a lone .pt works.
            tokenizer_path.write_text(
                json.dumps(
                    {"type": "char", "vocab_size": len(stoi), "stoi": stoi},
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
            info["tokenizer"] = "embedded"
        elif tokenizer_path.exists():
            info["tokenizer"] = "existing"
        else:
            info["tokenizer"] = "missing"
            info["warning"] = (
                "This checkpoint doesn't carry its vocabulary, and there's no "
                "tokenizer.json here yet. Drop the tokenizer.json that came with "
                "it, or generation will fail."
            )
        info["installedAs"] = str(run_dir / "ckpt.pt")

    elif kind == "onnx":
        info = read_onnx(path)
        _install(path, run_dir / "model.onnx")
        info["installedAs"] = str(run_dir / "model.onnx")

    else:
        info = read_tokenizer(path)
        _install(path, run_dir / "tokenizer.json")
        info["installedAs"] = str(run_dir / "tokenizer.json")

    return {"file": path.name, "kind": kind, "sizeBytes": path.stat().st_size, **info}


# -- status --------------------------------------------------------------


def status(run_dir: Path) -> dict:
    """What's currently installed in the run directory, for the Model card."""
    ckpt = run_dir / "ckpt.pt"
    onnx_path = run_dir / "model.onnx"
    tokenizer_path = run_dir / "tokenizer.json"

    out: dict = {
        "runDir": str(run_dir),
        "hasCheckpoint": ckpt.exists(),
        "hasOnnx": onnx_path.exists(),
        "hasTokenizer": tokenizer_path.exists(),
    }
    if ckpt.exists():
        out["checkpointBytes"] = ckpt.stat().st_size
        try:
            info = read_checkpoint(ckpt)
            info.pop("stoi", None)
            out.update(
                {
                    "config": info["config"],
                    "params": info["params"],
                    "step": info["step"],
                    "valLoss": info["valLoss"],
                }
            )
        except ValueError as exc:
            out["checkpointError"] = str(exc)
    if onnx_path.exists():
        out["onnxBytes"] = onnx_path.stat().st_size
    if tokenizer_path.exists():
        try:
            out["vocabSize"] = read_tokenizer(tokenizer_path)["vocabSize"]
        except ValueError:
            pass
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="biblelm.model_io")
    sub = ap.add_subparsers(dest="cmd", required=True)

    insp = sub.add_parser("inspect")
    insp.add_argument("--run-dir", required=True, type=Path)

    imp = sub.add_parser("import")
    imp.add_argument("--run-dir", required=True, type=Path)
    imp.add_argument("--file", required=True, type=Path, action="append", dest="files")

    args = ap.parse_args(argv)
    try:
        if args.cmd == "inspect":
            protocol.emit({"type": "model", **status(args.run_dir)})
            return 0

        args.run_dir.mkdir(parents=True, exist_ok=True)
        # Checkpoints first: a .pt can supply the tokenizer, and an explicitly
        # dropped tokenizer.json should then win over the embedded one.
        ordered = sorted(args.files, key=lambda p: p.suffix.lower() == ".json")
        imported = [import_file(p, args.run_dir) for p in ordered]
        protocol.emit({"type": "imported", "imported": imported, **status(args.run_dir)})
        protocol.done(count=len(imported))
        return 0
    except Exception as exc:  # noqa: BLE001 — every failure becomes an event
        protocol.error(str(exc))
        return 1


if __name__ == "__main__":
    sys.exit(main())

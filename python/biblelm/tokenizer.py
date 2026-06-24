"""Tokenizers for BibleLM.

The default is a character-level tokenizer: every distinct character in the
corpus becomes a token. For KJV English that yields a vocabulary of ~80-100
tokens — tiny, lossless, and trivial to reason about, which is exactly what you
want when the goal is to *see* a transformer learn rather than to ship a product.

A BPE tokenizer is stubbed for later (the Training view already exposes the
toggle); it raises until implemented so the failure is loud, not silent.
"""

from __future__ import annotations

import json
from pathlib import Path


class CharTokenizer:
    """Lossless character-level tokenizer built from a corpus string."""

    def __init__(self, stoi: dict[str, int]):
        self.stoi = stoi
        self.itos = {i: ch for ch, i in stoi.items()}

    @property
    def vocab_size(self) -> int:
        return len(self.stoi)

    @classmethod
    def from_text(cls, text: str) -> "CharTokenizer":
        chars = sorted(set(text))
        return cls({ch: i for i, ch in enumerate(chars)})

    def encode(self, text: str) -> list[int]:
        # Unknown chars (e.g. in a generation prompt the model never saw) are
        # skipped rather than crashing the run.
        return [self.stoi[ch] for ch in text if ch in self.stoi]

    def decode(self, ids: list[int]) -> str:
        return "".join(self.itos[i] for i in ids if i in self.itos)

    def save(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"type": "char", "vocab_size": self.vocab_size, "stoi": self.stoi}
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: str | Path) -> "CharTokenizer":
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
        if payload.get("type") != "char":
            raise ValueError(f"not a char tokenizer: {path}")
        return cls(payload["stoi"])


def build(tokenizer_type: str, text: str):
    """Factory used by train.py."""
    if tokenizer_type == "char":
        return CharTokenizer.from_text(text)
    if tokenizer_type == "bpe":
        raise NotImplementedError(
            "BPE tokenizer is not implemented yet — use tokenizer_type='char'."
        )
    raise ValueError(f"unknown tokenizer_type: {tokenizer_type!r}")

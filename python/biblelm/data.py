"""Batching over a tokenized corpus.

The whole corpus is held as a single 1-D tensor of token ids. A batch is a set
of random `context_len`-long windows; the target is the same window shifted by
one (next-token prediction). With a ~4MB corpus this fits comfortably in memory,
so there is no need for memory-mapping.
"""

from __future__ import annotations

import torch


class Dataset:
    def __init__(self, ids: torch.Tensor, val_split: float = 0.1):
        n_val = int(len(ids) * val_split)
        self.train = ids[: len(ids) - n_val]
        self.val = ids[len(ids) - n_val :]

    def split(self, name: str) -> torch.Tensor:
        return self.train if name == "train" else self.val

    def get_batch(
        self, name: str, batch_size: int, context_len: int, device: torch.device
    ) -> tuple[torch.Tensor, torch.Tensor]:
        data = self.split(name)
        # Highest valid start index so x and the shifted y both stay in range.
        hi = len(data) - context_len - 1
        if hi < 1:
            raise ValueError(
                f"{name} split too small ({len(data)} tokens) for context_len {context_len}"
            )
        ix = torch.randint(0, hi, (batch_size,))
        x = torch.stack([data[i : i + context_len] for i in ix])
        y = torch.stack([data[i + 1 : i + 1 + context_len] for i in ix])
        if device.type == "cuda":
            # Async H2D copy for pinned throughput.
            x = x.pin_memory().to(device, non_blocking=True)
            y = y.pin_memory().to(device, non_blocking=True)
        else:
            x, y = x.to(device), y.to(device)
        return x, y

    def steps_per_epoch(self, batch_size: int, context_len: int) -> int:
        """One 'epoch' = one pass-worth of windows over the training split."""
        return max(1, len(self.train) // (batch_size * context_len))

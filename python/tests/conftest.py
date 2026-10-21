"""Shared fixtures. The full-KJV tests need `data/kjv.txt` (git-ignored, fetched
by `python -m biblelm.corpus download --version kjv --data-dir data`). Locally
they skip without it; CI sets BIBLELM_REQUIRE_KJV=1 so a missing corpus fails.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from biblelm import search

KJV_PATH = Path(__file__).resolve().parents[2] / "data" / "kjv.txt"


@pytest.fixture(scope="session")
def kjv_verses() -> list[dict]:
    if not KJV_PATH.exists():
        if os.environ.get("BIBLELM_REQUIRE_KJV"):
            pytest.fail(f"{KJV_PATH} is missing and BIBLELM_REQUIRE_KJV is set")
        pytest.skip("data/kjv.txt not downloaded")
    return search.parse_kjv(KJV_PATH)

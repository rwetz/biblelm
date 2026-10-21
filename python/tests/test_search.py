from pathlib import Path

import pytest

from biblelm import search

# A miniature of the Gutenberg layout: a table of contents that repeats the
# book headers, then the body. The parser must skip the TOC by structure.
MINI = """The Old Testament of the King James Version of the Bible
The First Book of Moses: Called Genesis
The Second Book of Moses: Called Exodus

The First Book of Moses: Called Genesis


1:1 In the beginning God created the heaven and the earth.

1:2 And the earth was without form, and void; and darkness was upon
the face of the deep. 1:3 And God said, Let there be light: and there was light.

The Second Book of Moses: Called Exodus


1:1 Now these are the names of the children of Israel.
"""


@pytest.fixture
def mini(tmp_path: Path) -> list[dict]:
    p = tmp_path / "mini.txt"
    p.write_text(MINI, encoding="utf-8")
    return search.parse_kjv(p)


def test_mini_skips_toc_and_parses_body(mini):
    assert [v["ref"] for v in mini] == ["Genesis 1:1", "Genesis 1:2", "Genesis 1:3", "Exodus 1:1"]


def test_mini_joins_wrapped_lines(mini):
    assert mini[1]["text"] == "And the earth was without form, and void; and darkness was upon the face of the deep."


def test_book_aliases():
    assert search.resolve_book("gen") == "Genesis"
    assert search.resolve_book("1 Cor") == "1 Corinthians"
    assert search.resolve_book("nope") is None


# ── full KJV (skips unless data/kjv.txt exists) ──────────────────────────


def test_kjv_counts(kjv_verses):
    assert len(kjv_verses) == 31_102
    assert len({v["book"] for v in kjv_verses}) == 66
    assert len({(v["book"], v["chapter"]) for v in kjv_verses}) == 1_189


def test_kjv_starts_at_genesis(kjv_verses):
    first = kjv_verses[0]
    assert first["ref"] == "Genesis 1:1"
    assert first["text"] == "In the beginning God created the heaven and the earth."


def test_kjv_ends_at_revelation(kjv_verses):
    assert kjv_verses[-1]["ref"] == "Revelation 22:21"


@pytest.mark.parametrize(
    ("query", "kind"),
    [
        ("John 3:16", "verse"),
        ("Gen 1:1", "verse"),
        ("how many verses contain love", "count_verses"),
        ("how many times does grace appear", "word_frequency"),
        ("how many verses in Psalms", "book_verse_count"),
        ("how many chapters in Isaiah", "book_chapter_count"),
        ("longest verse", "verse"),
        ("shortest verse", "verse"),
        ("find fishers of men", "search"),
        ("how many books", "total_books"),
    ],
)
def test_ask_examples(kjv_verses, query, kind):
    assert search.search(kjv_verses, query)["kind"] == kind


def test_ask_answers(kjv_verses):
    assert search.search(kjv_verses, "how many books")["count"] == 66
    assert search.search(kjv_verses, "how many verses in Psalms")["count"] == 2_461
    assert search.search(kjv_verses, "shortest verse")["verse"]["ref"] == "John 11:35"
    assert search.search(kjv_verses, "Rev 99:1")["kind"] == "not_found"

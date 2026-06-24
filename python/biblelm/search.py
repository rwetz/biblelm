"""
Deterministic KJV Bible exact-search engine.

CLI:
    python -m biblelm.search --corpus <path/to/kjv.txt> --query <query>

Prints one JSON line (no streaming — result is ready in < 1 s).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# ── book-name tables ─────────────────────────────────────────────────────

# Map from Gutenberg header text → canonical short name
_HEADERS: dict[str, str] = {
    "The First Book of Moses: Called Genesis": "Genesis",
    "The Second Book of Moses: Called Exodus": "Exodus",
    "The Third Book of Moses: Called Leviticus": "Leviticus",
    "The Fourth Book of Moses: Called Numbers": "Numbers",
    "The Fifth Book of Moses: Called Deuteronomy": "Deuteronomy",
    "The Book of Joshua": "Joshua",
    "The Book of Judges": "Judges",
    "The Book of Ruth": "Ruth",
    "The First Book of Samuel": "1 Samuel",
    "The Second Book of Samuel": "2 Samuel",
    "The First Book of the Kings": "1 Kings",
    "The Second Book of the Kings": "2 Kings",
    "The First Book of the Chronicles": "1 Chronicles",
    "The Second Book of the Chronicles": "2 Chronicles",
    "Ezra": "Ezra",
    "The Book of Nehemiah": "Nehemiah",
    "The Book of Esther": "Esther",
    "The Book of Job": "Job",
    "The Book of Psalms": "Psalms",
    "The Proverbs": "Proverbs",
    "Ecclesiastes": "Ecclesiastes",
    "The Song of Solomon": "Song of Solomon",
    "The Book of the Prophet Isaiah": "Isaiah",
    "The Book of the Prophet Jeremiah": "Jeremiah",
    "The Lamentations of Jeremiah": "Lamentations",
    "The Book of the Prophet Ezekiel": "Ezekiel",
    "The Book of Daniel": "Daniel",
    "Hosea": "Hosea",
    "Joel": "Joel",
    "Amos": "Amos",
    "Obadiah": "Obadiah",
    "Jonah": "Jonah",
    "Micah": "Micah",
    "Nahum": "Nahum",
    "Habakkuk": "Habakkuk",
    "Zephaniah": "Zephaniah",
    "Haggai": "Haggai",
    "Zechariah": "Zechariah",
    "Malachi": "Malachi",
    "The Gospel According to Saint Matthew": "Matthew",
    "The Gospel According to Saint Mark": "Mark",
    "The Gospel According to Saint Luke": "Luke",
    "The Gospel According to Saint John": "John",
    "The Acts of the Apostles": "Acts",
    "The Epistle of Paul the Apostle to the Romans": "Romans",
    "The First Epistle of Paul the Apostle to the Corinthians": "1 Corinthians",
    "The Second Epistle of Paul the Apostle to the Corinthians": "2 Corinthians",
    "The Epistle of Paul the Apostle to the Galatians": "Galatians",
    "The Epistle of Paul the Apostle to the Ephesians": "Ephesians",
    "The Epistle of Paul the Apostle to the Philippians": "Philippians",
    "The Epistle of Paul the Apostle to the Colossians": "Colossians",
    "The First Epistle of Paul the Apostle to the Thessalonians": "1 Thessalonians",
    "The Second Epistle of Paul the Apostle to the Thessalonians": "2 Thessalonians",
    "The First Epistle of Paul the Apostle to Timothy": "1 Timothy",
    "The Second Epistle of Paul the Apostle to Timothy": "2 Timothy",
    "The Epistle of Paul the Apostle to Titus": "Titus",
    "The Epistle of Paul the Apostle to Philemon": "Philemon",
    "The Epistle of Paul the Apostle to the Hebrews": "Hebrews",
    "The General Epistle of James": "James",
    "The First Epistle General of Peter": "1 Peter",
    "The Second General Epistle of Peter": "2 Peter",
    "The First Epistle General of John": "1 John",
    "The Second Epistle General of John": "2 John",
    "The Third Epistle General of John": "3 John",
    "The General Epistle of Jude": "Jude",
    "The Revelation of Saint John the Divine": "Revelation",
}

# User-facing aliases → canonical name
_ALIASES: dict[str, str] = {
    "genesis": "Genesis", "gen": "Genesis",
    "exodus": "Exodus", "ex": "Exodus", "exo": "Exodus",
    "leviticus": "Leviticus", "lev": "Leviticus",
    "numbers": "Numbers", "num": "Numbers",
    "deuteronomy": "Deuteronomy", "deut": "Deuteronomy", "dt": "Deuteronomy",
    "joshua": "Joshua", "josh": "Joshua",
    "judges": "Judges", "judg": "Judges",
    "ruth": "Ruth",
    "1 samuel": "1 Samuel", "1samuel": "1 Samuel", "1 sam": "1 Samuel", "1sam": "1 Samuel",
    "2 samuel": "2 Samuel", "2samuel": "2 Samuel", "2 sam": "2 Samuel", "2sam": "2 Samuel",
    "1 kings": "1 Kings", "1kings": "1 Kings", "1 kgs": "1 Kings", "1kgs": "1 Kings",
    "2 kings": "2 Kings", "2kings": "2 Kings", "2 kgs": "2 Kings", "2kgs": "2 Kings",
    "1 chronicles": "1 Chronicles", "1chronicles": "1 Chronicles",
    "1 chron": "1 Chronicles", "1chron": "1 Chronicles",
    "2 chronicles": "2 Chronicles", "2chronicles": "2 Chronicles",
    "2 chron": "2 Chronicles", "2chron": "2 Chronicles",
    "ezra": "Ezra",
    "nehemiah": "Nehemiah", "neh": "Nehemiah",
    "esther": "Esther", "est": "Esther",
    "job": "Job",
    "psalms": "Psalms", "psalm": "Psalms", "ps": "Psalms", "psa": "Psalms",
    "proverbs": "Proverbs", "prov": "Proverbs", "pro": "Proverbs",
    "ecclesiastes": "Ecclesiastes", "eccl": "Ecclesiastes", "eccles": "Ecclesiastes",
    "song of solomon": "Song of Solomon", "song": "Song of Solomon",
    "sos": "Song of Solomon", "ss": "Song of Solomon",
    "isaiah": "Isaiah", "isa": "Isaiah",
    "jeremiah": "Jeremiah", "jer": "Jeremiah",
    "lamentations": "Lamentations", "lam": "Lamentations",
    "ezekiel": "Ezekiel", "ezek": "Ezekiel", "eze": "Ezekiel",
    "daniel": "Daniel", "dan": "Daniel",
    "hosea": "Hosea", "hos": "Hosea",
    "joel": "Joel",
    "amos": "Amos",
    "obadiah": "Obadiah", "obad": "Obadiah",
    "jonah": "Jonah", "jon": "Jonah",
    "micah": "Micah", "mic": "Micah",
    "nahum": "Nahum", "nah": "Nahum",
    "habakkuk": "Habakkuk", "hab": "Habakkuk",
    "zephaniah": "Zephaniah", "zeph": "Zephaniah", "zep": "Zephaniah",
    "haggai": "Haggai", "hag": "Haggai",
    "zechariah": "Zechariah", "zech": "Zechariah", "zec": "Zechariah",
    "malachi": "Malachi", "mal": "Malachi",
    "matthew": "Matthew", "matt": "Matthew", "mat": "Matthew", "mt": "Matthew",
    "mark": "Mark", "mrk": "Mark",
    "luke": "Luke", "luk": "Luke",
    "john": "John", "jn": "John",
    "acts": "Acts",
    "romans": "Romans", "rom": "Romans",
    "1 corinthians": "1 Corinthians", "1corinthians": "1 Corinthians",
    "1 cor": "1 Corinthians", "1cor": "1 Corinthians",
    "2 corinthians": "2 Corinthians", "2corinthians": "2 Corinthians",
    "2 cor": "2 Corinthians", "2cor": "2 Corinthians",
    "galatians": "Galatians", "gal": "Galatians",
    "ephesians": "Ephesians", "eph": "Ephesians",
    "philippians": "Philippians", "phil": "Philippians", "php": "Philippians",
    "colossians": "Colossians", "col": "Colossians",
    "1 thessalonians": "1 Thessalonians", "1thessalonians": "1 Thessalonians",
    "1 thess": "1 Thessalonians", "1thess": "1 Thessalonians",
    "2 thessalonians": "2 Thessalonians", "2thessalonians": "2 Thessalonians",
    "2 thess": "2 Thessalonians", "2thess": "2 Thessalonians",
    "1 timothy": "1 Timothy", "1timothy": "1 Timothy",
    "1 tim": "1 Timothy", "1tim": "1 Timothy",
    "2 timothy": "2 Timothy", "2timothy": "2 Timothy",
    "2 tim": "2 Timothy", "2tim": "2 Timothy",
    "titus": "Titus", "tit": "Titus",
    "philemon": "Philemon", "phlm": "Philemon",
    "hebrews": "Hebrews", "heb": "Hebrews",
    "james": "James", "jas": "James",
    "1 peter": "1 Peter", "1peter": "1 Peter", "1 pet": "1 Peter", "1pet": "1 Peter",
    "2 peter": "2 Peter", "2peter": "2 Peter", "2 pet": "2 Peter", "2pet": "2 Peter",
    "1 john": "1 John", "1john": "1 John", "1 jn": "1 John",
    "2 john": "2 John", "2john": "2 John", "2 jn": "2 John",
    "3 john": "3 John", "3john": "3 John", "3 jn": "3 John",
    "jude": "Jude",
    "revelation": "Revelation", "rev": "Revelation",
}


def resolve_book(name: str) -> str | None:
    return _ALIASES.get(name.strip().lower())


# ── parser ───────────────────────────────────────────────────────────────

_VERSE_SPLIT_RE = re.compile(r"(\d+:\d+)(?= |$)")

Verse = dict  # {book, chapter, verse, text, ref}


def parse_kjv(corpus_path: Path) -> list[Verse]:
    text = corpus_path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    verses: list[Verse] = []
    current_book: str | None = None
    current_ref: str | None = None  # "chapter:verse"
    text_parts: list[str] = []
    # The TOC occupies lines 2–136 (0-indexed). Body Genesis starts at line 156.
    # We ignore header matches until we're past the TOC so body headers drive
    # book-detection instead of the TOC copies.
    TOC_END = 140
    in_body = False
    skip_otherwise = False

    def flush() -> None:
        if current_book and current_ref and text_parts:
            ch_s, vs_s = current_ref.split(":", 1)
            full = " ".join(" ".join(text_parts).split())
            verses.append(
                {
                    "book": current_book,
                    "chapter": int(ch_s),
                    "verse": int(vs_s),
                    "text": full,
                    "ref": f"{current_book} {ch_s}:{vs_s}",
                }
            )

    for lineno, raw_line in enumerate(lines):
        line = raw_line.strip()

        # ── locate body start (skip TOC region) ──
        if not in_body:
            if lineno > TOC_END and line in _HEADERS:
                in_body = True
                current_book = _HEADERS[line]
            continue

        if not line:
            continue

        # ── "Otherwise Called:" sub-headers — skip the alternate name ──
        if line == "Otherwise Called:":
            skip_otherwise = True
            continue
        if skip_otherwise:
            skip_otherwise = False  # consume the alternate-name line
            continue

        # ── new book header ──
        if line in _HEADERS:
            flush()
            current_book = _HEADERS[line]
            current_ref = None
            text_parts = []
            continue

        # ── verse content — split on inline chapter:verse markers ──
        parts = _VERSE_SPLIT_RE.split(line)
        # parts = [pre_text, ref1, text1, ref2, text2, ...]

        if parts[0]:  # text before the first ref → continuation of current verse
            text_parts.append(parts[0])

        for j in range(1, len(parts), 2):
            ref = parts[j]
            after = (parts[j + 1] if j + 1 < len(parts) else "").lstrip()
            flush()
            current_ref = ref
            text_parts = [after] if after else []

    flush()
    return verses


# ── query engine ─────────────────────────────────────────────────────────

def _word_in(word: str, text: str) -> bool:
    return bool(re.search(r"\b" + re.escape(word) + r"\b", text, re.IGNORECASE))


def _word_count_in(word: str, text: str) -> int:
    return len(re.findall(r"\b" + re.escape(word) + r"\b", text, re.IGNORECASE))


def _verse_dict(v: Verse) -> dict:
    return {"ref": v["ref"], "book": v["book"], "chapter": v["chapter"],
            "verse": v["verse"], "text": v["text"]}


def search(verses: list[Verse], query: str) -> dict:
    q = query.strip()
    ql = q.lower()

    # ── 1. Reference lookup: "John 3:16", "1 Samuel 17:4", "Gen 1:1" ──
    m = re.match(r"^(.+?)\s+(\d+):(\d+)\s*$", q)
    if m:
        book = resolve_book(m.group(1))
        if book:
            ch, vs = int(m.group(2)), int(m.group(3))
            found = [v for v in verses if v["book"] == book and v["chapter"] == ch and v["verse"] == vs]
            if found:
                return {"kind": "verse", "verse": _verse_dict(found[0])}
            return {"kind": "not_found", "message": f"{book} {ch}:{vs} was not found in the KJV."}

    # ── 2. How many times does X appear ──
    m = re.search(
        r"how many times (?:does|is|do)\s+[\"']?(.+?)[\"']?\s+(?:appear|occur|mentioned|used|found)",
        ql,
    )
    if m:
        word = m.group(1).strip()
        count = sum(_word_count_in(word, v["text"]) for v in verses)
        return {"kind": "word_frequency", "word": word, "count": count}

    # ── 3. How many verses contain X ──
    m = re.search(
        r"how many verses (?:contain|mention|have|include|with|about)\s+(?:the (?:word|phrase)\s+)?[\"']?(.+?)[\"']?\s*$",
        ql,
    )
    if m:
        word = m.group(1).strip()
        matched = [v for v in verses if _word_in(word, v["text"])]
        return {
            "kind": "count_verses",
            "word": word,
            "count": len(matched),
            "sample": [_verse_dict(v) for v in matched[:5]],
        }

    # ── 4. How many verses in Book ──
    m = re.search(r"how many verses (?:in|of|are in|in the book of)\s+(.+)", ql)
    m = m or re.search(r"how many verses does (.+?) have", ql)
    if m:
        book = resolve_book(m.group(1).strip())
        if book:
            count = sum(1 for v in verses if v["book"] == book)
            return {"kind": "book_verse_count", "book": book, "count": count}

    # ── 5. How many chapters in Book ──
    m = re.search(r"how many chapters (?:in|of|are in|in the book of)\s+(.+)", ql)
    m = m or re.search(r"how many chapters does (.+?) have", ql)
    if m:
        book = resolve_book(m.group(1).strip())
        if book:
            chapters = len({v["chapter"] for v in verses if v["book"] == book})
            return {"kind": "book_chapter_count", "book": book, "count": chapters}

    # ── 6. Total stats ──
    if re.search(r"how many verses", ql):
        return {"kind": "total_verses", "count": len(verses)}
    if re.search(r"how many books", ql):
        books = list(dict.fromkeys(v["book"] for v in verses))
        return {"kind": "total_books", "count": len(books), "books": books}
    if re.search(r"how many chapters", ql):
        count = len({(v["book"], v["chapter"]) for v in verses})
        return {"kind": "total_chapters", "count": count}
    if re.search(r"how many words", ql):
        count = sum(len(v["text"].split()) for v in verses)
        return {"kind": "total_words", "count": count}

    # ── 7. Longest / shortest verse ──
    if "longest verse" in ql:
        v = max(verses, key=lambda x: len(x["text"]))
        return {"kind": "verse", "verse": _verse_dict(v), "label": "Longest verse in the KJV"}
    if "shortest verse" in ql:
        v = min(verses, key=lambda x: len(x["text"]))
        return {"kind": "verse", "verse": _verse_dict(v), "label": "Shortest verse in the KJV"}

    # ── 8. Explicit search / find phrases ──
    m = re.search(
        r"^(?:find|search|show(?:\s+me)?|verses?(?:\s+(?:containing|with|about|for))?)\s+"
        r"(?:about|containing|with|for|me|verses?\s+(?:containing|with|about))?\s*[\"']?(.+?)[\"']?\s*$",
        ql,
    )
    if m:
        word = m.group(1).strip()
        if word:
            matched = [v for v in verses if _word_in(word, v["text"])]
            return {
                "kind": "search",
                "word": word,
                "count": len(matched),
                "results": [_verse_dict(v) for v in matched[:12]],
            }

    # ── 9. Fallback: treat the whole query as a search term ──
    matched = [v for v in verses if _word_in(ql, v["text"])]
    if matched:
        return {
            "kind": "search",
            "word": ql,
            "count": len(matched),
            "results": [_verse_dict(v) for v in matched[:12]],
        }

    return {"kind": "no_results", "message": f'No results found for "{query}".'}


# ── CLI ──────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="KJV Bible search engine")
    parser.add_argument("--corpus", required=True, help="Path to kjv.txt")
    parser.add_argument("--query", required=True, help="Search query")
    args = parser.parse_args()

    corpus = Path(args.corpus)
    if not corpus.exists():
        print(json.dumps({"kind": "error", "message": f"Corpus not found: {corpus}"}), flush=True)
        sys.exit(1)

    try:
        verses = parse_kjv(corpus)
        result = search(verses, args.query)
    except Exception as exc:
        print(json.dumps({"kind": "error", "message": str(exc)}), flush=True)
        sys.exit(1)

    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()

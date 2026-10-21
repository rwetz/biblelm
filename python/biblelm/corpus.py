"""Corpus management — many Bible translations and languages.

Translations come from two places:
  * built-in **presets** (verified public-domain sources), and
  * a user **custom registry** at ``<data_dir>/custom_sources.json`` — anyone can
    add a version/language by pasting a plain-text URL, no code change needed.

`download` streams a source (reporting progress), strips Project Gutenberg
boilerplate when present, writes a cleaned `<id>.txt`, and writes a
`<id>.meta.json` of stats the Rust backend reads directly.

CLI:
    python -m biblelm.corpus list     --data-dir <dir>
    python -m biblelm.corpus add      --data-dir <dir> --id web --name "World English Bible" --language English --url <url>
    python -m biblelm.corpus remove   --data-dir <dir> --id web
    python -m biblelm.corpus preview  --data-dir <dir> --version kjv
    python -m biblelm.corpus download --version kjv --data-dir <dir>
"""

from __future__ import annotations

import argparse
from collections import Counter
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.request import Request, urlopen

from . import protocol


@dataclass(frozen=True)
class Source:
    id: str
    name: str
    language: str
    url: str | None
    license: str
    verified: bool = False
    note: str = ""


# Built-in, verified public-domain sources. Add more by dropping entries here or
# — at runtime — via `corpus add` (which writes to custom_sources.json).
PRESETS: dict[str, Source] = {
    "kjv": Source(
        id="kjv",
        name="King James Version",
        language="English",
        url="https://www.gutenberg.org/cache/epub/10/pg10.txt",
        license="Public domain · Project Gutenberg #10",
        verified=True,
    ),
}

# Project Gutenberg wraps the work between these markers. DOTALL because a long
# title can wrap the marker across two lines.
_PG_START = re.compile(
    r"\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", re.IGNORECASE | re.DOTALL
)
_PG_END = re.compile(
    r"\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", re.IGNORECASE | re.DOTALL
)

# A Gutenberg *ebook landing page* (https://www.gutenberg.org/ebooks/10) is the
# URL you get by copying your browser's address bar — the natural thing to
# paste. It returns HTML with status 200, so nothing errors: without the checks
# below that HTML is happily saved as a "corpus" and trained on as if it were
# scripture. Map the landing form to the plain-text file instead.
_PG_EBOOK_URL = re.compile(r"^https?://(?:www\.)?gutenberg\.org/ebooks/(\d+)/?$", re.IGNORECASE)


def normalize_url(url: str) -> str:
    """Rewrite a Gutenberg ebook landing URL to its plain-text file."""
    url = url.strip()
    m = _PG_EBOOK_URL.match(url)
    return f"https://www.gutenberg.org/cache/epub/{m.group(1)}/pg{m.group(1)}.txt" if m else url


def decode(raw: bytes, declared: str | None = None) -> str:
    """Bytes to text, honouring the server's declared charset when it works and
    falling back to UTF-8 then Latin-1 (which never fails) rather than peppering
    the corpus with U+FFFD. A leading BOM is dropped so it can't become a token."""
    for enc in (declared, "utf-8", "cp1252", "latin-1"):
        if not enc:
            continue
        try:
            text = raw.decode(enc)
            break
        except (UnicodeDecodeError, LookupError):
            continue
    else:  # pragma: no cover — latin-1 cannot fail
        text = raw.decode("utf-8", errors="replace")
    return text.lstrip("\ufeff")


def looks_like_html(text: str) -> bool:
    """True when the fetch returned a web page rather than a plain-text book."""
    head = text[:2000].lstrip().lower()
    return head.startswith(("<!doctype html", "<html", "<?xml")) or "<body" in head


def normalize_newlines(text: str) -> str:
    """CRLF/CR to LF. Gutenberg files are CRLF, and to a character-level
    tokenizer a bare carriage return is a *token*: it burns a vocabulary slot,
    appears before all ~100k newlines, and the model wastes capacity learning to
    emit it (then leaks stray CRs into generated text)."""
    return text.replace("\r\n", "\n").replace("\r", "\n")


def strip_gutenberg(text: str) -> str:
    """Remove the Gutenberg license header/footer when present; otherwise pass
    the text through unchanged (custom sources may have no such markers)."""
    start = _PG_START.search(text)
    end = _PG_END.search(text)
    body = text[start.end() : end.start()] if (start and end) else text
    return body.strip() + "\n"


def clean(raw: bytes, declared: str | None = None) -> str:
    """Full bytes-to-corpus pipeline: decode, drop boilerplate, normalise newlines."""
    text = decode(raw, declared)
    if looks_like_html(text):
        raise ValueError(
            "that URL returned a web page, not a plain-text book. On Project "
            "Gutenberg, open the book and copy the link to the "
            "'Plain Text UTF-8' file - it ends in .txt"
        )
    return normalize_newlines(strip_gutenberg(text))


def stats(text: str) -> dict[str, int]:
    char_count = len(text)
    return {
        "char_count": char_count,
        "word_count": len(text.split()),
        "token_count": char_count,  # char-level: one token per character
        "vocab_size": len(set(text)),
    }


def corpus_path(data_dir: Path, version: str) -> Path:
    return data_dir / f"{version}.txt"


def meta_path(data_dir: Path, version: str) -> Path:
    return data_dir / f"{version}.meta.json"


def custom_path(data_dir: Path) -> Path:
    return data_dir / "custom_sources.json"


def load_sources(data_dir: Path) -> dict[str, Source]:
    """Presets merged with the user's custom registry (custom wins on id clash)."""
    sources: dict[str, Source] = dict(PRESETS)
    cf = custom_path(data_dir)
    if cf.exists():
        try:
            for d in json.loads(cf.read_text(encoding="utf-8")):
                s = Source(
                    id=d["id"],
                    name=d.get("name", d["id"]),
                    language=d.get("language", "Unknown"),
                    url=d.get("url"),
                    license=d.get("license", "User-added"),
                    verified=bool(d.get("verified", True)),
                    note=d.get("note", ""),
                )
                sources[s.id] = s
        except (json.JSONDecodeError, KeyError, OSError):
            pass
    return sources


def list_sources(data_dir: Path) -> list[dict]:
    """All known translations + their downloaded status/stats (for the UI)."""
    out: list[dict] = []
    for s in load_sources(data_dir).values():
        meta = meta_path(data_dir, s.id)
        info: dict = {
            "id": s.id,
            "name": s.name,
            "language": s.language,
            "license": s.license,
            "verified": s.verified,
            "hasUrl": bool(s.url),
            "downloaded": meta.exists(),
        }
        if meta.exists():
            try:
                m = json.loads(meta.read_text(encoding="utf-8"))
                info["sizeBytes"] = m.get("size_bytes")
                info["charCount"] = m.get("char_count")
                info["wordCount"] = m.get("word_count")
                info["tokenCount"] = m.get("token_count")
                info["vocabSize"] = m.get("vocab_size")
            except (json.JSONDecodeError, OSError):
                pass
        out.append(info)
    out.sort(key=lambda i: (i["language"], i["name"]))
    return out


def add_source(data_dir: Path, id: str, name: str, language: str, url: str) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    cf = custom_path(data_dir)
    items = json.loads(cf.read_text(encoding="utf-8")) if cf.exists() else []
    items = [i for i in items if i.get("id") != id]
    items.append(
        {
            "id": id,
            "name": name,
            "language": language,
            # Gutenberg landing pages get rewritten to their .txt file here, so a
            # URL copied straight from the address bar still works.
            "url": normalize_url(url),
            "license": "User-added",
            # User-added, so not one of the sources we vouch for — this is what
            # puts the "custom" badge on the row.
            "verified": False,
        }
    )
    cf.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")


def remove_source(data_dir: Path, id: str) -> None:
    """Forget a user-added translation and delete anything it downloaded.

    Presets are not removable. Without this a mistyped URL was permanent: the
    broken row stayed in the list forever with no way to correct it."""
    if id in PRESETS:
        raise ValueError(f"{id!r} is a built-in translation and can't be removed")
    cf = custom_path(data_dir)
    items = json.loads(cf.read_text(encoding="utf-8")) if cf.exists() else []
    if not any(i.get("id") == id for i in items):
        raise ValueError(f"unknown translation {id!r}")
    cf.write_text(
        json.dumps([i for i in items if i.get("id") != id], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    for p in (corpus_path(data_dir, id), meta_path(data_dir, id)):
        p.unlink(missing_ok=True)


def preview(data_dir: Path, version: str, chars: int = 600) -> str:
    """The opening of a downloaded corpus, for the Corpus view's sample panel."""
    path = corpus_path(data_dir, version)
    if not path.exists():
        raise ValueError(f"{version!r} isn't downloaded")
    with path.open(encoding="utf-8") as fh:
        head = fh.read(chars * 4)
    # Skip any leading front matter (title page, credits) to land on real text.
    body = "\n".join(ln for ln in head.splitlines() if ln.strip())
    return body[:chars]


def alphabet(data_dir: Path, version: str) -> list[list]:
    """Every character in a downloaded corpus with how often it occurs, commonest first.

    This is the model's whole vocabulary, so the Corpus view can show it as a
    printer's type case."""
    path = corpus_path(data_dir, version)
    if not path.exists():
        raise ValueError(f"{version!r} isn't downloaded")
    counts = Counter(path.read_text(encoding="utf-8"))
    return [[ch, n] for ch, n in counts.most_common()]


def download(version: str, data_dir: Path, chunk_size: int = 1 << 16) -> Path:
    """Stream, clean, write corpus + meta. Emits progress/status events."""
    src = load_sources(data_dir).get(version)
    if src is None:
        raise ValueError(f"unknown version {version!r}")
    if not src.url:
        raise ValueError(f"no source URL configured for {version!r} ({src.name}). {src.note}")

    data_dir.mkdir(parents=True, exist_ok=True)
    protocol.status("download", f"Fetching {src.name}", version=version)

    url = normalize_url(src.url)
    req = Request(url, headers={"User-Agent": "BibleLM/0.1 (+training corpus fetch)"})
    raw = bytearray()
    with urlopen(req) as resp:
        declared = resp.headers.get_content_charset()
        ctype = (resp.headers.get_content_type() or "").lower()
        if ctype.startswith("text/html"):
            raise ValueError(
                f"{url} is a web page, not a plain-text book. On Project Gutenberg, "
                "open the book and copy the link to the 'Plain Text UTF-8' file "
                "- it ends in .txt"
            )
        total = int(resp.headers.get("Content-Length") or 0)
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            raw.extend(chunk)
            protocol.progress(len(raw), total or len(raw))

    protocol.status("clean", "Cleaning text", version=version)
    text = clean(bytes(raw), declared)
    if len(text) < 1024:
        raise ValueError(
            f"{src.name} downloaded only {len(text)} characters of text — that "
            "doesn't look like a Bible. Check the source URL."
        )

    out = corpus_path(data_dir, version)
    out.write_text(text, encoding="utf-8", newline="\n")

    meta = {
        "version": version,
        "name": src.name,
        "language": src.language,
        "downloaded": True,
        "size_bytes": out.stat().st_size,
        **stats(text),
    }
    meta_path(data_dir, version).write_text(json.dumps(meta, indent=2), encoding="utf-8")

    protocol.status("ready", f"{src.name} ready", version=version, **stats(text))
    protocol.done(version=version, path=str(out), size_bytes=meta["size_bytes"])
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="biblelm.corpus")
    sub = ap.add_subparsers(dest="cmd", required=True)

    lst = sub.add_parser("list")
    lst.add_argument("--data-dir", required=True, type=Path)

    addp = sub.add_parser("add")
    addp.add_argument("--data-dir", required=True, type=Path)
    addp.add_argument("--id", required=True)
    addp.add_argument("--name", required=True)
    addp.add_argument("--language", required=True)
    addp.add_argument("--url", required=True)

    rmp = sub.add_parser("remove")
    rmp.add_argument("--data-dir", required=True, type=Path)
    rmp.add_argument("--id", required=True)

    pv = sub.add_parser("preview")
    pv.add_argument("--data-dir", required=True, type=Path)
    pv.add_argument("--version", required=True)
    pv.add_argument("--chars", type=int, default=600)

    ab = sub.add_parser("alphabet")
    ab.add_argument("--data-dir", required=True, type=Path)
    ab.add_argument("--version", required=True)

    dl = sub.add_parser("download")
    dl.add_argument("--version", default="kjv")
    dl.add_argument("--data-dir", required=True, type=Path)
    dl.add_argument("--protocol", action="store_true", help="(events always go to stdout)")

    args = ap.parse_args(argv)
    try:
        if args.cmd == "list":
            protocol.emit({"type": "sources", "sources": list_sources(args.data_dir)})
            return 0
        if args.cmd == "add":
            add_source(args.data_dir, args.id, args.name, args.language, args.url)
            protocol.done(id=args.id)
            return 0
        if args.cmd == "remove":
            remove_source(args.data_dir, args.id)
            protocol.done(id=args.id)
            return 0
        if args.cmd == "preview":
            protocol.emit(
                {
                    "type": "preview",
                    "version": args.version,
                    "text": preview(args.data_dir, args.version, args.chars),
                }
            )
            return 0
        if args.cmd == "alphabet":
            protocol.emit({"type": "alphabet", "version": args.version, "symbols": alphabet(args.data_dir, args.version)})
            return 0
        download(args.version, args.data_dir)
        return 0
    except Exception as exc:  # noqa: BLE001 — surface any failure as a protocol event
        protocol.error(str(exc))
        return 1


if __name__ == "__main__":
    sys.exit(main())

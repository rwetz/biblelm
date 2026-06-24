"""Corpus management — many Bible translations and languages.

Translations come from two places:
  * built-in **presets** (verified public-domain sources), and
  * a user **custom registry** at ``<data_dir>/custom_sources.json`` — anyone can
    add a version/language by pasting a plain-text URL, no code change needed.

`download` streams a source (reporting progress), strips Project Gutenberg
boilerplate when present, writes a cleaned `<id>.txt`, and writes a
`<id>.meta.json` of stats the Rust backend reads directly.

CLI:
    python -m biblelm.corpus list   --data-dir <dir>
    python -m biblelm.corpus add    --data-dir <dir> --id web --name "World English Bible" --language English --url <url>
    python -m biblelm.corpus download --version kjv --data-dir <dir>
"""

from __future__ import annotations

import argparse
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

# Project Gutenberg wraps the work between these markers.
_PG_START = re.compile(r"\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", re.IGNORECASE)
_PG_END = re.compile(r"\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", re.IGNORECASE)


def strip_gutenberg(text: str) -> str:
    """Remove the Gutenberg license header/footer when present; otherwise pass
    the text through unchanged (custom sources may have no such markers)."""
    start = _PG_START.search(text)
    end = _PG_END.search(text)
    body = text[start.end() : end.start()] if (start and end) else text
    return body.strip() + "\n"


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
        {"id": id, "name": name, "language": language, "url": url, "license": "User-added", "verified": True}
    )
    cf.write_text(json.dumps(items, indent=2), encoding="utf-8")


def download(version: str, data_dir: Path, chunk_size: int = 1 << 16) -> Path:
    """Stream → clean → write corpus + meta. Emits progress/status events."""
    src = load_sources(data_dir).get(version)
    if src is None:
        raise ValueError(f"unknown version {version!r}")
    if not src.url:
        raise ValueError(f"no source URL configured for {version!r} ({src.name}). {src.note}")

    data_dir.mkdir(parents=True, exist_ok=True)
    protocol.status("download", f"Fetching {src.name}", version=version)

    req = Request(src.url, headers={"User-Agent": "BibleLM/0.1 (+training corpus fetch)"})
    raw = bytearray()
    with urlopen(req) as resp:
        total = int(resp.headers.get("Content-Length") or 0)
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            raw.extend(chunk)
            protocol.progress(len(raw), total or len(raw))

    protocol.status("clean", "Cleaning text", version=version)
    text = strip_gutenberg(raw.decode("utf-8", errors="replace"))

    out = corpus_path(data_dir, version)
    out.write_text(text, encoding="utf-8")

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
        download(args.version, args.data_dir)
        return 0
    except Exception as exc:  # noqa: BLE001 — surface any failure as a protocol event
        protocol.error(str(exc))
        return 1


if __name__ == "__main__":
    sys.exit(main())

"""BibleLM — a small GPT-style transformer trained from scratch on the Bible.

The package is driven by the Tauri/Rust backend, which spawns the `train` and
`generate` modules as child processes and parses their stdout (one JSON object
per line — see `protocol.py`) into live UI events. Nothing here imports Tauri;
the modules are plain CLIs that also run standalone from a terminal.
"""

__version__ = "0.1.0"

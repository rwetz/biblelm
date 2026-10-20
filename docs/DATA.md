# Data

Everything the study side reads is static files under `public/data`,
`public/art` and `public/models`, built by offline scripts and git-ignored
(they are reproducible, and large). Vite serves them in dev; a release build
bundles them. Downloads are cached in `data-src/` and `art-src/` so a rebuild
never refetches.

```sh
pnpm data          # everything below, in order (first run: a few minutes)
pnpm data:bible    # texts, verse index, cross references, topics (~10 s)
pnpm data:art      # 241 Doré plates + dithered heroes (~3 min, ~130 MB of downloads)
pnpm data:embed    # semantic index + Scripture map (~2 min on CPU, 34 MB model)
node scripts/data/check-semantic.mjs "your query"   # spot-check the index
```

| Output | Built by | What |
|---|---|---|
| `data/translations.json`, `data/bible/<id>.json` | build-bible | Six translations from eBible.org verse-per-line files, each in its own versification |
| `data/refs.json` | build-bible | The verse index: the KJV with Apocrypha, 36,822 verses. Cross references, topics and embeddings key on it |
| `data/xrefs.bin` | build-bible | 341,290 OpenBible cross references as Int32 quads `[from, toStart, toEnd, votes]`, sorted by source |
| `data/topics.json` | build-bible | 6,712 OpenBible topics, passages as `[start, end, score]` triples |
| `data/embeddings.i8`, `.json` | embed | bge-small-en-v1.5 CLS vectors, int8 (scale 400), one per indexed verse (WEB text, KJV where the WEB lacks it) |
| `data/map.u16` | embed | UMAP 2D position per verse, 0 to 65535 |
| `art/dore/*.jpg`, `plates.json` | art/dore | Each plate at 1000 px and 400 px, single-channel JPEG, with its passage |
| `art/heroes/*.png`, `heroes.json` | art/heroes | 1-bit dithered heroes (Atkinson, Bayer or blue noise), 720 px |
| `models/Xenova/bge-small-en-v1.5` | embed | The same model files, for offline query embedding in the app |

Licences: texts public domain (eBible.org); cross references and topics CC-BY
(OpenBible.info, credited in Settings, About); plates public domain
([art-credits.md](art-credits.md)); bge-small MIT.

Notes are not here: they live in the app data folder (`notes.json`, with
`backups/`), written by Rust. See [STUDY.md](STUDY.md).

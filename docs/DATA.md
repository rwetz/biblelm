# Data

Everything the study side reads is static files under `public/data`,
`public/art` and `public/models`, built by offline scripts and git-ignored
(they are reproducible, and large). Vite serves them in dev; a release build
bundles them. Downloads are cached in `data-src/` and `art-src/` so a rebuild
never refetches.

```sh
pnpm data          # everything below, in order (first run: a few minutes)
pnpm data:bible    # texts, 1 Enoch, verse index, cross references, topics (~10 s)
pnpm data:study    # places, people, interlinear, lectionary, communities, allusions (~1 min, ~110 MB of downloads)
pnpm data:art      # 241 Doré plates, heroes, the Lab's heroes, 25 paintings, 18 woodcuts (~5 min, ~190 MB of downloads)
pnpm data:embed    # semantic index + Scripture map (~2 min on CPU, 34 MB model)
node scripts/data/check-semantic.mjs "your query"   # spot-check the index
```

| Output | Built by | What |
|---|---|---|
| `data/translations.json`, `data/bible/<id>.json` | build-bible | Six translations from eBible.org, each in its own versification. KJV and WEB from USFM (words of Christ marked ⸢ ⸣ in the text), the rest from verse-per-line files |
| `data/bible/enoch.json` | build-bible (`enoch.mjs`) | 1 Enoch in R. H. Charles's translation (SPCK, 1917; public domain), parsed from Project Gutenberg #77935: 108 chapters, 1,063 verses. A companion text (`companion: true` in translations.json): never chosen as a translation, borrowed by all of them for the Pseudepigrapha shelf (STUDY.md) |
| `data/bible/<id>.strongs.json` | build-bible | KJV and WEB: each verse's tagged words, `[[word, "G25"], ...]` |
| `data/strongs-lexicon.json` | build-bible | Strong's Hebrew and Greek dictionaries, 14,197 entries (Open Scriptures JSON, CC-BY-SA) |
| `data/refs.json` | build-bible | The verse index: the KJV with Apocrypha, 36,822 verses, then 1 Enoch's 1,063 (37,885 in all). Cross references, topics and embeddings key on it; companion verses come last so no KJV position moves |
| `data/xrefs.bin` | build-bible | 341,290 OpenBible cross references as Int32 quads `[from, toStart, toEnd, votes]`, sorted by source |
| `data/topics.json` | build-bible | 6,712 OpenBible topics, passages as `[start, end, score]` triples |
| `data/topic-kinds.json` | topic-kinds (needs `TYPESAFE_API_KEY`; optional) | Each topic's kind (person, place, virtue, sin...) as tagged by Jev from its name and top verse, with the probability; the Topics index filters by it and hides the chips when it is absent |
| `data/embeddings.i8`, `.json` | embed | bge-small-en-v1.5 CLS vectors, int8 (scale 400), one per indexed verse (WEB text, KJV where the WEB lacks it, Charles for 1 Enoch) |
| `data/map.u16` | embed | UMAP 2D position per verse, 0 to 65535 |
| `art/dore/*.jpg`, `plates.json` | art/dore | Each plate at 1000 px and 400 px, single-channel JPEG, with its passage |
| `art/heroes/*.png`, `heroes.json` | art/heroes | 1-bit dithered heroes (Atkinson, Bayer or blue noise), 720 px |
| `art/heroes/literary.json` and its images | art/literary | The Lab's heroes: Doré's plates for Paradise Lost and the Ancient Mariner, grayscale, dithered live |
| `art/woodcuts/*.jpg`, `woodcuts.json` | art/woodcuts | 18 woodcuts and engravings beyond Doré (Dürer, Schnorr, Blake, the Nuremberg Chronicle, Luther 1534, Merian), plates from 1001; each file's licence checked when fetched ([woodcut-credits.md](woodcut-credits.md)) |
| `models/Xenova/bge-small-en-v1.5` | embed | The same model files, for offline query embedding in the app |
| `data/places.json` | atlas | 1,278 places from OpenBible.info's Bible Geocoding Data (CC BY 4.0): likeliest modern location, how sure, and every verse |
| `data/people.json` | atlas | 3,127 people from STEPBible TIPNR (CC BY 4.0): era, tribe, a one-line note, parents, siblings, partners, children, every verse |
| `data/land.json` | atlas | Natural Earth 1:50m land, lakes and rivers (public domain), clipped to Rome-to-Persia |
| `data/interlinear/<Book>.json` | interlinear | Every Hebrew (TAHOT, Leningrad Codex) and Greek (TAGNT, NA28 base text) word with transliteration, gloss, Strong's and grammar, keyed by KJV verse; 442,193 words, 26 MB |
| `data/lectionary.json` | daily | The 1979 Book of Common Prayer's Daily Office Lectionary (public domain; JSON by Reuben Lillie, MIT): both years and the holy days |
| `data/moby-dick.txt` | daily | Moby-Dick's letters only (Gutenberg, public domain): the control text for the Bible-codes lesson |
| `data/communities.json` | graph | 347 communities in the cross-reference graph (Louvain at resolution 12, split into connected parts as Leiden requires), each with its central verses and the readers' topic that best covers it |
| `data/allusions.json` | graph | 536 New Testament verses that quote the Old word for word (KJV), found by Smith-Waterman alignment seeded by rare shared three-word runs |
| `art/paintings/*.jpg`, `paintings.json` | art/paintings | 25 paintings and etchings (Caravaggio, Rembrandt, Honthorst, de La Tour) at 2000 px and 520 px, as painted: resized only. Each records whether it is in colour, how dark it is and where its light falls |

Licences: texts public domain (eBible.org; 1 Enoch from Project Gutenberg); cross references and topics CC-BY
(OpenBible.info, credited in Settings, About); Strong's dictionaries CC-BY-SA
(Open Scriptures, credited beside each entry); plates public domain
([art-credits.md](art-credits.md)); paintings public domain, some via the
Met's and the Rijksmuseum's CC0 releases ([painting-credits.md](painting-credits.md));
places CC BY 4.0 (OpenBible.info); people and the interlinear CC BY 4.0
(STEPBible, Tyndale House); land public domain (Natural Earth); the Daily
Office public domain; bge-small MIT. Theographic's people and events data was
considered and left out: it is CC BY-SA, and this project takes CC BY at most.

> **As built (Atlas, Daily, paintings):** STEPBible's three-letter book codes
> (`Ezk`, `Jhn`, `1Jn`) are not eBible's, so `stepBook` in `scripts/data/lib.mjs`
> maps them to OSIS. Each translation's metadata now carries `hash`, the first
> 16 hex digits of the SHA-256 of its text, so a note can record the exact
> edition it was written against.

> **As built (1 Enoch):** Charles's text is parsed as text by
> `scripts/data/enoch.mjs`. A numeral is a chapter or verse marker only where
> it is the next one (or a short jump where Charles reorders verses), and the
> headings that name a chapter leave a marker so a chapter that opens on a
> bare "1." still starts. Where he prints the Ethiopic beside a Greek fragment
> the Ethiopic is kept. His critical signs are dropped from the text. One slip
> in the transcription (lx. 25 printed as "5.") is fixed in `FIXES`, and the
> build fails if that slip ever disappears upstream, so the fix is never
> applied blind.

Notes are not here: they live in the app data folder (`notes.json`, with
`backups/`), written by Rust. See [STUDY.md](STUDY.md).

# Study features: texts, canon, notebooks

> **As built (2.0):** the verse store is compact JSON per translation, loaded
> into the webview, not SQLite in Rust. Search, the cross-reference graph and
> topics run in TypeScript over in-memory arrays (31k verses scan in
> milliseconds), so every study feature works in `pnpm dev` with real data and
> needs no backend. Topics come from OpenBible.info's topical Bible (CC-BY,
> 6,712 topics with reader-scored passages) instead of Nave's, which is only
> distributed in hard-to-parse formats. Notes are one JSON file written by Rust
> (atomic, with 14 daily backups), not `notes.db`. Parallel reading is a
> verse-aligned grid rather than dockview. Strong's word study is not built
> yet. Details: [DATA.md](DATA.md).

## Verse store (replaces Gutenberg parsing)

All text lives in one SQLite file, `bible.db`, owned by Rust (`rusqlite`), so
reading and exact search need no Python.

```sql
translation(id TEXT PRIMARY KEY, name, language, licence, source_url, sha256)
book(osis TEXT PRIMARY KEY, name, testament, canon, ord)   -- canon: protestant | deuterocanon | apocrypha
verse(translation, osis_ref, book, chapter, verse, text)   -- osis_ref: "John.3.16"
verse_fts USING fts5(text, content='verse')                -- instant phrase search
```

- Import structured sources instead of scraping prose: **eBible.org** publishes
  public-domain translations in USFM/USFX/VPL (KJV with Apocrypha, WEB with
  deuterocanon, ASV, Douay-Rheims, Brenton Septuagint, Latin Vulgate and many
  languages).
- `osis_ref` is translation-independent. Everything else (notes, highlights,
  cross references, embeddings) keys on it, so a note follows a verse across
  translations.
- `sha256` of the imported text is stored so a note can say which text it was
  written against.

Study datasets worth importing (all public domain or CC-BY):

| Dataset | Gives you |
|---|---|
| OpenBible.info cross references (CC-BY) | About 340k scored verse-to-verse links |
| Treasury of Scripture Knowledge (PD) | Classic cross references |
| Nave's Topical Bible (PD) | About 20k topics mapped to verses: the seed for topic search |
| Strong's concordance (PD) | Hebrew and Greek lemma behind each English word (via KJV+Strong's from eBible/STEPBible) |
| Easton's Bible Dictionary (PD) | Short articles on people, places, terms |

## Canon shelves

Your Apocrypha case ("fascinated, but would not study it"): canon is a
**shelf**, not a filter buried in settings.

- **Shelves:** Protestant 66 (default), Deuterocanon (Tobit, Judith, Wisdom,
  Sirach, Baruch, 1–2 Maccabees, additions to Esther and Daniel), Apocrypha
  (1–2 Esdras, Prayer of Manasseh), and later Pseudepigrapha (1 Enoch in the
  public-domain R. H. Charles translation).
- Default search and topic results draw only from enabled shelves. Results from
  other shelves appear in a separate, collapsed "Also found in" group.
- Non-default shelves show a small badge (`Deuterocanon`) on every verse card so
  you always know what you are reading.

## Notebooks ("instances")

A **notebook** is a study: its own translations, shelves and notes. Example:
"Romans with Paul" (KJV + WEB, Protestant) and "Apocrypha curiosities" (KJV
1611 Apocrypha only, kept apart from everything else).

```sql
notebook(id, title, created, translations JSON, shelves JSON, plate TEXT)
note(id, notebook, osis_start, osis_end, translation NULL, body_md, created, updated)
highlight(id, notebook, osis_ref, color_token, created)
tag(note, name)
```

- Stored in `notes.db` in the app data directory, separate from `bible.db`
  (the Bible can be rebuilt; your notes cannot). Plain Markdown bodies.
- A note is anchored to a verse range. `translation` is set only when the note
  is about wording ("KJV says *charity*, WEB says *love*").
- Each notebook opens as its own dockview layout: reading pane(s) per
  translation, notes pane, search pane. Layouts are saved per notebook.
- **Export** a notebook to a folder of Markdown files (Obsidian-friendly, with
  `[[John.3.16]]` links) so your study outlives the app.
- Backup: an automatic daily copy of `notes.db` (keep 14).

## Study flows to build first

1. **Read**: open a chapter, scroll, tap a verse for its cross references,
   notes and other translations.
2. **Topic study**: type "forgiveness" → Nave's topic verses + semantic
   neighbours ([ML.md](ML.md)) → add the good ones to a notebook.
3. **Compare**: one verse across all enabled translations, with word-level diff.
4. **Word study**: tap an English word → Strong's lemma → every verse using
   that lemma.

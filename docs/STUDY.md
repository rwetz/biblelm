# Study features: texts, canon, notebooks

> **As built (2.0):** the verse store is compact JSON per translation, loaded
> into the webview, not SQLite in Rust. Search, the cross-reference graph and
> topics run in TypeScript over in-memory arrays (31k verses scan in
> milliseconds), so every study feature works in `pnpm dev` with real data and
> needs no backend. Topics come from OpenBible.info's topical Bible (CC-BY,
> 6,712 topics with reader-scored passages) instead of Nave's, which is only
> distributed in hard-to-parse formats. Notes are one JSON file written by Rust
> (atomic, with 14 daily backups), not `notes.db`. Parallel reading is a
> verse-aligned grid rather than dockview. The KJV and WEB are built from
> eBible's USFM, which adds Strong's numbers (word study in the verse panel and
> by typing a number like G26 into Search) and the words of Christ (red letter,
> on by default); the KJV text is checked identical to the verse-per-line edition
> (`scripts/data/check-usfm.mjs`). Details: [DATA.md](DATA.md).

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

> **As built (notes version 2):** `notes.json` gained `memory` (verses learned
> by heart, scheduled by FSRS-4.5, `src/lib/fsrs.ts`), `plans` (reading plans
> followed, with the days read) and `deleted` (tombstones). With tombstones the
> file is a state-based CRDT: Notebooks, "Merge another copy" folds in a
> notes.json from another machine or a backup; newer edits win, deletions hold,
> plan days union, and merging is commutative and idempotent (`mergeNotes`,
> tested). This replaces the Automerge idea in IDEAS.md: no sync server, no new
> dependency, and the file stays plain JSON. A note about a translation's
> wording records that edition's content hash (`textHash`) and says so if the
> text changes. "Print illustrated" lays a notebook out for paper with the
> plates and paintings of each passage (`PrintNotebook.tsx`).

> **As built (notes version 3):** a note can cover separate runs of verses in
> one chapter: `start` and `end` hold the first run, `more` the rest
> (`spansOf`, `noteSpans`, `noteCovers` in `src/store/notebooks.ts`, tested).
> The reader picks verses like a file list (`pick` in `src/store/study.ts`:
> ctrl toggles, shift takes the run from the anchor, ctrl+shift adds it), and
> with more than one picked the verse panel becomes the passage panel. A
> selection stays within one chapter. Export (`ExportDialog.tsx`) takes the
> whole notebook, one book or one chapter, as one Markdown file, a file per
> book or a file per chapter, with the verses quoted in the notebook's main
> translation, or sends the same choice to Print illustrated.

## Atlas, Daily and the interlinear

> **As built:** three study pages beyond the plan.
>
> - **Atlas** (`src/features/atlas`): an engraved map (sea ruled in fine lines,
>   land in the page colour) of every geocoded place, sized by how often it is
>   named; people with their family and every verse; a timeline of nine eras with
>   the conventional dates most study Bibles print, labelled approximate. The
>   verse panel lists the people and places a verse names.
> - **Daily** (`src/features/daily`): the Daily Office for today from the 1979
>   Book of Common Prayer (the calendar is `officeFor` in `src/lib/lectionary.ts`:
>   Year One from Advent before an odd year, Propers by the Sunday closest to
>   May 11 + 7n), the day's painting, four reading plans portioned by verse
>   count (`src/lib/plans.ts`), and verses by heart, prompted by their first
>   letters.
> - **Interlinear**: a reader mode (toolbar or palette) that sets the Hebrew or
>   Greek under each verse with transliteration and gloss, right to left for
>   Hebrew. The 66 books only; the deuterocanon reads plainly.
> - **Gallery** and **Look**: every picture in Bible order; Look shows one
>   picture full window beside its passage ("look, read, look again").

## Study flows to build first

1. **Read**: open a chapter, scroll, tap a verse for its cross references,
   notes and other translations.
2. **Topic study**: type "forgiveness" → Nave's topic verses + semantic
   neighbours ([ML.md](ML.md)) → add the good ones to a notebook.
3. **Compare**: one verse across all enabled translations, with word-level diff.
4. **Word study**: tap an English word → Strong's lemma → every verse using
   that lemma.

# Changelog

All notable changes to BibleLM. Format based on
[Keep a Changelog](https://keepachangelog.com/); this project follows
[Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- **The Pseudepigrapha shelf**: 1 Enoch in R. H. Charles's translation (1917,
  public domain, from Project Gutenberg), off by default like the other
  shelves. It reads beside any translation and is credited to Charles in the
  reader, the verse panel and parallel columns; search, questions and search by
  meaning reach it when the shelf is on. The book picker lists every shelf.
- **Exact search ignores accents**: "Azazel" finds Charles's "Azâzêl" (and
  Latin with accents in the Vulgate); the text is shown as printed.

- **Seraphim and ophanim**: Merian's engraving of Ezekiel's vision (1630,
  public domain) beside Ezekiel 1, its wheel full of eyes and its four-faced
  creature as spots; hand-drawn ornaments of a six-winged seraph, the winged
  eye and an ophan, used across the Lab.
- **Numbered sections** in place of icon tabs on the Lab, Topics, the Atlas and
  the Gallery: a numeral, a name, a line on what is there, a dithered ornament.
- The Lab's front page shows the translations and the whole alphabet under its
  title, beside the dithered rose.

- **A new command palette** for the app only (pages, every setting, the
  Lab's rooms; Scripture stays in Search): the placeholder types out things to
  try, a dithered compass resolves as matches narrow, each group has its
  ornament, and a settings command opens Settings on that row and flashes it.
- **Search fields and dropdowns of one family** (`src/app/controls.tsx`): no
  glow ring on focus, a line of ink dots that drifts while you type; the
  browser's native dropdowns are gone.
- **Ornaments everywhere, and a switch for them**: the current page's
  ornament in the sidebar (re-dithered on each move), marks beside page
  titles, hand-drawn emblems of the four evangelists beside every Gospel
  chapter; Settings, Ornaments turns them all off.
- **The Lab's front page**: a much larger title and lit rose, the model's
  vital numbers, and the six rooms as a numbered table of contents.
- **The Atlas**: the map glides to a chosen place, ripples its coasts like an
  engraved map, names the seas, carries a cartouche and a scale bar, and
  brings the places in most-named first; the timeline's eras are hatched,
  each has its ornament, and the rows arrive as you scroll.
- **Your name**: asked once on first start (optional), printed on a
  notebook's title page; Settings, Your name.

- **Woodcuts and engravings beyond Doré**, only from public-domain or CC0
  sources and checked file by file (`scripts/art/woodcuts.mjs`): Dürer's
  Apocalypse and St Jerome, Schnorr von Carolsfeld, Blake's Job, the
  Nuremberg Chronicle, the 1534 Luther Bible. Each Gospel opens with its
  evangelist, chapter initials sit over a tiny dither of the book's art, and
  the empty notebook (Jerome's lion), empty search (Abraham and the stars) and
  error page (St Michael and the dragon) have their pictures.
- **The Lab on Axon**: with Axon 0.11 or newer installed, Training can run on
  Axon (no PyTorch) and Generate streams from it.
- **Jev's shadow evaluation** (docs/evals/shadow.md): on 30 study questions,
  reranking search lifts nDCG@10 from 0.33 to 0.55.

- **Studies for young men** (Topics, Studies, or "Study:" in the command
  palette): for men around 18 to 25 fighting temptation. Pick a struggle (lust
  and pornography, anger, pride, laziness and screens, drink, loneliness,
  fear, identity) for ideas with their verses and a question each, the
  stories, the passages readers return to, a walk through the cross
  references from the whole study, and passages written to young men. One
  click turns it into a notebook with a note per question.

- **Notes on several verses at once**: in the reader, ctrl-click (cmd on a
  Mac) adds or drops a verse, shift-click takes every verse from the last one
  clicked, ctrl+shift-click adds that run, as in a file list. The verse panel
  then shows the passage ("Romans 8:2–5, 9–11") and a note written there
  covers all of it. Highlight, copy and learn by heart work on the passage too.
- **Export, your way**: the whole notebook, one book or one chapter, as one
  Markdown file, a file per book or a file per chapter, with the verses quoted
  above each note; or printed (and saved as PDF) with the pictures.

- **Ornaments**: twelve hand-drawn ornaments dithered live in the theme's
  ink: a vine headpiece opens each book and an urn closes it, the fleuron is
  now dotted, a sun and lamp mark Morning and Evening on Daily, a compass rose
  sits on the Atlas, a quill in an empty notebook. All of them in Settings,
  developer mode.
- **The trinity mark** on Home, glowing slowly in rubric and gilt.
- **The rose mark** in Settings, About: the rose window filled with moving
  dithered waves that the pointer stirs.
- **The lit rose** beside the Lab's title: the window in dark metal, two
  lights, rubric and gilt, circling it.

### Changed

- Home's hero follows the church year in every scheme (the day's painting
  stays in Look at today).
- Printing leaves out the browser's own header and footer (date, address,
  page count) and sets everything in the book faces.
- A hero's credit sits under the picture's own edge, and a windowed hero
  dissolves at the top as well.

- The Topics view strip scrolls on a narrow window instead of running off it.

- Notes file version 3: a note can cover several separate runs of verses in
  one chapter (`more`). Older files load unchanged.
- Notes are listed and exported in Bible order (Genesis before Exodus), not by
  the letters of the book's abbreviation.
- The reader marks a note once, where each of its runs ends, not on every verse.

## [2.0.0] — 2026-10-21

BibleLM becomes an illustrated Bible study tool with the ML lab inside it.

### Added

- **A reader**: every chapter of six public-domain translations (KJV with the
  1611 Apocrypha, WEB, ASV, Douay-Rheims, Brenton Septuagint, Vulgate), with
  blackletter titles and drop caps, Garamond or Fell English text, the KJV's
  supplied words in italics, two-column and parallel reading, `[` and `]` to
  turn chapters.
- **All 241 Doré plates** from the 1866 *Grande Bible de Tours*, each set beside
  the verse it depicts; dithered Doré heroes on Home (changing with the church
  year) and the Lab; a plate in the corner of every other page.
- **A verse panel**: the verse in your translations, a word-level comparison
  across all six, cross references (341k, OpenBible.info), topics, verses like
  it by meaning, highlights and notes.
- **Search** by reference, word, question (the old Ask grammar, now in-app and on
  every translation), and by meaning with a local embedding model; hidden
  shelves are listed apart, never mixed in.
- **Topics**: OpenBible's 6,712-topic index, study walks (personalised
  PageRank over cross references), the strongest chain between two passages,
  a map of every verse placed by meaning, and a chiasm finder.
- **Notebooks**: one per study, each with its own translations, canon and cover
  plate; verse-anchored notes with tags; Markdown export; daily backups.
- **Word study**: Strong's numbers for every tagged word of the KJV and WEB,
  with the Hebrew or Greek lemma, Strong's definition, how the translation
  renders it, and every verse that uses it; type a number like G26 into Search.
- **Red letter**: the words of Christ in red in the KJV and WEB (Settings or
  the command palette).
- **Canon shelves**: Protestant, Deuterocanon, Apocrypha.
- **Lab, Inside the model**: attention heads, the logit lens, and the most and
  least surprising verses to the model.
- **Optional machine help**: Jev query routing and reranking, with the user's
  own TypeSafe key. No large hosted model is used.
- The Scriptorium theme (Vellum and Nocturne) on `@nexis/design`, with a command
  palette for every action.
- Planning docs, tests (TypeScript, Python, Rust), and CI.
- **Installers for Windows and macOS**, built by CI when a version is tagged
  (`.github/workflows/release.yml`).

- **Paintings.** All thirteen Caravaggios from the research list (The Calling
  of Saint Matthew, Supper at Emmaus, The Taking of Christ, The Incredulity of
  Saint Thomas, The Conversion on the Way to Damascus, The Sacrifice of Isaac,
  David with the Head of Goliath, The Raising of Lazarus, The Entombment, The
  Denial of Saint Peter, The Seven Works of Mercy, Judith Beheading Holofernes,
  Saint Jerome Writing), ten Rembrandts, Honthorst and Georges de La Tour,
  public domain (docs/painting-credits.md). Each opens the chapter it depicts
  as a frontispiece.
- **Partial dithering.** Heroes keep the original picture intact and turn
  only its dissolving edges, and a dark painting's ground, into dots, in the
  painting's own colours; prints are drawn in the theme's ink. The light
  arrives first.
- **Tenebrae**, a third scheme: Caravaggio's black and vermilion. Vellum and
  Nocturne are unchanged; the title bar button steps through all three.
- **Look**: one picture, the whole window, beside its passage. **Gallery**:
  every painting and plate in Bible order. **Seen in art** in the verse panel.
- **Atlas**: an engraved map of 1,278 places (OpenBible.info), 3,127 people
  with their families (STEPBible), and a timeline of the eras. The verse panel
  lists the people and places a verse names.
- **Daily**: the 1979 Prayer Book's Daily Office for today, the day's
  painting, four reading plans, and verses learned by heart (FSRS).
- **Interlinear** reading: the Hebrew and Greek under each verse with
  transliteration and gloss (STEPBible, CC BY).
- **Topics**: Words (a book's own words, collocations, words used once,
  closeness in style), Links (every cross reference as an arc diagram, and
  347 communities of passages) and Echoes (536 places the New Testament quotes
  the Old). Walk can go "between two ideas" by meaning.
- **Search** counts a phrase in every translation at once (a suffix array).
- **Lab, Lessons**: Zipf's law, and the Bible-codes search run on Genesis and
  Moby-Dick side by side against what chance predicts.
- **Notebooks**: print one illustrated, or merge in another copy of your notes.
  Notes on a translation's wording record the exact edition.

### Changed

- The five ML tabs moved under **Lab**. Ask is now part of Search and no longer
  needs Python.
- Release builds find their files properly: the Lab's scripts are bundled and
  its data lives in the app data folder, not the folder the app was built in.

- **Notes file version 2** adds memory verses, reading plans and tombstones;
  version 1 files migrate without losing anything.
- Empty states dither with blue noise.

- **Sharper plates.** 42 Doré plates that came from small copies (as narrow as
  330 px) are rebuilt from larger public-domain scans, cropped from page scans
  where needed; the source of each is in docs/art-credits.md.
- **Training sweep.** Four model shapes trained and scored by the same judge:
  6 layers × 384 (10.8M parameters) scores best, 2.92 against 2.75 for the
  current 4 × 256, and a longer context or dropout alone do not help
  (docs/evals/tuning.md). Training now defaults to that shape with dropout 0.1.
- **Generate samples at temperature 0.4, top-k 10** by default (was 0.8 and 40).
  Tuned against Jev's two scores over 576 samples: about 25% higher, without
  the repetition cooler settings bring (docs/evals/tuning.md).
- **Questions answered by choosing.** Ask Search a question and the passages
  found by meaning are weighed against it: the ones that answer appear first
  with the answering words marked. A question about the Bible as a book (“why is
  LORD in capitals?”) gets one of ten short notes written for BibleLM
  (`src/lib/notes.ts`), labelled as not Scripture. Nothing is generated.
- **Number fields in Training** have their own minus and plus buttons instead of
  the browser's spinner.
- **The sidebar picture** shows the nearest earlier scene for a book with no
  plate of its own, and says so when Developer mode has pinned one.
- **Readings without the machinery.** Search shows how a query reads as four
  dithered sigils (book, lamp, crook, key) that form as far as the reading is
  sure; Jev's name, percentages and timings are gone from every screen. Cross
  references offer "Closest first" or "Most voted".
- **The map, close up.** Zoom in and every verse is labelled, then quoted;
  hovering a verse threads its chapter through the map in reading order; dots
  and labels are easy to click at any zoom (up to 120x).
- **The Lab's front page.** Corpus opens on a Doré plate from Paradise Lost
  or the Ancient Mariner, turning every 30 seconds. Its figures are now hours to read aloud, printed pages and letters,
  the whole alphabet as a type case inked by use, and BibleLM as one dot in a
  field of 54,688 that is GPT-3.
- **Topics you can browse.** The 6,712 topics filter by kind (people, places,
  God and Christ, virtues, sins, practices, everyday life, feelings, events,
  things, today), by where in Scripture they mostly live, and by size; the
  index runs A to Z. The kinds were tagged once, offline, by Jev
  (`scripts/data/topic-kinds.mjs`, 13 seconds for all of them).
- **Corner plates stay in the corner.** On Search and Settings the plate is
  pinned to the window; scrolling blows its dots loose with the page and they
  gather again when you stop.
- **The Lab's front page shows the whole plate**, as tall as the window beside
  the title, and switching tabs swaps it for the band instead of animating a
  height (which re-dithered every frame).
- **Home fits the window**: picture, search and verse of the day on the first
  screen; your reading and notebooks below.

### Fixed

- **Export to ONNX** works with current PyTorch (it fell over without
  `onnxscript`), says plainly when the `onnx` package is missing, and shows a
  failure on the step that failed.

- **Art, dithered live** at the drawn size: Home's hero is framed so more of
  the plate shows, with a lighter fade; the Lab's title sits on clean paper;
  corner plates are crisp dots behind the page instead of a faint photo over it.
- **A sidebar vignette** that follows the book you are reading (or the verse
  of the day, or your notebook's cover) and opens its passage on click.
- **Empty states with art** (Training, Generate, Surprise, Notebooks) and a
  dithered cross loader for long work.
- **The Lab, reworked**: one centred column, section heads in Garamond,
  corpus figures that say what they mean, no status pills, and a Surprise view
  that explains loss as a chance per letter, folds repeated refrains and links
  every verse to the reader.
- **Reading**: brighter red letters on Vellum, a larger drop cap, quieter note
  fields, and no plate from a later chapter at the foot of a chapter.
- **Verse of the day** reads on to the end of its sentence (Galatians 5:22-23)
  and is set in Garamond; blackletter stays on big titles only.
- Pages keep a centred column on a maximised window; the Home hero no longer
  shrinks in short windows.
- Dithered art has no soft blur: edges break up into dots, and small art uses
  1 px Floyd-Steinberg dots from the full scan, so the scene reads.
- **Book picker**: books under their sections (Law, History, Prophets,
  Gospels, Letters...), then a chapter grid, instead of a 66-row dropdown.
- **Verse panel** comes back with `p`, a toolbar button or the palette.
- **Scripture map** zooms (wheel, buttons, double-click), pans by dragging,
  labels the densest places (books, then chapters close in) and finds a book.
- **Developer mode** (Settings): pick any Home hero and browse all 241 plates,
  engraved and dithered, to find art bugs.
- Settings explains how to give Jev its key (there is deliberately no field) and
  lists every place Jev is used. The desktop app also reads the key from the
  saved Windows user environment.
- **Jev, live**: Search and the Home box show how Jev reads your query as you
  type (the odds and the round trip in ms); the verse panel shows what kind of
  passage Jev takes each verse to be.
- **Search as you type**: four lanes (verses with these words, topics, people
  and stories with dithered plates, passages by meaning) answer every
  keystroke; Jev's reading orders them, sliding the likeliest to the top, and a
  plate beside them resolves as clearly as Jev is sure.
- **Jev elsewhere**: cross references in the verse panel are ordered by how
  closely each speaks to the verse (dots show Jev's reading; votes one click
  away), and the Lab's Generate tab has Jev judge what the model wrote (sounds
  like the KJV, makes sense). Jev calls share one kept-alive connection.
- **Benchmarks**: `node scripts/bench/jev.ts` (latency and agreement for every
  Jev question) and dither timings, in `docs/evals/benchmarks.md`.

### Removed

- The Python search worker for Ask (`bible_search`), replaced by the in-app engine.

## [1.2.0] — 2026-09-02

### Added

- **Drop-in model import** — drag a `.pt` checkpoint, a `.onnx` graph, or a
  `tokenizer.json` onto the app (**Model** tab) to run the released
  model without training. Each file is validated by `python/biblelm/model_io.py`
  before it replaces anything, so a wrong or corrupt file fails at import with a real
  message instead of at generation time. A path field covers cases where dragging
  isn't practical.
- **Self-contained checkpoints** — training now embeds the character vocabulary in the
  `.pt` (`tokenizer_stoi`), so a single checkpoint file is enough to generate from;
  the import unpacks `tokenizer.json` from it. Older checkpoints that only reference
  the tokenizer still import, and the report says to drop that file too.
- **Remove a custom translation** — the trash icon on a user-added row deletes it and
  its downloaded corpus. A mistyped URL used to be permanent.

### Changed

- **The Export tab is now the Model tab**, covering both directions: import a model to
  run without training, or export a checkpoint you trained to ONNX. The view moved to
  `src/modules/model/ModelView.tsx` alongside the import card.

### Fixed

- **Gutenberg book pages were silently trained on as scripture.** Pasting the URL from
  your browser's address bar (`gutenberg.org/ebooks/10`) returns an HTML page with
  status 200, so nothing errored: the markup was saved as a corpus, given real-looking
  stats, and marked ready. That form is now rewritten to the corresponding `.txt`, and
  any other response that is a web page is rejected with an explanation.
- **The selected translation reset to KJV on every restart**, so a run started after a
  restart could train on a different corpus than the one shown as selected. The choice
  now persists, and a selection pointing at a translation that was removed or never
  downloaded falls back to one that is actually available.
- **The VRAM guard always assumed a 75-token vocabulary** regardless of the selected
  translation — nothing ever populated the corpus stats it reads. The Training tab's
  estimate now follows the selected corpus.
- **Carriage returns were tokens.** Gutenberg files are CRLF, so a bare `
` took a
  vocabulary slot and preceded all ~100k newlines; the model spent capacity learning
  to emit it and leaked stray CRs into generated text. Corpora are normalised to LF
  (KJV vocabulary: 75 → 74).
- **Ask was missing the entire book of Genesis.** The KJV parser found the start
  of the text by a hardcoded line offset (`TOC_END = 140`) measured against an older
  Project Gutenberg layout. Gutenberg has since shortened the front matter, so both
  Genesis headers fell before the cutoff and were skipped: the parser began at Exodus
  and produced 29,569 verses across 65 books. Every answer was wrong as a result —
  "how many books" said 65, "how many verses" said 29,569, and `Genesis 1:1` could not
  be found at all. The body is now located by structure (a table-of-contents entry is
  followed by another heading; a real one is followed by verse content), which is not
  sensitive to reformatting. Parses 31,102 verses across 66 books, matching the
  canonical KJV.
- **A built-in Ask example returned no results** — "find do unto others" is not the
  KJV's wording, so the one example demonstrating phrase search demonstrated it
  failing. Replaced with "find fishers of men".
- **The Ask tab had no title** in the window header — `ask` was missing from the
  header's label map. The map is now typed by `View`, so a future view without a label
  fails to compile instead of rendering blank.
- **The VRAM meter could sit on "querying GPU…" forever.** The probe shells out to
  Python/torch and fails for ordinary reasons (no venv, torch missing), but the error
  was swallowed. It now reports the failure and offers a retry.
- **Corpus sample and vocabulary count were hardcoded to the KJV** and didn't change
  when another translation was selected. Both now come from the selected corpus.
- **Translations named in a non-Latin script could not be added at all** — the id was
  slugged from the name and came out empty, permanently disabling the Add button with
  no explanation. Names now fold accents, fall back to a stable hash, and the form
  says which field is blocking.
- **User-added translations never showed the "custom" badge** — they were written to
  the registry as `verified: true`.
- Checkpoints are loaded with `weights_only=True` at import, generation, and export. A
  `.pt` is a pickle, and these files now come from the internet.

## [1.0.0] — 2026-06-23

First public release — a complete, from-scratch language-model pipeline with a live
training dashboard.

### Added

- **From-scratch GPT** (`python/biblelm/model.py`) — character-level decoder-only
  transformer: token + positional embeddings, causal multi-head attention, pre-norm
  blocks, weight-tied LM head. No model libraries.
- **Live training** — PyTorch training loop that streams loss / val-loss / throughput
  metrics on a ~20 Hz wall-clock cadence; checkpoints the best validation loss. CUDA
  auto-detected.
- **Real-time dashboard** — Tauri 2 + React 19 + Tailwind v4 UI with a hand-rolled SVG
  loss chart that fills its container at any aspect ratio, live metric cards, and a
  borderless window chrome.
- **Multi-translation corpus** — download Bible translations or add your own by URL
  (any language; the char tokenizer adapts to the script). Select which translation to
  train on.
- **Streaming inference** — prompt the model and stream a completion token by token,
  with temperature / max-tokens / top-k controls.
- **ONNX export** — convert a checkpoint to a portable `.onnx` graph, validated with
  `onnx.checker`.
- **Plain-English help** — every ML knob (d_model, n_heads, temperature, top-k, …) has
  an info tooltip aimed at readers with zero ML background.
- **Architecture** — Rust backend spawns the Python scripts and bridges their NDJSON
  stdout to Tauri events; the frontend never touches PyTorch.

[2.0.0]: https://github.com/rwetz/biblelm/releases/tag/v2.0.0
[1.2.0]: https://github.com/rwetz/biblelm/releases/tag/v1.2.0
[1.0.0]: https://github.com/rwetz/biblelm/releases/tag/v1.0.0

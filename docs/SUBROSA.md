# Sub Rosa

*Sub rosa*, "under the rose": said of what is told in confidence. A rose was
hung over the table where secrets were kept, and carved over confessionals.
It fits a Bible app whose mark is a rose window.

Sub Rosa is BibleLM's **curiosities mode**: a cabinet for the infamous and the
argued over, for fun and for boredom first and research second. It is:

- angels as Scripture draws them (Ezekiel 1 and 10, Isaiah 6), and the orders
  later writers gave them;
- hell, its words (Sheol, Gehenna, Hades, Tartarus) and the people who drew
  and mapped it, with demons, devils and the damned in the art;
- the *Ars Goetia* and the rest of the *Lesser Key of Solomon*, with the
  *Testament of Solomon* it grew from;
- the Masons, Solomon and his Temple, and why Freemasonry put them at its
  centre (Hiram, Boaz and Jachin, the rebuilding);
- symbols, Christian and infamous: the crucifix, the Chi Rho, the ichthys,
  the inverted cross (St Peter's, and papal), the pentagram and its
  inversion, the Eye of Providence, Baphomet.

## Principles (the app's, kept)

1. **Scripture speaks, and is labelled.** Every claim in a dossier is tagged
   **Scripture**, **tradition**, **folklore** or **modern invention**, with
   the verses or the source behind it. That sorting is the fun and the
   history lesson at once. Verses are real verses with references.
2. **Public domain or CC-BY, credited.** Art and texts are recorded with
   their provenance like the rest (art-credits.md, painting-credits.md).
3. **A reference, not a how-to.** The grimoires are shown as the historical
   texts they are, read and illustrated, with their history; the mode adds no
   instructions of its own.
4. **Off by default, one click out.** Nothing of the mode shows until it is
   on; the rest of the app is unchanged.

## Turning it on

Settings, Sub Rosa (`SubRosaPanel` in `src/features/settings`), or "Go under
the rose" in the palette: one click in, one click out, no message either way.

> **As built (after S5):** the acknowledgement that replaced the rite is gone
> too. Anyone who turns the mode on has asked for it; the tags on every claim
> already say where each thing comes from.

> **As built (after S4):** S1 shipped a three-step rite (four joking oaths, a
> seal pressed and held for 2.4 s, and *Retro me, Satana* typed out) and a
> toast on the way out. It was fun once and a chore for anyone who switches
> often, so it became one acknowledgement, since removed (below).

## What it changes

| | Off | Sub Rosa |
|---|---|---|
| Theme | Vellum, Nocturne or Tenebrae | **Sub Rosa** (`subRosa` in `src/app/theme.ts`): green-black smoked glass `#0a0c0a`, ash and bone ink `#d8d6c6`, brimstone `#cdbf45` as the one accent. Always dark; the scheme button and scheme choice are hidden |
| Shelves | as you set them (Protestant by default) | **every shelf**, silently: the deuterocanon, apocrypha and Enoch are simply there the next time you open the books |
| The rose mark | upright | hung head down (`[data-rose]`, styles.css) |
| `CrossLoader` | Latin cross | St Peter's cross (inverted, as he asked to be crucified, and the papal symbol) |

Going under records the scheme and shelves you had (`beforeSubRosa` in
`src/store/study.ts`); coming out puts both back. `useSubRosaSync`
(`src/app/subrosa.ts`) sets `data-subrosa` on `<html>` and holds the theme
to Sub Rosa while the mode is on.

## Milestones

- [x] **S1 The switch.** The acknowledgement, theme, shelves on and restored, hanging rose,
  Petrine cross, palette commands.
- [x] **S2 Dark art.** `scripts/art/curios.mjs` (in `pnpm data:art`) builds
  `public/art/curios/`: plates, heroes and paintings, every file checked on
  Commons to be tagged public domain or CC0. Credits in
  [curios-credits.md](curios-credits.md).

  > **As built:**
  > - **Plates 2001 to 2051**, engraved: eleven of Doré's *Inferno* plates;
  >   thirteen of Le Breton's demons for the *Dictionnaire infernal*, the
  >   ones Scripture names standing beside their verse (Asmodeus at Tobit
  >   3:8, Azazel at Leviticus 16:8, Beelzebub at 2 Kings 1:2, Baal,
  >   Astaroth, Adramelech, Belphegor at Baal-peor, Berith at El-berith);
  >   Dürer's *Apocalypse* (the Four Horsemen, the Whore of Babylon, the
  >   beast like a lamb, the seven trumpets) and *Knight, Death and the
  >   Devil*; Schongauer's and Callot's Saint Anthony; Bruegel's *Last
  >   Judgment* and *Descent into Limbo*; Goya's *Sleep of Reason*; Blake's
  >   *Behemoth and Leviathan*; Lévi's Baphomet.
  > - **Heroes**: nine of those plates as dithered tones (the gate of hell,
  >   Charon, Minos, the Titans, Lucifer, the harpies in the wood, Bruegel's
  >   two, Callot).
  >   Home turns through them daily (`roseHero`), and the Lab rotates them in
  >   place of Milton and Coleridge.
  > - **Paintings**: twenty, kept as painted. Bosch (the *Garden*, the Vienna
  >   *Last Judgment*, *Hell* and the *Ascent of the Blessed*), Bruegel (*The
  >   Fall of the Rebel Angels*, *Dulle Griet*), Memling, Michelangelo,
  >   Signorelli, Giotto, Fra Angelico, Lochner and van Eyck (the Met, CC0)
  >   on the Last Judgment; Botticelli's *Map of Hell*; the Cleves *Mouth of
  >   Hell*; Raphael's *Saint Michael* and *Vision of Ezekiel*; Blake's *Great
  >   Red Dragon* and *Number of the Beast*; Martin's *Pandemonium*. The
  >   painting of the day turns through these alone, with no church year.
  > - **Swapping**: under the rose `usePlates`, `useHeroes` and
  >   `usePaintings` fetch and add the set, so the reader, Look, the Gallery
  >   and notebook covers have it. `ROSE_PLATES` maps each `PAGE_PLATES` and
  >   `SIDEBAR_PLATES` number to its replacement (`pagePlate`), and
  >   `ROSE_PAGE_PAINTINGS` does the same for the Gallery, Topics and
  >   Notebooks paintings. The Doré Bible plates still stand beside their
  >   own passages: the reader keeps its Scripture.
  > - **Left out**: the Codex Gigas devil (no scan larger than 369 px that is
  >   not CC BY), Fuseli's *Nightmare* (only a CC BY photograph), the *Hortus
  >   deliciarum* (no usable scan turned up in the first search), Doré's
  >   *Paradise Lost* (the Lab already has it, in `literary.mjs`).
- [x] **S3 Texts.** Plain-text importers (parsed as text, never executed),
  each as a companion text or a library text:
  - *Testament of Solomon* (Conybeare, 1898), *Apocalypse of Peter* and
    *Apocalypse of Paul* (James, 1924), *Gospel of Nicodemus* (the
    Harrowing of Hell), *Ascension of Isaiah* (Charles, 1900), *Jubilees*
    (Charles, 1902) on the Pseudepigrapha shelf, beside Enoch;
  - the *Goetia* (Mathers, 1904) and the 72 seals;
  - Pseudo-Dionysius, *Celestial Hierarchy* (Parker, 1897);
  - Dante, *Inferno* (Longfellow, 1867), Milton, *Paradise Lost*;
  - Mackey, *Encyclopedia of Freemasonry* (1873), and Pike, *Morals and
    Dogma* (1871), in excerpts.

  > **As built:** the rule that sorted them: a text with its own verse
  > numbers reads in the Bible, a text without them in the library.
  > - **On the Pseudepigrapha shelf** (`scripts/data/pseudepigrapha.mjs`,
  >   companion texts like 1 Enoch; STUDY.md): Jubilees (Charles's 1917
  >   translation, from Sefaria, not the 1902 edition, whose only online
  >   text is OCR with the footnotes run into the verses); the Testament of
  >   Solomon; the Gospel of Nicodemus and the Apocalypse of Paul. Every
  >   translation borrows them, the verse panel links them to the canon
  >   (`companions.ts`), and search, meaning search and the Scripture map
  >   reach them once the shelf is on, as it is under the rose.
  > - **In the library** (`scripts/data/library.mjs`, `src/lib/library.ts`):
  >   the Goetia, Dionysius, James's Apocalypse of Peter (a dossier of
  >   fragments: the church fathers' quotations, the Akhmim Greek, the
  >   Bodleian leaf, the Ethiopic), the *Inferno*, *Paradise Lost*, Mackey's
  >   *Symbolism of Freemasonry* (1869, whole, with his glossary of the
  >   symbols, in place of the *Encyclopedia*, which is not on Gutenberg or
  >   Wikisource) and five of Pike's degrees (I to III, XIII, the Royal Arch
  >   of Solomon, and XIX, where "Lucifer, the Light-bearer" stands). They
  >   read in the cabinet, the **Sub Rosa** page (`src/features/cabinet`),
  >   in the sidebar and palette only under the rose: a section at a time,
  >   headed "Not Scripture", never in the Bible's reader. Its second shelf,
  >   *Beyond the canon*, opens the Pseudepigrapha books in the reader.
  > - **The Goetia's rite is left in the book.** The cabinet has the
  >   prefaces, the 72 spirits (a section each), the vessel of brass, their
  >   ranks and the glossary of names; the circle, the implements, the
  >   conjurations and the licence to depart are left out, and the text says
  >   so (principle 3).
  > - **Left out:** the *Ascension of Isaiah* (Charles's 1900 edition is
  >   online only as OCR of a parallel-column page; no clean public-domain
  >   text turned up); the 72 seals (de Laurence prints them as seven plates
  >   of figures; they wait for the bestiary in S5); Nicodemus's prologue
  >   (absent from some manuscripts) and James's notes.
  > - Sources were Wikisource (its parse API), Gutenberg and Sefaria;
  >   sacred-texts.com refuses automated requests. Slips in a transcription
  >   are mended in code, each checked against the scan, and the build
  >   stops if one is gone (`CONYBEARE_FIXES`, `MACKEY_TITLES`).
- [x] **S4 Dossiers and symbols.** A Sub Rosa page (the cabinet): dossiers
  with tagged claims, the verses, the plates and the primary sources;
  symbols with their history. First dossiers: the "biblically accurate"
  angels, the words for hell (from the interlinear and Strong's), Lucifer
  (Isaiah 14:12 and the Vulgate), 666 or 616, Boaz and Jachin (1 Kings
  7:21), Azazel, Lilith, Legion, the witch of Endor, the Nephilim.

  > **As built:** `src/lib/dossiers.ts`, written by hand like the Studies,
  > with two shelves in the cabinet: **Dossiers** and **Symbols**.
  > - **Twelve dossiers**: the ten planned and two the brief asked for, *Why
  >   the Masons build Solomon's Temple* and *Solomon and the demons*. The
  >   words for hell are written from the texts, not drawn from the
  >   interlinear, which can wait for S5.
  > - **Eleven symbols**: the cross and crucifix, the Chi-Rho, the fish, IHS,
  >   St Peter's inverted cross, the pentagram, the inverted pentagram, the
  >   seal of Solomon, the eye of Providence, the square and compasses, and
  >   Baphomet (Lévi's plate). The rest are drawn as ornaments, dithered like
  >   the others: `crucifix`, `petrine`, `ichthys`, `pentagram`,
  >   `pentagram-inverted`, `hexagram`, `eye`, `square-compasses`
  >   (`src/art/ornaments.ts`).
  > - **Every claim is tagged** Scripture, tradition, folklore or modern
  >   invention, with a key above the list. A Scripture claim always quotes its
  >   verses (tested), in the reader's own translation; each opens in the
  >   reader. Under the claims: the plates and paintings that show it (each
  >   opens in Look), and "Read on" into a library section or a shelf passage.
  >   A test checks that every verse exists and every section is in the
  >   library.
  > - Each dossier and symbol is in the palette under the rose ("Dossier:
  >   Lucifer"). The cabinet remembers its shelf and what is open
  >   (`CabinetPlace` in the study store), so going back from a library
  >   section returns to the dossier that sent you.
  > - Dates and attributions are kept to what is well established (Irenaeus
  >   on 616, Tyndale's "scapegoat", Prichard's 1730 exposé for the Hiram
  >   legend, Taxil's confession, du Simitière's eye on the Great Seal). Where
  >   the record is unsure the dossier says "about" or "most likely".
- [x] **S5 Extras.**
  - A **Goetia bestiary**: the 72 spirits, their seals, rank and the
    *Testament of Solomon*'s demons beside them.
  - The **daily omen** in place of the verse of the day (an apocalypse verse
    or a spirit of the day).
  - A **gematria and isopsephy calculator** (rules in code), and the ELS
    "Bible codes" with their myth-busting note.
  - **Scripture or myth?**, a quiz on the FSRS scheduler (is "Lucifer" in
    the Bible, the apple, horns and pitchforks).
  - Botticelli's map of hell as an **Atlas layer**.
  - In the Lab, a small model trained on the Goetia that writes labelled
    fake spirits (generated text, always labelled).

  > **As built:**
  > - **The bestiary** is a cabinet shelf (`Bestiary.tsx`,
  >   `src/lib/bestiary.ts`). Its facts are read from the book by rule
  >   (`spiritsOf` in `scripts/data/library.mjs`, written to
  >   `public/data/bestiary.json`): ranks and seal metals from the Goetia's
  >   own table "Respective Rank", legions from each spirit's text. Parsing the
  >   prose for ranks was tried first and caught "four noble Kings" and "a
  >   goodly Knight"; the table has none of that. The seals are not cut from
  >   de Laurence's plates: Commons has a public-domain series from the 1904
  >   edition (Category:Ars Goetia sigils), one file per seal and two where the
  >   book prints two (Paimon, Beleth, Bathin, Bune, Vepar, Vual, Seere);
  >   Decarabia's comes from the 1916 reprint. `curios.mjs` keeps their ink as
  >   alpha and the app draws them through a CSS mask in the page's ink, never
  >   the accent. A spirit opens on its seal, rank, legions and metal and the
  >   Goetia's own words under "Not Scripture". Sixteen of the Testament's
  >   demons follow the 72, each at the verse where it first stands before
  >   Solomon (a test checks the verse names it); Asmodeus is the one both
  >   books share (Goetia 32, Tobit 3:8).
  > - **The daily omen** (`src/lib/omen.ts`, `Omen.tsx` on Home) alternates
  >   by day: a verse of signs and endings from a list of 33, in your
  >   translation, then a spirit of the day with its seal and first lines.
  >   Every spirit and every verse comes round within a year (tested).
  > - **Numbers** is a cabinet shelf (`Numbers.tsx`, `src/lib/gematria.ts`):
  >   standard Hebrew values, Milesian Greek, and Roman numerals for the
  >   Latin polemics, with seven worked examples whose numbers are computed
  >   (Nero Caesar 666 and 616, Iesous 888, Lateinos, Abrasax 365, YHWH 26,
  >   Vicarius Filii Dei). The Bible codes are the Lab's lesson (`Codes`),
  >   shown here as well.
  > - **Scripture or myth?** is a cabinet shelf (`Quiz.tsx`,
  >   `src/lib/quiz.ts`): 22 claims, each answered with its verses and, for a
  >   myth, its origin tag. Answers are FSRS cards (wrong is "again", right is
  >   "good") kept in the study store's `quiz`, a preference like the
  >   cabinet's place, not in the notes file.
  > - **Hell** is a fourth Atlas section under the rose (`HellMap.tsx`,
  >   `src/lib/hell.ts`): thirteen marks placed by eye on Botticelli's bands,
  >   each with a line from the canto (checked against Longfellow), the Doré
  >   plates of that canto and a link to it in the cabinet.
  > - **The Lab's spirits**: a corpus preset `goetia` in
  >   `python/biblelm/corpus.py`, the same Gutenberg book cut to the 72
  >   spirits (`goetia_spirits`, parsed as text, refusing anything but 72;
  >   about 39,000 characters). It is listed only under the rose. With it
  >   chosen, Generate offers "The Seventy-third Spirit is" and labels the
  >   output "Invented by BibleLM's model: a spirit that never was. Not the
  >   Goetia, not Scripture."; the KJV judge is hidden. Nothing in Rust
  >   changed: the corpus list comes from Python.
  > - Every new part is in the palette under the rose (the bestiary, numbers,
  >   the quiz, the map of hell).

- [x] **S6 The symbol database and the lodge.** Asked for after S5: the
  sigils dithered, many more symbols (the planetary and alchemical ones
  first), less teaching and less text, more public-domain art, and much more
  on the Masons. Researched from Wikipedia first.

  > **As built:**
  > - **Symbols** (`src/lib/symbols.ts`, moved out of `dossiers.ts`) are 74
  >   `Curio`s of kind "symbol" with `family`, `data` (label and value rows),
  >   `unicode` and `see`. A symbol may have no claims, only facts; the
  >   older eleven keep theirs. Facts are kept to what the Wikipedia articles
  >   state (the alchemical symbol, planet symbols, classical planet,
  >   astrological symbols, each occult symbol's own article, Freemasonry,
  >   the Scottish and York Rites, Royal Arch, lodge officers, Boaz and
  >   Jachin, tracing boards). The Masonic monitors' standard readings of the
  >   working tools (the gauge's three eights, the trowel's cement) fill what
  >   those articles leave out.
  > - **Drawings** are in `src/art/sigils.ts`, merged into `ORNAMENTS`. Each
  >   is drawn in ink densities like the other ornaments; `ornamentSrc(name,
  >   dark, glow)` sets it in a radial halo of ink so the dither shows as a
  >   field of dots round it (`<Ornament glow>`). The zodiac wheel uses the
  >   system's symbol font for its twelve glyphs, forced to text with U+FE0E;
  >   everything else is paths.
  > - **The seals** (`SealMark`, Bestiary.tsx) are composited on a canvas
  >   into the scheme's ink and paper with the same halo, then dithered with
  >   `Dither`, in place of the CSS mask. Baphomet's plate is dithered on the
  >   symbols shelf too.
  > - **The lodge** is a cabinet shelf (`Lodge.tsx`, `src/lib/lodge.ts`):
  >   degrees by rite and body, officers, numbers, emblems, tracing boards
  >   and charts, dates. The Scottish Rite's bodies are the Southern
  >   Jurisdiction's (Lodge of Perfection 4 to 14, Rose Croix 15 to 18,
  >   Kadosh 19 to 30, Consistory 31 and 32). Jewels and stations are the
  >   English and American usage; where they differ the table says which.
  > - **Art**: plates 2060 to 2075 and thirteen paintings in `curios.mjs`,
  >   all public domain on Commons: Bowring's three tracing boards (1819) and
  >   an anonymous set (1832, Museum of Freemasonry), four Library of
  >   Congress charts and a Fellow Craft print, Splendor Solis's seven
  >   planetary flasks (each on its planet's sheet), Maier's emblem XXI,
  >   Khunrath (laboratory, cosmic rose, the Four Three Two One, the Emerald
  >   Tablet), Dee's Monas title page, Fludd's frontispiece and Anima Mundi,
  >   and the Mutus Liber's first plate. Two become heroes: the laboratory
  >   (the symbols) and the 1846 chart (the lodge). John Harris's boards are
  >   on Commons only at 292 px and were left out; the Wellcome scans are
  >   CC BY and were left out.
  > - **Text cut**: the acknowledgement, the "Not Scripture" kickers over the
  >   library, bestiary and omen, the cabinet's subtitle and footers. The
  >   Lab's generated spirits keep a label (principle 1 of the app).

## Handoff

Where things stand for whoever picks this up next (written 26 October 2026,
after S5).

**State.** S1 to S5 are done on the branch `feat/sub-rosa`, pushed but not
merged or opened as a PR. The rite of S1 became one acknowledgement, and after
S6 none. Typecheck is clean, `pnpm test` passes (137 tests, none skipped once the data is built)
and `python -m pytest python` passes. Nothing in Rust changed.

**Where the code is.**

| Part | Files |
|---|---|
| The switch and the theme | `src/features/settings/SubRosaPanel.tsx`, `src/app/subrosa.ts`, `subRosa` in `src/app/theme.ts`, `setSubRosa` and `beforeSubRosa` in `src/store/study.ts` |
| The art | `scripts/art/curios.mjs` (writes `public/art/curios/`), `ROSE_PLATES`, `ROSE_PAGE_PAINTINGS`, `roseHero` in `src/lib/art.ts`, `useArt` in `src/art/Art.tsx`, credits in [curios-credits.md](curios-credits.md) |
| The shelf texts | `scripts/data/pseudepigrapha.mjs`, called from `build-bible.mjs`; books in `src/lib/data/books.json`; links in `src/lib/companions.ts` |
| The library | `scripts/data/library.mjs` (writes `public/data/library*`), `src/lib/library.ts` |
| Dossiers and symbols | `src/lib/dossiers.ts`, `src/lib/symbols.ts`; drawings in `src/art/sigils.ts` and `src/art/ornaments.ts`; `Symbols.tsx`, `Claims.tsx` |
| The lodge | `src/lib/lodge.ts`, `Lodge.tsx` |
| Bestiary, numbers, quiz | `src/lib/bestiary.ts`, `src/lib/gematria.ts`, `src/lib/quiz.ts`; `Bestiary.tsx`, `Numbers.tsx`, `Quiz.tsx` in `src/features/cabinet`; seals in `SEALS` in `scripts/art/curios.mjs` |
| The omen and the map of hell | `src/lib/omen.ts`, `src/features/home/Omen.tsx`; `src/lib/hell.ts`, `src/features/atlas/HellMap.tsx` |
| The Lab's spirits | `goetia` in `PRESETS` and `goetia_spirits` in `python/biblelm/corpus.py`; `GOETIA_CORPUS` in `src/lib/backend.ts`; labels in `InferenceView.tsx` |
| The cabinet page | `src/features/cabinet/CabinetView.tsx`; page `cabinet` and its nav item and palette commands in `src/app/App.tsx`; `cabinet` (a `CabinetPlace`) in the study store |
| Tests | `dossiers.test.ts`, `bestiary.test.ts`, `omen.test.ts`, `gematria.test.ts`, `quiz.test.ts`, `companions.test.ts`, `art.test.ts` in `src/lib`; `src/store/study.test.ts`; `scripts/data/pseudepigrapha.test.mjs`; `python/tests/test_corpus.py` |

**Rebuilding the data.** Every output is git-ignored, so a fresh clone needs
`pnpm data`. After a change to the shelf texts run, in order,
`pnpm data:bible`, `node scripts/data/graph.mjs` and `pnpm data:embed`
(about ten minutes at low priority on this laptop): the verse index grows,
and the communities, embeddings and map are sized to it, so a stale one
breaks meaning search. `pnpm data:library` rebuilds the library alone, and
`node scripts/art/curios.mjs --process` re-cuts the art from its cache.

**Sources and their quirks.**

- sacred-texts.com refuses automated requests; don't plan on it.
- Wikisource is read through its parse API (`wikisource`, `htmlParas` in
  `scripts/data/lib.mjs`). It rate-limits a burst of pages; `cached` waits
  and retries on 429 and 503. Wikimedia wants a user agent with contact
  details, and the one in `lib.mjs` has them.
- Every Commons file must be tagged public domain or CC0, or `curios.mjs`
  refuses it. Several paintings hang in Italian state museums, which limit
  commercial reproduction there; the credits file flags them.
- Transcription slips are mended in code and checked against the scan
  (`CONYBEARE_FIXES`, `MACKEY_TITLES`); the build stops if one is gone, so
  an upstream correction shows up as a failure to remove the fix.

**Testing it by hand.** In a browser (`pnpm dev`), Settings or the palette's
"Go under the rose" turns it on; it can also be set in the console:

```js
const k = "biblelm:study", s = JSON.parse(localStorage.getItem(k) || "{}");
s.beforeSubRosa = { shelves: s.shelves || ["protestant"], themeId: "scriptorium", mode: "light" };
s.subRosa = true; s.shelves = ["protestant", "deuterocanon", "apocrypha", "pseudepigrapha"];
localStorage.setItem(k, JSON.stringify(s)); location.reload();
```

Set `subRosa` back to false and `shelves` to `beforeSubRosa.shelves` to come
out. Under the rose: the cabinet is in the sidebar after Notebooks, Tobit 3
shows Asmodeus beside verse 8, Testament of Solomon 1:24 links to Tobit 3:8,
every dossier is in the palette, the cabinet has eight shelves, and the Atlas
has Hell. A hidden browser pane throttles animation, so a blank screenshot is
not a bug.

**Rules to keep.**

- A text with its own verse numbers reads in the Bible on the Pseudepigrapha
  shelf; a text without them reads in the library, under "Not Scripture",
  never in the Bible's reader.
- Every dossier claim is tagged, and a Scripture claim quotes its verses;
  the tests enforce both, and the absence of em dashes.
- The Goetia's rite (the circle, the conjurations, the licence to depart)
  stays out of the app: a history, not a how-to.
- Sub Rosa fetches nothing of its own while it is off.
- Under the rose the sidebar vignette hides below 800 px of window height
  (`styles.css`), because the rose's plates are inked to their top edge.

**Still open.** The words-for-hell dossier could take its counts from the
interlinear and Strong's. The Ascension of Isaiah still has no clean
public-domain text. The hell map's marks are placed by eye; if a band is
read differently, move its `x` and `y` in `src/lib/hell.ts`.

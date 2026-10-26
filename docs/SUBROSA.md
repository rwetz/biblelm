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
3. **A history, not a how-to.** The grimoires are shown as the historical
   texts they are, read and illustrated, with their history; the mode adds no
   instructions of its own.
4. **Off by default, one click out.** Nothing of the mode shows until it is
   on; the rest of the app is unchanged.

## Turning it on: the rite

Settings, Sub Rosa (`SubRosaPanel` in `src/features/settings`). The switch
opens three steps in the order a book once passed to be printed:

1. **Nihil obstat** ("nothing stands in the way", the censor's line): swear
   to four oaths ("I have consulted my pastor, my mother and at least one
   Jesuit", "a picture of a demon is not a demon", and so on).
2. **Imprimatur** ("let it be printed", the bishop's): press and hold a seal
   for 2.4 s (pointer, Space or Enter) while the cross in it turns over.
   Letting go early lets it fall back.
3. **Retro me, Satana** (Mark 8:33 in the Vulgate): type the words, without
   minding case or punctuation (`saidTheWords`).

Coming out is the same switch, one click, and a toast: "Welcome back. Nobody
saw anything." The palette has "Come out from under the rose" while it is on;
going under is done only through the rite.

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

- [x] **S1 The switch.** Rite, theme, shelves on and restored, hanging rose,
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
- [ ] **S4 Dossiers and symbols.** A Sub Rosa page (the cabinet): dossiers
  with tagged claims, the verses, the plates and the primary sources;
  symbols with their history. First dossiers: the "biblically accurate"
  angels, the words for hell (from the interlinear and Strong's), Lucifer
  (Isaiah 14:12 and the Vulgate), 666 or 616, Boaz and Jachin (1 Kings
  7:21), Azazel, Lilith, Legion, the witch of Endor, the Nephilim.
- [ ] **S5 Extras.**
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

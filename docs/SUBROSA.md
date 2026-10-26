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
- [ ] **S2 Dark art.** `scripts/art/curios.mjs`, built like `paintings.mjs`
  (Wikimedia Commons PD-Art files; museum CC0 scans where they exist), with
  credits. While the mode is on, `PAGE_PLATES`, `SIDEBAR_PLATES`, the heroes
  and the painting of the day draw from this set:
  - Doré's *Inferno* (1861) and *Paradise Lost* (1866) plates, the engraved
    tier in place of his Bible;
  - Bosch (*Garden of Earthly Delights*, the Vienna *Last Judgment*,
    *Visions of the Hereafter*), Bruegel (*Fall of the Rebel Angels*,
    *Dulle Griet*), Signorelli's damned at Orvieto, Memling's *Last
    Judgment*, Michelangelo's *Last Judgment*, Fra Angelico, Giotto's hell
    in the Scrovegni Chapel, Lochner;
  - Blake (*The Great Red Dragon* series, Job's *Behemoth and Leviathan*,
    his Dante), John Martin (*Pandemonium*), Fuseli;
  - Botticelli's *Map of Hell*; the Codex Gigas devil; the *Hortus
    deliciarum* hell; Louis Le Breton's engravings for Collin de Plancy's
    *Dictionnaire infernal* (1863); Lévi's Baphomet (1856).
- [ ] **S3 Texts.** Plain-text importers (parsed as text, never executed),
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

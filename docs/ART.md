# Art direction

The look: **an illustrated Bible on a screen.** Engravings and woodcuts,
dithered to one bit and tinted by the theme, sitting in the margins the way
plates and ornaments sit in an old printed Bible. Reference: Zeron's dithered
sky behind its prompt box, Gustave Doré's engravings, and the woodcut plates in
illustrated study Bibles.

## Rules

1. **Public domain only, provenance recorded.** Every image has a row in
   `public/art/CREDITS.md`: title, artist, year, source URL, licence tag. A
   photograph of a 2D public-domain work is public domain in the US; still
   record the source.
2. **Art never sits under text that must be read.** Behind a verse, art is at
   most 8% opacity or masked away under the text column.
3. **Art is tinted by tokens, never coloured.** Images are 1-bit PNGs with
   alpha, drawn as a CSS `mask-image` filled with `--foreground` or
   `--muted-foreground`. They follow all themes for free. Never `brand`:
   the accent marks actions, not decoration.
4. **Art follows the passage, not the mood.** Pick a scene because of what
   the page is for (see placement), not because it looks dramatic.
5. **Restraint with the demonic.** Rebel angels and the dragon belong to
   Revelation, the Fall, and error/empty states; never on the notebook or
   on prayer and comfort passages.
6. **Off switch.** Settings → Appearance → Illustrations: Full / Margins only /
   Off. `prefers-reduced-motion` disables all art animation.
7. **Label non-scripture sources.** Doré's *Paradise Lost* and Dante plates
   are Milton and Dante, not the Bible. Fine as decoration; the credits say so.

## Sources

| Artist | Work | Why | Where |
|---|---|---|---|
| Gustave Doré | *La Grande Bible de Tours* (1866), about 240 plates | The core of the look. Dense engraving, huge contrast, angels and crowds. Dithers beautifully. | Wikimedia Commons "Doré Bible" category; Project Gutenberg's *The Doré Bible Gallery* |
| Gustave Doré | *Paradise Lost* (1866), *Divine Comedy* | The fall of the rebel angels (your second image), Michael, the heavenly host. Decoration only, labelled. | Wikimedia Commons |
| Albrecht Dürer | *Apocalypse* woodcuts (1498) | Four Horsemen, St Michael fighting the dragon, the seven trumpets. Gothic, pairs perfectly with blackletter. | Wikimedia Commons, The Met Open Access (CC0) |
| Albrecht Dürer | *St Jerome in His Study* (1514) | A scholar translating Scripture at his desk: the notebook page. | The Met Open Access (CC0) |
| Julius Schnorr von Carolsfeld | *Die Bibel in Bildern* (1860), 240 woodcuts | Clean outlines, every major narrative. Best for small corner vignettes because they stay legible small. | Wikimedia Commons |
| Lucas Cranach workshop | Luther Bible woodcuts (1534) | Period-correct blackletter-era illustration, decorated initials. | Wikimedia Commons |
| Hartmann Schedel | *Nuremberg Chronicle* (1493) | Creation roundels, city views, borders. Ornament source. | Wikimedia Commons |
| William Blake | *Illustrations of the Book of Job* (1826) engravings | Job and the morning stars, the whirlwind. Distinct, mystical. | Wikimedia Commons, Tate/Met scans |

The Met (CC0) and Wikimedia (tagged PD) are the two sources to trust. Avoid
museum scans with "all rights reserved" on the photograph even when the work is
old.

## Placement: three tiers

Every page carries some art. The main pages carry a lot.

### Tier 1: hero (Home, Read landing, Lab landing)

Zeron's layout: a full-bleed dithered scene in the top 60% of the window,
fading into the page background through a vertical gradient mask, with the
primary control (search box or verse of the day) floating over the fade.

| Page | Scene | Why |
|---|---|---|
| Home | Doré, *The Creation of Light* or *Jacob's Ladder* | Light breaking through, a ladder between heaven and earth: a doorway |
| Home (rotating) | One plate per liturgical season (Advent: *The Annunciation*; Lent: *Christ in the Wilderness*; Easter: *The Resurrection*; Pentecost: *The Descent of the Spirit*) | The app quietly changes with the church year |
| Read landing | Doré, *The Vision of Ezekiel* or *The Last Supper*, chosen by the book you last read | Art follows the text |
| Lab landing | Doré, *The Confusion of Tongues* (Babel) | Language, tokens, many tongues: the honest emblem of a language model, and a warning about building towers |

### Tier 2: plates (every secondary page)

A corner vignette, 18 to 25% of the page width, anchored bottom-right or
top-right, masked with a soft radial edge. Static, low contrast.

| Page | Plate |
|---|---|
| Search / concordance | Schnorr, *Jacob's Ladder* (searching between heaven and earth) |
| Notebook | Dürer, *St Jerome in His Study* |
| Translations / compare | Doré, *The Confusion of Tongues*, or Pentecost tongues of fire |
| Apocrypha shelf | Doré, *Tobias and the Angel* (Raphael, Book of Tobit) |
| Topics / map | Dürer, *Apocalypse*: *St John before God and the Elders* |
| Training | Doré, *Ezekiel's Vision* (wheels within wheels: the machine) |
| Model import/export | Schnorr, *Moses with the Tablets* (the artifact you carry down) |
| Settings | Nuremberg Chronicle border ornament only |

### Tier 3: ornament (inline, everywhere)

- **Evangelist symbols** at the head of each Gospel: Matthew the man/angel, Mark
  the lion (like the Mark page in your third image), Luke the ox, John the eagle.
- **Drop caps** at each chapter start: a blackletter initial over a tiny dithered
  plate cut from that book's art.
- **Headpieces and tailpieces** between books, fleurons between sections.
- **Empty states** use a spot illustration: an empty notebook shows Jerome's
  lion asleep; "no results" shows a single Schnorr figure searching.
- **Errors** (training crashed, file corrupt): a small Dürer dragon. This is
  the one place the demonic is playful.

## Dithering pipeline

Offline, scripted, reproducible: `scripts/art/dither.py` (or a small Rust
bin), source scans in `art-src/` (git-ignored, large), outputs committed in
`public/art/`.

1. Grayscale, crop, resize to the target (hero 1600 px wide, plate 600 px,
   ornament 160 px). Dither at the size it will be shown: never scale a
   dithered image, it turns to mush.
2. Levels / CLAHE so engraving lines survive.
3. Dither. Offer three algorithms and pick per image:
   - **Atkinson** (classic Mac): loses 25% of error, so highlights blow out
     to clean white. Best for heroes, closest to Zeron.
   - **Bayer 8x8 ordered**: a visible crosshatch grid, very "printed". Best for
     plates and drop caps.
   - **Blue-noise threshold** (void-and-cluster mask): no pattern artefacts,
     the most organic. Best for faces.
4. Write 1-bit PNG with alpha (ink = opaque, paper = transparent). A hero is
   typically 40 to 120 KB.
5. Append a CREDITS row.

### Animation (Nexis motion vocabulary)

Motion marks events, so art moves only when something happens:

- **Illumination reveal** on page enter: a WebGL or canvas shader thresholds the
  *continuous-tone* source against the dither matrix with a threshold that sweeps
  from 0 to 1 over about 900 ms, so the picture "resolves" dot by dot. Pairs with
  `SceneEnter`.
- **Breathing light** on the Home hero only: a slow drift of the threshold
  (plus or minus 3%) under the bright regions, about 12 s per cycle. Off under
  reduced motion.
- **Training**: the Ezekiel plate's dither threshold tracks validation loss, so
  the picture literally sharpens as the model learns. Live data does not tween
  (Nexis rule): update once per eval, no easing.

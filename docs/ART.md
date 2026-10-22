# Art direction

The look: **an illustrated Bible on a screen.** Engravings and woodcuts,
dithered to one bit and tinted by the theme, sitting in the margins the way
plates and ornaments sit in an old printed Bible. Reference: Zeron's dithered
sky behind its prompt box, Gustave Doré's engravings, and the woodcut plates in
illustrated study Bibles.

> **As built (2.0):** all 241 plates of the 1866 Bible are in, each tied to
> its verse and set beside it in the reader (deuterocanon plates appear only on
> that shelf). Plates are **not** dithered and **not** tinted masks: a tint mask
> turned Doré's many night scenes into glowing negatives in dark mode. They are
> positive grayscale engravings, multiplied into the parchment on Vellum and
> shown as a dim, lamp-lit page on Nocturne; only faint corner plates invert in
> the dark. Dithering is used for the hero tier only (11 heroes; the reveal is
> canvas-drawn and, in dark mode, lights the paper dots instead of the ink).
> Plates are 1000 px single-channel JPEG (hatching defeats AVIF and WebP), 40 MB
> for all 241. Provenance: [art-credits.md](art-credits.md).
>
> **As built (2.0, second pass):** dithering now happens live, in the webview,
> at exactly the size the art is drawn (`src/art/dither.ts`, `<Dither>`), so dots
> stay square on any window and display scale. Heroes ship a grayscale "tone"
> JPEG (`scripts/art/heroes.mjs`, 1200 px) beside the 1-bit PNG; Home frames
> its hero in a centred window up to 84rem wide so more of the plate shows.
> Small art is dithered too: corner plates (behind the page, never over it),
> a sidebar vignette that follows what you are reading (`src/art/SidebarArt.tsx`)
> and empty-state spots (`<ArtSpot>`). Plates beside the text are still
> engravings, and only in the chapter they depict (no borrowing the nearest
> plate from another chapter). Long work shows `<CrossLoader>`, a cross that
> gathers out of Bayer dots.
>
> **As built (third pass):** the Lab takes its heroes from beside the Bible,
> Doré's Paradise Lost and Ancient Mariner (`scripts/art/literary.mjs`, credits
> in art-credits.md), turning every 30 seconds; each plate's tones are bent to
> one average so the dark night plates dither with the same weight. Sigils
> (`src/art/Sigil.tsx`) are the first drawn art: small vector emblems,
> shaded and dithered like the plates, that show a reading's confidence by
> how far they have formed.
>
> **As built (sharper plates):** 44 of the Commons files in Wikipedia's list
> were small copies (330 to 750 px), so their plates looked soft. 42 now come
> from larger public-domain scans (`BETTER` in `scripts/art/dore.mjs`): the OT
> ones from the "Doré's English Bible" series, the NT ones cropped from Polona's
> page scans of Warsaw editions printed from Doré's blocks (1874, 1892, 1930).
> *The Dumb Man Possessed* and *Death of Ananias* have no larger scan on
> Commons and stay small.

> **As built (paintings and partial dithering):** heroes no longer dither the
> whole picture. `src/art/painting.ts` keeps the original at full resolution
> where the picture is whole and lays dots over it only where it gives way:
> the edges that dissolve into the page (a band of mixed cells, thinning to
> nothing), a little grain, and in a dark painting its darkest ground. That is
> the Zeron look: a painting, partly dotted. A colour painting keeps its colour
> and its dots are its own colour at a few levels of light (the brightness is
> ordered-dithered, the hue kept; the darkest cells take the painting's mean
> umber, since their hue is scan noise). A print (Doré, or a Rembrandt etching)
> is drawn as a positive in the theme's ink on the page, light staying light
> in the dark schemes. The reveal goes brightest first, so the light seems to
> fall into the scene. `heroes.mjs` and `literary.mjs` now also write each
> engraving untouched (`-src.jpg`, resized only) for this; the levelled tone
> files stay for the small, fully dithered art (corner plates, spots, sigils,
> the Lab's frontispiece).
>
> **25 paintings** (`scripts/art/paintings.mjs`, credits in
> [painting-credits.md](painting-credits.md)): the thirteen Caravaggios (The
> Calling of Saint Matthew, Supper at Emmaus, The Taking of Christ, The
> Incredulity of Saint Thomas, The Conversion on the Way to Damascus, The
> Sacrifice of Isaac, David with the Head of Goliath, The Raising of Lazarus,
> The Entombment, The Denial of Saint Peter, The Seven Works of Mercy, Judith
> Beheading Holofernes, Saint Jerome Writing), ten Rembrandts (two of them
> etchings) and one each by Honthorst and Georges de La Tour. They are kept
> exactly as painted (resized only). Each records whether it is in colour (by
> the spread of its chroma, so an etching's warm paper does not count), how
> dark it is, and where its light falls, which becomes the focus of every crop.
> A painting is a hero-tier picture: it opens the chapter it depicts as a
> frontispiece above the title (Matthew 26 has three, in turn), never sits
> between verses (those are Doré's engravings), and appears in Look, the
> Gallery, the verse panel's "Seen in art", Daily, the Topics header (The
> Seven Works of Mercy), the empty Notebooks page (Saint Jerome) and, in
> Tenebrae, on Home. Hero bands with words over them always use a painting in
> colour: an etching's bright paper would sit under the text.
>
> The Rembrandts worked: his light behaves like Caravaggio's under the dots.
> The two etchings work as prints in Look and the Gallery but not as hero
> bands. Tissot's watercolours were left out: the Brooklyn Museum's rights for
> its scans could not be confirmed.

> **As built (heroes, revisited):** Doré heroes went back to being dithered
> whole (`Dither`, Atkinson unless the hero names Bayer or blue noise), at a
> finer 1.5 px dot: the full one-bit look reads better on the engravings than
> partial dithering did. Partial dithering stays for the paintings, and how
> much of a painting's dark ground turns to dots now follows how much of the
> canvas is near black (`dark` in paintings.json, `paintingShadow`): up to 0.45
> for Caravaggio's black grounds, none for the bright Rembrandts.

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

> **As built (ornaments):** twelve ornaments are drawn by hand as SVG in
> shades of gray (`src/art/ornaments.ts`) and dithered live by `Dither` at
> their drawn size, through `<Ornament name>`: fleuron, vine headpiece (a
> book's first chapter), urn tailpiece (its last), Chi-Rho, IHS, the divine
> name, a budded cross, compass rose (Atlas), Ezekiel's wheels, sun and lamp
> (Morning and Evening on Daily), quill (an empty notebook). Each is drawn in
> ink densities, flipped for dark schemes so Dither's lit dots still draw the
> figure. Developer mode in Settings shows them all. The evangelist symbols,
> the sleeping lion and the dragon are figures, not ornament: they will be
> cut from public-domain woodcuts instead (below).
>
> **As built (woodcuts, M19):** the other masters arrive through
> `scripts/art/woodcuts.mjs`, which takes only Wikimedia Commons files tagged
> public domain or museum scans released as CC0 (the Met, the Rijksmuseum, the
> Yale Center for British Art), checks each file's licence when it fetches it,
> and refuses anything else; credits in [woodcut-credits.md](woodcut-credits.md).
> They load as plates numbered from 1001 (`loadPlates`), so captions name the
> real artist (`plateCredit`) and the reader sets the Apocalypse woodcuts in
> Revelation 4 and 12 and Blake's morning stars in Job 38. Placement now
> follows the plan: Schnorr's Jacob's Dream on Search and Moses receiving the
> tablets on Model; Dürer's St Jerome on Notebooks and St John before the
> Elders on Topics; the Nuremberg Chronicle's creation roundel on Settings
> with the 1534 Luther Bible's title page (Cranach's workshop) beside it. Tier 3:
> each Gospel opens with its evangelist and his symbol (a sixteenth-century
> set at the Rijksmuseum; the Book of Kells page was passed over because a
> dithered illumination turns to mud); every chapter's initial sits over a
> tiny dither of its book's first plate (`VerseText` `capArt`); an empty
> notebook shows Jerome's lion asleep, cut from Dürer's engraving; a search
> with no results shows Schnorr's Abraham counting the stars; a page that
> crashes shows Dürer's St Michael and the dragon. Cranach's initials were
> not needed: the drop caps take their art from each book's own plates.
>
> **The trinity mark** on Home (`src/art/TrinityMark.tsx`) is the one piece
> of live colour: the knot's distance field lit by a WebGL2 glow in the
> scheme's paper, rubric and gilt. Material adapted from Shaders.com by Shader
> Effects Inc., MIT License, https://github.com/shader-effects-inc/shaders.
> It holds still when motion is reduced and stops drawing off screen.
>
> **The rose mark** in Settings, About (`src/art/RoseMark.tsx`): the rose
> window and heptagram cut as a CSS mask over slow waves of ordered dither in
> the scheme's accent, stirred by the pointer. A 2D canvas, so no WebGL or
> three.js; the same reduced-motion and off-screen rules.
>
> **The lit rose** beside the Lab's title (`src/art/LitRose.tsx`): the rose
> window as dark metal, with a rubric and a gilt light circling it, glinting on
> the bevels and casting a glow the tracery shadows. Same shader source and
> licence as the trinity mark; both share the distance field and WebGL loop in
> `src/art/sdfMark.ts`.

> **As built (ornaments, round two):** the four evangelists' emblems (the
> winged man, the lion, the ox, the eagle) are drawn by hand like the rest and
> stand beside every Gospel chapter's number; the woodcut roundels still head
> chapter 1. Each page has an ornament (`PAGE_ORNAMENT` in `SidebarArt.tsx`),
> shown beside its title and large in the sidebar between the nav and the
> vignette, where each change of page dissolves one and resolves the next.
> The palette's groups, the Lab's rooms and the timeline's eras carry them
> too. Settings, Ornaments turns every ornament off (study preference
> `ornaments`).

> **As built (angels):** the seraphim and ophanim, from public-domain sources
> and drawn by hand. Woodcuts: Matthäus Merian's *Vision of Ezekiel* (1630) as
> a plate in Ezekiel 1 and the Lab's sidebar picture, with its wheel full of
> eyes and its four-faced living creature cut out as spots; a winged-heads
> roundel after a fifteenth-century Italian woodcut (Didron). Ornaments: a
> six-winged seraph (Isaiah 6:2), the winged eye (Revelation 4:6-8) and an
> ophan, rings within rings full of eyes (Ezekiel 1:16-18). The Lab's rooms
> take them: Training the ophan, Generate the seraph, Inside the winged eye.
> The Lab's mark beside its title is now the dithered rose (`RoseMark`), and
> its front page shows the translations and the alphabet under the title.
> A page's views are numbered sections everywhere (`src/app/Sections.tsx`):
> the Lab, Topics, the Atlas, the Gallery.

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

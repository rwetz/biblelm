# Design

BibleLM moves onto **@nexis/design** (tokens, themes, motion, chrome,
command palette) and adds a scriptorium layer on top: Bible typography,
illustrations ([ART.md](ART.md)) and two themes of its own. Epoch is the
family reference for how a finished app feels.

## Adopting @nexis/design

Read `nexis-suite/nexis-design/AGENTS.md`; its rules are binding here. The
ones that change the current code most:

- Replace `src/components/ui/*` (shadcn copy) with package components.
- Replace Hugeicons with `<Icon name>`; add missing names upstream.
- Providers once at the root (`LazyMotion`, `ThemeProvider storageKey="biblelm"`,
  `TooltipProvider`, `Toaster`).
- `CommandPalette` on Mod+Shift+P exposing every action (go to reference, new
  note, switch translation, toggle illustrations, start training).
- `SidebarNav` for navigation, `ViewEnter` on page switch, `CallChip` for a
  training run, `StatusBar` for facts (translation, verse count, device).
- Parallel translations use **dockview** (as Epoch does).
- No em dashes in any user-facing text.

## Themes

Two new themes registered with the Nexis theme engine:

| Theme | Mode | Background | Ink | Accent (`brand`) |
|---|---|---|---|---|
| **Vellum** | light | warm parchment, oklch(0.96 0.02 85) | iron-gall brown-black | rubric red, oklch(0.52 0.17 28) |
| **Nocturne** | dark | lamp-black, oklch(0.16 0.01 60) | bone, oklch(0.90 0.02 85) | gilt, oklch(0.78 0.13 80) |

Rubric red as the accent is historically right: medieval scribes "rubricated"
headings and initials in red. It also fits the one-accent rule: red marks the
current verse, the selected note and the primary action.

Optional: a faint paper texture (noise at 3% opacity) on Vellum only.

> **As built (Tenebrae):** a third scheme for the paintings, its own theme
> (`tenebrae` in `src/app/theme.ts`) rather than a third mode: Caravaggio's
> black ground `#0b0907`, lead-white text `#efe6d3`, and his vermilion
> `#d9603f` as the one accent. Vellum and Nocturne are unchanged. The title
> bar's button steps Vellum, Nocturne, Tenebrae (`useScheme` in
> `src/app/scheme.ts`); Settings and the command palette offer all three. In
> Tenebrae, Home opens on the day's painting instead of a Doré plate. Its light
> variant (gesso and umber) is reached only by forcing light while in it.

## Typography

| Use | Face | Licence | Notes |
|---|---|---|---|
| Book titles, chapter numbers, drop caps, hero verse | **UnifrakturMaguntia** | OFL (Google Fonts) | True textura blackletter. Display only, 28 px and up. |
| Same, when readability matters more | **Grenze Gotisch** (variable) | OFL | Blackletter shapes, modern legibility; good at 18 to 24 px. |
| Verse text (reading view) | **EB Garamond** or **IM Fell English** | OFL | Fell types are real 17th-century English faces, period-matched to the KJV. |
| UI chrome | Geist (Nexis default) | OFL | Unchanged. |
| References, Strong's numbers, code | Geist Mono / JetBrains Mono | OFL | `tabular-nums`. |

**When blackletter is appropriate:** headings, the verse of the day, a verse
"plate" you export as an image, drop caps, and an opt-in "Gothic reading" mode.
**Not** for body text by default: full blackletter paragraphs are slow to read
and hurt study.

Reading view details:

- Verse numbers as superscripts in rubric red.
- Optional red-letter words of Christ (needs a translation with markup; the
  WEB on eBible.org has it).
- Two-column layout above 1100 px, like a printed Bible, with the plate in the
  gutter.
- Hanging punctuation, `text-wrap: pretty`, 62 to 72 characters per line.

## The BibleLM language (draft)

Nexis gives the components; this is what makes them BibleLM. One idea runs
through it: **an illustrated Bible printed in one ink, where the machine's
work shows only as how clearly things come into focus.**

### Materials

- **Paper and ink.** Vellum is paper with black-brown ink; Nocturne is the same
  page by lamplight. Pictures are one-bit dots in the ink colour, dithered live
  at their drawn size (`src/art/dither.ts`). Nothing is blurred, tinted or
  photographic; an edge breaks up into scattered dots (`fadeEdges`).
- **Rubric.** One accent, used as a scribe used red: references, the words of
  Christ, the one action that matters on a screen. Never on art.
- **Type.** Blackletter for big titles, book names and drop caps; Garamond for
  Scripture, figures a person reads (`91 hours`, `1,494 pages`) and captions;
  the sans for controls. Numbers worth feeling are set large in Garamond with a
  small italic unit, never in a stat tile.

### Confidence is clarity

The machine never speaks in numbers, timings or its own name. What it is sure
of is drawn as how far a picture has formed:

- **Sigils** (`src/art/Sigil.tsx`): small emblems drawn as vectors, shaded,
  then dithered like the plates. A reading's probability is how many of the
  sigil's dots are placed, filled in Bayer order so a half-formed sigil is
  evenly faint, not half drawn. The set: book (exact words), lamp (a theme),
  crook (a story or person), key (a question), scroll, dove, laurel, sword.
- **Lens plates**: on Search the plate beside the results resolves as far as the
  reading is sure (`level` on `<Dither>`).
- **Order, not scores.** Ranked lists move into the machine's order (FLIP,
  `src/lib/flip.ts`); a quiet row of dots is the most a score may show.

### Motion

Things arrive dot by dot (the Bayer reveal) and rearrange by sliding. Pictures
that rotate (the Lab's literary plates, every 30 s) resolve in rather than
cross-fade. Reduced motion shows the end state.

### Pictures by place

Home follows the church year with Doré's Bible; the Lab, the study of the
machine, takes its pictures from beside the Bible (Doré's Milton and
Coleridge, `scripts/art/literary.mjs`); each page has a corner plate and the
sidebar a vignette; empty states get an `ArtSpot`. A plate beside its own
passage is the one place art appears as a positive engraving, undithered.

### Still to decide

- A sigil for each verse kind (narrative, law, praise, lament, prophecy,
  teaching, prayer, list), so the verse panel's reading can be an emblem too.
- Whether ornaments (laurel borders, rules, fleurons) should come from scanned
  public-domain printers' ornaments rather than drawn vectors.
- A display face to pair with the blackletter for mid-size headings.

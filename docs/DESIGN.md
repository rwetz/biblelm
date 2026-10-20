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

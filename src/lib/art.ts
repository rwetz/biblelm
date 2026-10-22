// The Doré plates (scripts/art/dore.mjs), the woodcuts and engravings of
// other masters (scripts/art/woodcuts.mjs: Dürer, Schnorr, Blake, the
// Nuremberg Chronicle, numbered from 1001) and the dithered heroes
// (scripts/art/heroes.mjs). A plate knows the passage it depicts, so the
// reader can set it beside that verse and every page can pick art that fits
// what the page is for (docs/ART.md).

import { BOOKS, type Ref } from "./canon";

export interface PlateImage {
  file: string;
  width: number;
  height: number;
  /** Folder under public/art: "dore" when unset, "woodcuts" for the others. */
  dir?: string;
}

export interface Plate {
  n: number;
  id: string;
  title: string;
  alt?: string;
  refText: string;
  ref: Ref | null;
  section: "ot" | "deutero" | "nt";
  source: string;
  full: PlateImage;
  thumb: PlateImage;
  /** Set for every plate not by Doré. */
  artist?: string;
  year?: string;
  licence?: string;
  /** An evangelist's portrait: the Gospel it heads. */
  book?: string;
  /** Where the app uses a woodcut (woodcuts.mjs). */
  role?: string;
}

export interface Hero {
  id: string;
  plate: string;
  title: string;
  file: string;
  /** Grayscale source, dithered live at the drawn size (src/art/dither.ts). */
  tone?: string;
  /** The engraving as printed (no levels or gamma), for partial dithering (src/art/painting.ts). */
  src?: string;
  algo?: "atkinson" | "bayer" | "blue";
  width: number;
  height: number;
  /** The Lab's literary plates: the poem it illustrates and where its weight sits. */
  work?: string;
  focusY?: number;
}

const BASE = `${import.meta.env.BASE_URL}art`;
export const plateUrl = (img: PlateImage) => `${BASE}/${img.dir ?? "dore"}/${img.file}`;
/** Who made a plate, for its caption. */
export const plateCredit = (p: Plate) => (p.artist ? `${p.artist}, ${p.year}` : "Gustave Doré, 1866");
const json = <T,>(url: string): Promise<T[]> =>
  fetch(url)
    .then((r) => (r.ok ? (r.json() as Promise<T[]>) : []))
    .catch(() => []);
export const heroUrl = (h: Hero) => `${BASE}/heroes/${h.tone ?? h.file}`;
/** The untouched engraving behind a hero, falling back to the levelled tone. */
export const heroSrcUrl = (h: Hero) => `${BASE}/heroes/${h.src ?? h.tone ?? h.file}`;

let plates: Promise<Plate[]> | null = null;
let heroes: Promise<Hero[]> | null = null;

export function loadPlates(): Promise<Plate[]> {
  plates ??= Promise.all([json<Plate>(`${BASE}/dore/plates.json`), json<Plate>(`${BASE}/woodcuts/woodcuts.json`)]).then(([d, w]) => [...d, ...w]);
  return plates;
}

export function loadHeroes(): Promise<Hero[]> {
  heroes ??= fetch(`${BASE}/heroes/heroes.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Hero[]>) : []))
    .catch(() => []);
  return heroes;
}

let literary: Promise<Hero[]> | null = null;

/** The Lab's heroes (scripts/art/literary.mjs): Doré's Milton and Coleridge. */
export function loadLiterary(): Promise<Hero[]> {
  literary ??= fetch(`${BASE}/heroes/literary.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Hero[]>) : []))
    .catch(() => []);
  return literary;
}

/** Which of a rotating set shows now: the same for every view, turning every `ms`. */
export function rotation(n: number, ms: number, now = Date.now()): number {
  return n ? Math.floor(now / ms) % n : 0;
}

/** The evangelist's portrait that heads a Gospel. */
export const evangelistFor = (all: Plate[], book: string) => all.find((p) => p.role === "Gospel head" && p.book === book);

export function platesInChapter(all: Plate[], book: string, chapter: number): Plate[] {
  return all.filter((p) => p.ref?.book === book && p.ref.chapter === chapter).sort((a, b) => (a.ref!.verse ?? 0) - (b.ref!.verse ?? 0));
}

export function plateById(all: Plate[], id: string | undefined): Plate | undefined {
  return id ? all.find((p) => p.id === id) : undefined;
}

/** The plates for a book, for a book's landing or a notebook cover picker. */
export function platesInBook(all: Plate[], book: string): Plate[] {
  return all.filter((p) => p.ref?.book === book);
}

/** Tier 2: the corner plate for each page (docs/ART.md, Placement). */
export const PAGE_PLATES: Record<string, number> = {
  search: 1001, // Schnorr, Jacob's Dream: searching between heaven and earth
  topics: 1006, // Dürer, St John before God and the Elders
  notebooks: 1004, // Dürer, St Jerome in His Study: the scholar translating
  apocrypha: 140, // Tobias and the Angel
  translations: 10, // The Confusion of Tongues
  training: 128, // Ezekiel Prophesying
  model: 1003, // Schnorr, Moses receives the tablets: the artifact you carry down
  settings: 1009, // The Nuremberg Chronicle's creation of the world
  empty: 93, // Elijah nourished by an angel
  noResults: 1002, // Schnorr, Abraham told to count the stars
  notebookEmpty: 1005, // Dürer, Jerome's lion asleep
  error: 1007, // Dürer, St Michael fighting the dragon
};

/** The sidebar vignette on pages that already carry a corner plate, so the two never repeat. */
export const SIDEBAR_PLATES: Record<string, number> = {
  search: 205, // The Return of the Prodigal Son: "was lost, and is found"
  topics: 225, // The Apostles Preaching the Gospel
  notebooks: 157, // Baruch
  lab: 1015, // Merian, Ezekiel's vision: the wheels full of eyes, the living creatures
  settings: 1010, // The 1534 Luther Bible's title page, Cranach's workshop
};

export const plateNumber =(all: Plate[], n: number) => all.find((p) => p.n === n);

/** Tier 1: which hero to show on Home, following the church year. */
export function seasonalHero(heroesList: Hero[], date = new Date()): Hero | undefined {
  const by = (plate: string) => heroesList.find((h) => h.plate === plate);
  const y = date.getFullYear();
  const easter = easterSunday(y);
  const day = (d: Date) => Math.floor(d.getTime() / 86_400_000);
  const t = day(date);
  const christmas = day(new Date(y, 11, 25));
  const xmasDow = new Date(y, 11, 25).getDay();
  const advent = christmas - (xmasDow === 0 ? 28 : 21 + xmasDow); // fourth Sunday before Christmas
  const ashWednesday = day(easter) - 46;
  const pentecost = day(easter) + 49;
  const pick =
    t >= advent && t < christmas ? "dore-193" // The Annunciation
    : t >= christmas || t <= day(new Date(y, 0, 6)) ? "dore-194" // The Nativity
    : t >= ashWednesday && t < day(easter) ? "dore-196" // The Temptation of Jesus
    : t >= day(easter) && t < pentecost ? "dore-182" // The Resurrection
    : t >= pentecost && t < pentecost + 7 ? "dore-224" // The Descent of the Spirit
    : "dore-001"; // The Creation of Light
  return by(pick) ?? heroesList[0];
}

/** Anonymous Gregorian algorithm (Meeus/Jones/Butcher). */
export function easterSunday(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), dayOfMonth = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, dayOfMonth);
}

// ── Paintings (scripts/art/paintings.mjs) ───────────────────────────────

/** An oil painting or etching: Caravaggio, Rembrandt and their followers. */
export interface Painting {
  id: string;
  title: string;
  artist: string;
  year: string;
  ref: Ref | null;
  /** For a painting tied to no single verse: what it shows. */
  about?: string;
  medium: string;
  place: string;
  /** In colour (kept as painted) or a print (tinted with the theme). */
  colour: boolean;
  /** Mean brightness 0..255: Caravaggio's are dark. */
  key: number;
  /** Share of the canvas that is near black, 0..1: how tenebrist it is. */
  dark?: number;
  /** Where its light falls, percent: the focus of every crop. */
  focusX: number;
  focusY: number;
  source: string;
  licence: string;
  full: PlateImage;
  thumb: PlateImage;
}

export const paintingUrl = (img: PlateImage) => `${BASE}/paintings/${img.file}`;

let paintings: Promise<Painting[]> | null = null;

export function loadPaintings(): Promise<Painting[]> {
  paintings ??= fetch(`${BASE}/paintings/paintings.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Painting[]>) : []))
    .catch(() => []);
  return paintings;
}

export function paintingsInChapter(all: Painting[], book: string, chapter: number): Painting[] {
  return all.filter((p) => p.ref?.book === book && p.ref.chapter === chapter).sort((a, b) => (a.ref!.verse ?? 0) - (b.ref!.verse ?? 0));
}

/** Does a picture's passage include this verse? */
export function depicts(ref: Ref | null, book: string, chapter: number, verse: number): boolean {
  if (!ref || ref.book !== book || ref.chapter !== chapter) return false;
  return verse >= (ref.verse ?? 0) && verse <= (ref.verseEnd ?? ref.verse ?? 0);
}

/** A painting's credit line: "Caravaggio, 1601". */
export const paintingCredit = (p: Painting) => `${p.artist}, ${p.year}`;

/** Paintings that set a page's mood, by page (docs/ART.md, Paintings). */
export const PAGE_PAINTINGS: Record<string, string> = {
  notebooks: "jerome-writing", // the scholar translating at his desk
  topics: "seven-works-of-mercy", // Matthew 25 acted out in a Naples street
  gallery: "calling-of-matthew",
  dark: "denial-of-peter", // the empty and error states in Tenebrae
};

/**
 * The painting for a day, following the church year like the Home hero: the
 * Annunciation's dream in Advent, the Passion in Lent, the risen Christ at
 * Easter, Paul on the road at Pentecost. Within a season it turns daily.
 */
export function paintingForDay(all: Painting[], date = new Date()): Painting | undefined {
  if (!all.length) return undefined;
  const y = date.getFullYear();
  const day = (d: Date) => Math.floor(d.getTime() / 86_400_000);
  const t = day(date);
  const easter = day(easterSunday(y));
  const christmas = day(new Date(y, 11, 25));
  const xmasDow = new Date(y, 11, 25).getDay();
  const advent = christmas - (xmasDow === 0 ? 28 : 21 + xmasDow);
  const season =
    t >= advent && t < christmas ? ["dream-of-joseph"]
    : t >= christmas || t <= day(new Date(y, 0, 6)) ? ["simeon-in-the-temple", "dream-of-joseph"]
    : t === easter - 2 ? ["three-crosses", "entombment"] // Good Friday
    : t >= easter - 6 && t < easter ? ["taking-of-christ", "denial-of-peter", "christ-before-the-high-priest", "rembrandt-denial-of-peter", "entombment"] // Holy Week
    : t >= easter - 46 && t < easter ? ["sacrifice-of-isaac", "jeremiah-lamenting", "prodigal-son", "taking-of-christ", "seven-works-of-mercy"] // Lent
    : t >= easter && t < easter + 49 ? ["incredulity-of-thomas", "supper-at-emmaus", "raising-of-lazarus"]
    : t >= easter + 49 && t < easter + 56 ? ["conversion-of-paul"]
    : all.map((p) => p.id);
  const pool = season.map((id) => all.find((p) => p.id === id)).filter((p): p is Painting => !!p);
  const list = pool.length ? pool : all;
  return list[((t % list.length) + list.length) % list.length];
}

const BOOK_ORDER = new Map(BOOKS.map((b, i) => [b.osis, i]));

/** Sort pictures by the passage they show, in canonical order; unplaced last. */
export function byBibleOrder<T extends { ref: Ref | null }>(a: T, b: T): number {
  const x = a.ref, y = b.ref;
  if (!x || !y) return x ? -1 : y ? 1 : 0;
  return (BOOK_ORDER.get(x.book) ?? 999) - (BOOK_ORDER.get(y.book) ?? 999) || x.chapter - y.chapter || (x.verse ?? 0) - (y.verse ?? 0);
}

// The Doré plates (scripts/art/dore.mjs) and the dithered heroes
// (scripts/art/heroes.mjs). A plate knows the passage it depicts, so the
// reader can set it beside that verse and every page can pick art that fits
// what the page is for (docs/ART.md).

import type { Ref } from "./canon";

export interface PlateImage {
  file: string;
  width: number;
  height: number;
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
}

export interface Hero {
  id: string;
  plate: string;
  title: string;
  file: string;
  width: number;
  height: number;
}

const BASE = `${import.meta.env.BASE_URL}art`;
export const plateUrl = (img: PlateImage) => `${BASE}/dore/${img.file}`;
export const heroUrl = (h: Hero) => `${BASE}/heroes/${h.file}`;

let plates: Promise<Plate[]> | null = null;
let heroes: Promise<Hero[]> | null = null;

export function loadPlates(): Promise<Plate[]> {
  plates ??= fetch(`${BASE}/dore/plates.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Plate[]>) : []))
    .catch(() => []);
  return plates;
}

export function loadHeroes(): Promise<Hero[]> {
  heroes ??= fetch(`${BASE}/heroes/heroes.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Hero[]>) : []))
    .catch(() => []);
  return heroes;
}

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
  search: 21, // Jacob's Dream: searching between heaven and earth
  topics: 236, // St. John at Patmos
  notebooks: 126, // Baruch writing Jeremiah's prophecies: the scribe at work
  apocrypha: 140, // Tobias and the Angel
  translations: 10, // The Confusion of Tongues
  training: 128, // Ezekiel Prophesying
  model: 40, // Moses coming down from Sinai with the tablets
  settings: 241, // The New Jerusalem
  empty: 93, // Elijah nourished by an angel
  error: 124, // The Destruction of Leviathan
};

export const plateNumber = (all: Plate[], n: number) => all.find((p) => p.n === n);

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

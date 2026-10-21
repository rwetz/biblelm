// The Daily Office Lectionary of the 1979 Book of Common Prayer (public
// domain), as built by scripts/data/daily.mjs: psalms for morning and
// evening and three lessons for every day of a two-year cycle. This file is
// only the calendar: which entry belongs to a date (BCP pp. 934-935).

import { getBinary } from "./bible";
import { easterSunday } from "./art";
import { parseRef, type Ref } from "./canon";

export interface OfficeDay {
  season?: string;
  week?: string;
  day: string;
  title?: string;
  psalms: { morning: string[]; evening: string[] };
  lessons: Record<string, string>;
  evening?: Record<string, string>;
}

export interface Lectionary {
  source: string;
  one: OfficeDay[];
  two: OfficeDay[];
  holy: OfficeDay[];
}

let data: Promise<Lectionary> | null = null;
export function loadLectionary(): Promise<Lectionary> {
  data ??= getBinary("lectionary.json").then((b) => JSON.parse(new TextDecoder().decode(b)) as Lectionary);
  data.catch(() => (data = null));
  return data;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayNo = (d: Date) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000);
const fromNo = (n: number) => new Date(n * 86_400_000);

/** The First Sunday of Advent of year y. */
export function adventSunday(y: number): Date {
  const xmas = new Date(y, 11, 25);
  const dow = xmas.getDay();
  return new Date(y, 11, 25 - (dow === 0 ? 28 : 21 + dow));
}

/**
 * The Office for a date: which of the two years, the season's entry for the
 * day, and the holy day if one falls on it. Year One begins at Advent before
 * an odd-numbered year.
 */
export function officeFor(l: Lectionary, date = new Date()): { year: 1 | 2; day?: OfficeDay; holy?: OfficeDay; label: string } {
  const y = date.getFullYear();
  const t = dayNo(date);
  const advent = dayNo(adventSunday(y));
  const churchYear = t >= advent ? y + 1 : y;
  const year: 1 | 2 = churchYear % 2 === 1 ? 1 : 2;
  const list = year === 1 ? l.one : l.two;
  const weekday = DAYS[date.getDay()];
  const md = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  const holy = l.holy.find((h) => h.day === md);
  const find = (week: string | undefined, day = weekday, title?: RegExp) =>
    list.find((e) => e.week === week && e.day === day && (!title || title.test(e.title ?? "")));

  const easter = dayNo(easterSunday(y));
  const ash = easter - 46, lent1 = ash + 4, palm = easter - 7, pentecost = easter + 49;
  const epiphany = dayNo(new Date(y, 0, 6));
  const e1 = epiphany + (7 - new Date(y, 0, 6).getDay()); // the Sunday after Jan 6
  let day: OfficeDay | undefined;

  if (t >= advent) {
    // Advent, then Christmas from the 25th.
    day = t < dayNo(new Date(y, 11, 25)) ? (list.find((e) => e.day === md && e.season === "Advent") ?? find(`Week of ${Math.floor((t - advent) / 7) + 1} Advent`)) : undefined;
    if (!day) day = weekday === "Sunday" ? find("Christmas Day and Following", "Sunday", /First/) : list.find((e) => e.day === md);
  } else if (t <= dayNo(new Date(y, 0, 5))) {
    day = weekday === "Sunday" ? find("Christmas Day and Following", "Sunday", t <= dayNo(new Date(y, 0, 1)) ? /First/ : /Second/) : list.find((e) => e.day === md);
  } else if (t < e1) {
    day = list.find((e) => e.week === "The Epiphany and Following" && e.day === md) ?? find("The Epiphany and Following", weekday);
  } else if (t < ash) {
    day = t >= ash - 3 ? find("Week of Last Epiphany") : find(`Week of ${Math.floor((t - e1) / 7) + 1} Epiphany`);
  } else if (t < lent1) {
    day = find("Ash Wednesday and Following");
  } else if (t < palm) {
    day = find(`Week of ${Math.floor((t - lent1) / 7) + 1} Lent`);
  } else if (t < easter) {
    day = find("Holy Week");
  } else if (t < easter + 7) {
    day = find("Easter Week");
  } else if (t < pentecost) {
    day = find(`Week of ${Math.floor((t - easter) / 7) + 1} Easter`);
  } else if (t === pentecost) {
    day = find("Pentecost", "Sunday");
  } else if (t === pentecost + 6 || t === pentecost + 7) {
    day = list.find((e) => e.season === "The Season after Pentecost" && !e.week && e.day === weekday);
  } else {
    // "Proper n": the week of the Sunday closest to May 11 + 7(n - 1).
    const sunday = t - date.getDay();
    const n = Math.min(29, Math.max(1, Math.round((sunday - dayNo(new Date(y, 4, 11))) / 7) + 1));
    day = find(`Proper ${n}`);
  }
  const label = holy?.title ?? day?.title ?? [day?.week, weekday].filter(Boolean).join(", ");
  return { year, day, holy, label };
}

/** "Isa 1:1-9", "Sir 43:1-12(27-33)", "Ps 110:1-5(6-7)" -> where to open the reader. */
export function lessonRef(label: string): Ref | null {
  const clean = label
    .replace(/\([^)]*\)/g, "")
    .replace(/,.*$/, "")
    .replace(/(\d)[a-z]/g, "$1") // "12a": half a verse
    .replace(/-(\d+):\d+$/, "") // across chapters: open at the start
    .trim();
  return parseRef(clean) ?? null;
}

/** A psalm as the Office prints it ("18:1-20", "119:1-24") -> its reference. */
export const psalmRef = (p: string): Ref | null => lessonRef(`Ps ${p}`);

export { fromNo };

// The Atlas: places (OpenBible.info geocoding, CC BY), people and their
// families (STEPBible TIPNR, CC BY) and the land (Natural Earth, public
// domain), all over the KJV verse index. Built by scripts/data/atlas.mjs.

import { getBinary } from "./bible";

export interface Place {
  id: string;
  name: string;
  /** settlement, region, mountain, river, water, ... */
  type: string;
  lon: number;
  lat: number;
  /** 0..1: how sure the modern identification is. */
  sure: number;
  modern: string;
  verses: number[];
}

export interface Person {
  /** STEPBible's unified Strong's number for this individual. */
  id: string;
  name: string;
  sex: "m" | "f" | "";
  era: string;
  tribe: string;
  brief: string;
  parents: string[];
  siblings: string[];
  partners: string[];
  children: string[];
  verses: number[];
}

export interface Land {
  bbox: { w: number; s: number; e: number; n: number };
  land: [number, number][][];
  lakes: [number, number][][];
  rivers: { name: string; line: [number, number][] }[];
}

const json = async <T,>(path: string): Promise<T> => JSON.parse(new TextDecoder().decode(await getBinary(path))) as T;

let places: Promise<Place[]> | null = null;
let people: Promise<Person[]> | null = null;
let land: Promise<Land> | null = null;

export const loadPlaces = () => {
  places ??= json<Place[]>("places.json");
  places.catch(() => (places = null));
  return places;
};
export const loadPeople = () => {
  people ??= json<Person[]>("people.json");
  people.catch(() => (people = null));
  return people;
};
export const loadLand = () => {
  land ??= json<Land>("land.json");
  land.catch(() => (land = null));
  return land;
};

/** verse index -> the items naming it, built once per list. */
const reverse = new WeakMap<object, Map<number, number[]>>();
function byVerse<T extends { verses: number[] }>(list: T[]): Map<number, number[]> {
  let m = reverse.get(list);
  if (!m) {
    m = new Map();
    list.forEach((x, i) => {
      for (const v of x.verses) {
        const l = m!.get(v);
        if (l) l.push(i);
        else m!.set(v, [i]);
      }
    });
    reverse.set(list, m);
  }
  return m;
}

/** TIPNR names the unnamed ("a_wife_of_Solomon") so families link up; show them as words. */
export const personName = (p: Person) => p.name.replace(/_/g, " ");

export const placesAt = (all: Place[], verse: number) => (byVerse(all).get(verse) ?? []).map((i) => all[i]);
export const peopleAt = (all: Person[], verse: number) => (byVerse(all).get(verse) ?? []).map((i) => all[i]);

/**
 * The eras of the timeline, with the conventional dates most study Bibles
 * print. They are approximate and scholars differ (the date of the Exodus
 * alone has two schools); the app says so beside them.
 */
export const ERAS: { name: string; from: number; to: number; books: string; blurb: string }[] = [
  { name: "Before the Flood", from: NaN, to: NaN, books: "Genesis 1-11", blurb: "Creation, the first families, the Flood and Babel. Undated." },
  { name: "Patriarchs", from: -2000, to: -1700, books: "Genesis 12-50, Job", blurb: "Abraham, Isaac, Jacob and his twelve sons." },
  { name: "Egypt and Wilderness", from: -1700, to: -1406, books: "Exodus to Deuteronomy", blurb: "Slavery in Egypt, the Exodus, Sinai, forty years in the desert." },
  { name: "Conquest and Judges", from: -1406, to: -1050, books: "Joshua, Judges, Ruth", blurb: "Canaan settled; judges rise in each crisis." },
  { name: "United Monarchy", from: -1050, to: -930, books: "1 Samuel to 1 Kings 11, Psalms, Proverbs", blurb: "Saul, David and Solomon; the Temple built." },
  { name: "Divided Monarchy", from: -930, to: -586, books: "1 Kings 12 to 2 Kings, most prophets", blurb: "Israel and Judah apart; Samaria falls (722), Jerusalem falls (586)." },
  { name: "Exile and Return", from: -586, to: -400, books: "Ezra, Nehemiah, Esther, Daniel, Haggai to Malachi", blurb: "Babylon, then Persia; the Temple and walls rebuilt." },
  { name: "Between the Testaments", from: -400, to: -5, books: "Maccabees, Sirach, Wisdom", blurb: "Greek and then Roman rule; the Maccabean revolt." },
  { name: "New Testament", from: -5, to: 100, books: "Matthew to Revelation", blurb: "Jesus, the apostles and the first churches." },
];

export const yearLabel = (y: number) => (Number.isNaN(y) ? "" : y < 0 ? `${-y} BC` : `AD ${y}`);

/** Map projection for the Atlas: plain equirectangular, scaled by latitude so the Levant keeps its shape. */
export function project(l: Land, w: number, h: number) {
  const { w: west, e, s, n } = l.bbox;
  const k = Math.cos((((s + n) / 2) * Math.PI) / 180);
  const sx = w / ((e - west) * k), sy = h / (n - s);
  const scale = Math.min(sx, sy);
  const ox = (w - (e - west) * k * scale) / 2, oy = (h - (n - s) * scale) / 2;
  return (lon: number, lat: number): [number, number] => [ox + (lon - west) * k * scale, oy + (n - lat) * scale];
}

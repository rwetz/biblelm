// The daily omen (docs/SUBROSA.md, S5): under the rose it takes the place of
// the verse of the day on Home. Days alternate: an omen from the apocalypses
// and the prophets one day (a real verse, in your translation), a spirit of
// the Goetia the next (its seal and the book's words, marked "Not Scripture").
// Fixed by the date, like the verse of the day, so it is the same all day.

import { parseOsis, type Ref } from "./canon";

/** Verses of signs and endings, references only; the words come from your translation. */
export const OMENS = [
  "Rev.6.8", "Isa.14.12", "Dan.5.25", "Rev.8.11", "Joel.2.31", "Rev.12.9", "Ezek.1.18", "Rev.13.18", "Matt.24.29",
  "Dan.7.7", "Luke.10.18", "Rev.9.1", "Isa.34.14", "Rev.16.16", "Jude.1.6", "Dan.12.2", "Rev.6.12", "Zech.14.12",
  "2Pet.2.4", "Rev.20.10", "Ezek.38.2", "Mal.4.1", "2Thess.2.3", "Rev.20.14", "Isa.24.1", "Rev.9.11", "Amos.8.9",
  "Lev.16.8", "Rev.17.5", "Job.41.1", "Rev.12.7", "1Sam.28.7", "Rev.21.1",
];

export type Omen = { kind: "verse"; ref: Ref } | { kind: "spirit"; n: number };

const dayOfYear = (d: Date) => Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);

export function omenOfTheDay(date = new Date()): Omen {
  const day = dayOfYear(date);
  const i = Math.floor(day / 2);
  return day % 2 ? { kind: "spirit", n: (i % 72) + 1 } : { kind: "verse", ref: parseOsis(OMENS[i % OMENS.length])! };
}

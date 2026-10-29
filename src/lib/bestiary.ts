// Sub Rosa's bestiary (docs/SUBROSA.md, S5): the Goetia's seventy-two spirits,
// each with its seal, rank and legions, and beside them the demons Solomon
// questions in the Testament of Solomon, the older book the Goetia grew from.
//
// The spirits' facts are read from the book by scripts/data/library.mjs
// (bestiary.json: ranks and metals from its table "Respective Rank", legions
// from each spirit's own text); the seals are drawn by scripts/art/curios.mjs
// (public/art/curios/seals.json). The Testament's demons are written here by
// hand, each at the verse where it first stands before Solomon, checked by a
// test against Conybeare's text.

import { getJson } from "./bible";

export type Rank = "King" | "Duke" | "Prince" | "Marquis" | "President" | "Earl" | "Knight";

export interface Spirit {
  n: number;
  name: string;
  /** The other spellings the book gives. */
  aka?: string[];
  ranks: Rank[];
  /** The metal its seal is to be made in, one per rank where they differ. */
  metals: string[];
  legions: number;
  /** Its section in the library's Goetia, by title. */
  section: string;
}

export interface Seal {
  n: number;
  /** One seal, or two where the book prints two. */
  files: string[];
  dir: string;
}

/** The ranks in the book's own order, with a plural for the filter. */
export const RANKS: { rank: Rank; plural: string }[] = [
  { rank: "King", plural: "Kings" },
  { rank: "Duke", plural: "Dukes" },
  { rank: "Prince", plural: "Princes" },
  { rank: "Marquis", plural: "Marquises" },
  { rank: "President", plural: "Presidents" },
  { rank: "Earl", plural: "Earls" },
  { rank: "Knight", plural: "Knights" },
];

let spirits: Promise<Spirit[]> | null = null;
let seals: Promise<Seal[]> | null = null;

export function loadBestiary(): Promise<Spirit[]> {
  spirits ??= getJson<Spirit[]>("bestiary.json");
  spirits.catch(() => (spirits = null));
  return spirits;
}

export function loadSeals(): Promise<Seal[]> {
  seals ??= fetch(`${import.meta.env.BASE_URL}art/curios/seals.json`).then((r) => {
    if (!r.ok) throw new Error(`seals.json: HTTP ${r.status}`);
    return r.json() as Promise<Seal[]>;
  });
  seals.catch(() => (seals = null));
  return seals;
}

export const sealUrl = (s: Seal, k = 0) => `${import.meta.env.BASE_URL}art/${s.dir}/${s.files[k]}`;

/** "Great King and Earl", from the ranks. */
export const rankLine = (s: Pick<Spirit, "ranks">) => s.ranks.join(" and ");

export interface SolomonDemon {
  id: string;
  name: string;
  /** Where it first stands before Solomon (TSol.1.n, Conybeare's numbering). */
  ref: string;
  /** A word of the verse, checked by a test, so a renumbering is caught. */
  says: string;
  gist: string;
  /** The Goetia spirit it became, by number, where the two books share one. */
  goetia?: number;
  /** Where Scripture names it. */
  scripture?: string;
}

/** The demons of the Testament of Solomon, in the order Solomon questions them. */
export const SOLOMON_DEMONS: SolomonDemon[] = [
  { id: "ornias", name: "Ornias", ref: "TSol.1.2", says: "Ornias", gist: "Takes half the pay and food of the master builder's boy and sucks his thumb; the first demon caught with the ring Michael brings Solomon." },
  { id: "beelzeboul", name: "Beelzeboul", ref: "TSol.1.13", says: "Beelzeboul", gist: "King of the demons, set to cut the Temple's marble.", scripture: "Matt.12.24" },
  { id: "onoskelis", name: "Onoskelis", ref: "TSol.1.16", says: "Onoskelis", gist: "Fair as a woman, who strangles men with a noose and lives in a golden cave; set to spin hemp for the Temple's ropes." },
  { id: "asmodeus", name: "Asmodeus", ref: "TSol.1.21", says: "Asmodeus", gist: "Born of an angel and a woman, he plots against the newly wed; frustrated by Raphael and by a fish's liver and gall, as in Tobit.", goetia: 32, scripture: "Tob.3.8" },
  { id: "tephras", name: "Tephras", ref: "TSol.1.33", says: "Tephras", gist: "The spirit of the ashes, who brings fevers and burns the fields." },
  { id: "seven", name: "The seven spirits", ref: "TSol.1.34", says: "seven spirits", gist: "Deception, Strife, Klothod (Battle), Jealousy, Power, Error and the Worst: seven women bound together, the stars of the world-rulers of darkness, set to dig the Temple's foundations." },
  { id: "envy", name: "Envy", ref: "TSol.1.43", says: "without a head", gist: "A man's limbs and no head; he longs for one and takes other men's." },
  { id: "rabdos", name: "Rabdos", ref: "TSol.1.47", says: "hound", gist: "A huge hound, \"Staff\", who shows Solomon where the green stone for the Temple lies." },
  { id: "lion", name: "The lion-shaped demon", ref: "TSol.1.51", says: "lion", gist: "A roaring lion with a host of demons under him, frustrated by the one who is to suffer at men's hands; his legion is set to carry wood." },
  { id: "three-headed", name: "The three-headed dragon", ref: "TSol.1.54", says: "three-headed", gist: "Blinds children in the womb and makes them deaf and mute; he tells Solomon of the gold stored at the Temple's entrance." },
  { id: "obizuth", name: "Obizuth", ref: "TSol.1.57", says: "woman", gist: "A woman's head and no limbs, who strangles children at birth; Solomon has her hair bound and hangs her before the Temple." },
  { id: "winged-dragon", name: "The winged dragon", ref: "TSol.1.60", says: "dragon", gist: "A dragon with a man's face and hands, who lies with a few fair women and burns up the logs laid in the Temple." },
  { id: "enepsigos", name: "Enêpsigos", ref: "TSol.1.64", says: "woman", gist: "A woman with two more heads on her shoulders, \"of a myriad names\", who prophesies the Temple's fall." },
  { id: "decans", name: "The thirty-six decans", ref: "TSol.1.72", says: "thirty-six", gist: "\"The world-rulers of this darkness\", the decans of the zodiac, each with the sickness it brings and the name that frustrates it." },
  { id: "ephippas", name: "Ephippas", ref: "TSol.1.121", says: "Ephippas", gist: "The wind of Arabia, caught in a leather flask, who lifts the cornerstone no builder could." },
  { id: "abezethibou", name: "Abezethibou", ref: "TSol.1.125", says: "Red Sea", gist: "The demon of the Red Sea, who says he hardened Pharaoh's heart and stayed under the sea when it covered Egypt's host." },
];

/** The Testament's demon beside a Goetia spirit, if the two books share it. */
export const solomonDemonFor = (n: number) => SOLOMON_DEMONS.find((d) => d.goetia === n);

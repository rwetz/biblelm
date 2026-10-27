// Botticelli's Map of Hell (c. 1480-90) as an Atlas layer, under the rose
// (docs/SUBROSA.md, S5): Dante's descent marked on the painting, each mark
// opening its canto of the Inferno in the cabinet and the Doré plates of it.
// Positions are percent of the painting's width and height, placed by eye on
// its bands, from the gate at the top left down the funnel to Lucifer.

export interface HellPlace {
  id: string;
  name: string;
  /** The canto that opens this place, as the library titles it ("Canto V"). */
  canto: string;
  gist: string;
  x: number;
  y: number;
}

export const HELL: HellPlace[] = [
  { id: "gate", name: "The gate and the Acheron", canto: "Canto III", gist: "\"All hope abandon, ye who enter in!\" The neutrals chase a banner, and Charon ferries the dead across.", x: 13, y: 14 },
  { id: "limbo", name: "Limbo", canto: "Canto IV", gist: "The first circle: the virtuous pagans and the unbaptized, without torment and without hope.", x: 34, y: 15 },
  { id: "lustful", name: "The lustful", canto: "Canto V", gist: "The second circle: Minos judges at its gate; the lovers are blown for ever in a storm.", x: 62, y: 19.5 },
  { id: "gluttons", name: "The gluttons", canto: "Canto VI", gist: "The third circle: rain eternal, cold and heavy, and Cerberus.", x: 36, y: 24 },
  { id: "greedy", name: "The hoarders and the wasters", canto: "Canto VII", gist: "The fourth circle: two crowds roll great weights against each other.", x: 62, y: 28 },
  { id: "wrathful", name: "The wrathful, in the Styx", canto: "Canto VIII", gist: "The fifth circle: the angry fight in the marsh, the sullen lie under it.", x: 38, y: 32.5 },
  { id: "dis", name: "The city of Dis", canto: "Canto IX", gist: "Its gates shut against Virgil until one sent from heaven opens them.", x: 75, y: 16 },
  { id: "heretics", name: "The heretics", canto: "Canto X", gist: "The sixth circle: open tombs, burning.", x: 60, y: 39 },
  { id: "violent", name: "The violent", canto: "Canto XII", gist: "The seventh circle: the river of blood, the wood of the suicides and the burning sand.", x: 42, y: 47 },
  { id: "geryon", name: "Geryon's cliff", canto: "Canto XVII", gist: "Geryon, fraud with an honest face, carries the poets down the great drop.", x: 50, y: 60 },
  { id: "malebolge", name: "Malebolge", canto: "Canto XVIII", gist: "The eighth circle: ten ditches of the fraudulent, bridged by rock.", x: 50, y: 71 },
  { id: "giants", name: "The giants", canto: "Canto XXXI", gist: "The giants stand round the well, Nimrod among them, babbling.", x: 45, y: 79.5 },
  { id: "lucifer", name: "Cocytus and Lucifer", canto: "Canto XXXIV", gist: "The ninth circle is ice. At its centre Lucifer, three-faced, chews the three traitors.", x: 52, y: 86 },
];

export const HELL_PAINTING = "botticelli-map-of-hell";

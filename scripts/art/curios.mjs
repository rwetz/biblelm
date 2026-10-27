// Sub Rosa's art (docs/SUBROSA.md): hell, its devils and its cartographers,
// shown only while the curiosities mode is on. Three kinds, as elsewhere:
//
//   plates     engravings and woodcuts, numbered from 2001, shown as positive
//              engravings (corner plates, the sidebar, beside their passage):
//              Doré's Inferno (1857-61), Louis Le Breton's demons for Collin
//              de Plancy's Dictionnaire infernal (1863), Dürer's Apocalypse,
//              Schongauer, Bruegel's designs, Callot, Goya, Blake, Lévi.
//   heroes     a grayscale tone of some of those plates, dithered live on
//              Home and in the Lab (like scripts/art/literary.mjs).
//   seals      the 72 seals of the Goetia, as drawn in the 1904 edition, for
//              the cabinet's bestiary: ink kept as alpha so the app draws
//              them in the theme's ink (a CSS mask), never in the accent.
//   paintings  kept as painted, resized only (like scripts/art/paintings.mjs):
//              Bosch, Bruegel, Memling, Michelangelo, Signorelli, Botticelli's
//              map of hell, Blake's dragon and beast, John Martin.
//
//   node scripts/art/curios.mjs            # download + process
//   node scripts/art/curios.mjs --process  # reprocess cached downloads only
//
// Every file is checked on Commons to be tagged public domain or CC0 (PD-Art:
// a faithful photograph of a 2D public-domain work is public domain in the
// US) and refused otherwise. Downloads are cached in art-src/curios/; output
// goes to public/art/curios/ and the credits to docs/curios-credits.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { ROOT } from "../data/lib.mjs";

const SRC = join(ROOT, "art-src", "curios");
const OUT = join(ROOT, "public", "art", "curios");
const DIR = "curios";
const UA = { "User-Agent": "BibleLM art build (+https://github.com/rwetz/biblelm; rwetz00 at gmail)" };
const ALLOWED = /^(public domain|pd|cc0|cc-zero)/i;

const DORE = ["Gustave Doré", "1857-61"];
const LE_BRETON = ["Louis Le Breton, for Collin de Plancy's Dictionnaire infernal", "1863"];
const DURER = ["Albrecht Dürer", "1498"];
const BRUEGEL_PRINT = ["Pieter Bruegel the Elder, engraved by Pieter van der Heyden"];
const inferno = (n, rest) => `Gustave Doré - Dante Alighieri - Inferno - Plate ${n} (${rest}).jpg`;

/**
 * The plates. `role` says where the app uses one (src/lib/art.ts, ROSE_PLATES);
 * `hero` also makes it a dithered hero, its weight `focusY` percent from the top.
 * A plate with a `ref` is the figure named in that verse, and stands beside it.
 */
export const PLATES = [
  // Doré's Inferno
  { n: 2001, id: "inferno-gate", title: "Abandon All Hope", by: DORE, about: "Inferno, Canto III", file: inferno(8, "Canto III - Abandon all hope ye who enter here"), role: "settings corner", hero: { focusY: 40 } },
  { n: 2002, id: "inferno-charon", title: "Charon Herds the Sinners onto His Boat", by: DORE, about: "Inferno, Canto III", file: inferno(10, "Canto III - Charon herds the sinners onto his boat"), role: "training corner", hero: { focusY: 45 } },
  { n: 2003, id: "inferno-minos", title: "Minos", by: DORE, about: "Inferno, Canto V", file: inferno(13, "Canto V - Minos"), role: "no results", hero: { focusY: 35 } },
  { n: 2004, id: "inferno-hurricane", title: "The Hurricane of Souls", by: DORE, about: "Inferno, Canto V", file: inferno(14, "Canto V - The hurricane of souls"), role: "Gallery" },
  { n: 2005, id: "inferno-titans", title: "The Titans", by: DORE, about: "Inferno, Canto XXXI: Nimrod among the giants, babbling, his tongue confounded", file: inferno(65, "Canto XXXI - The Titans"), role: "translations corner", hero: { focusY: 40 } },
  { n: 2006, id: "inferno-lucifer", title: "Lucifer, King of Hell", by: ["Gustave Doré", "1861"], about: "Inferno, Canto XXXIV", file: "Dore Lucifer.jpg", role: "error", hero: { focusY: 30 } },
  { n: 2007, id: "inferno-harpies", title: "The Wood of the Suicides", by: DORE, about: "Inferno, Canto XIII", file: "Harpy.jpg", role: "empty" },
  { n: 2008, id: "inferno-geryon", title: "Geryon's Flight", by: DORE, about: "Inferno, Canto XVII", file: "Gustave Doré - Chant 17. Geryon's Flight (c. 1880).jpg", role: "Gallery" },
  { n: 2009, id: "inferno-calcabrina", title: "Calcabrina and Alichino", by: DORE, about: "Inferno, Canto XXII: two of the devils of the fifth pit", file: "Gustave Doré - Chant 22. Calcabrina and Alichino (c. 1880).jpg", role: "search sidebar" },
  { n: 2010, id: "inferno-dark-wood", title: "The Dark Wood", by: DORE, about: "Inferno, Canto I", file: inferno(1, "I found myself within a forest dark..."), role: "search corner" },
  { n: 2011, id: "inferno-wood-of-thorns", title: "The Harpies in the Wood", by: DORE, about: "Inferno, Canto XIII", file: "Gustave Doré - The Inferno, Canto 13.jpg", role: "Home rotation", hero: { focusY: 40 } },
  // The demons of the Dictionnaire infernal that Scripture names
  { n: 2020, id: "di-asmodeus", title: "Asmodeus", by: LE_BRETON, ref: "Tob.3.8", file: "Asmodaeus.png", role: "apocrypha corner" },
  { n: 2021, id: "di-azazel", title: "Azazel", by: LE_BRETON, ref: "Lev.16.8", file: "Azazel (DI).png", role: "notebooks sidebar" },
  { n: 2022, id: "di-adramelech", title: "Adramelech", by: LE_BRETON, ref: "2Kgs.17.31", file: "Adramelech (DI).png", role: "beside 2 Kings 17" },
  { n: 2023, id: "di-astaroth", title: "Astaroth", by: LE_BRETON, ref: "1Kgs.11.5", file: "Astaroth (DI).png", role: "beside 1 Kings 11" },
  { n: 2024, id: "di-beelzebub", title: "Beelzebub", by: LE_BRETON, ref: "2Kgs.1.2", file: "Beelzebub.png", role: "beside 2 Kings 1" },
  { n: 2025, id: "di-baal", title: "Baal", by: LE_BRETON, ref: "1Kgs.18.26", file: "Baal (Demon).jpg", role: "beside 1 Kings 18" },
  { n: 2026, id: "di-belphegor", title: "Belphegor", by: LE_BRETON, ref: "Num.25.3", file: "Belphegor.jpg", role: "beside Numbers 25 (Baal-peor)" },
  { n: 2027, id: "di-berith", title: "Berith", by: LE_BRETON, ref: "Judg.9.46", file: "Berith.png", role: "beside Judges 9 (El-berith)" },
  { n: 2028, id: "di-cerberus", title: "Cerberus", by: LE_BRETON, file: "Cerberus (Dictionnaire Infernal).png", role: "empty notebook" },
  { n: 2029, id: "di-abigor", title: "Abigor", by: LE_BRETON, file: "Abigor (DI).png", role: "Goetia" },
  { n: 2030, id: "di-amon", title: "Amon", by: LE_BRETON, file: "Amon.png", role: "Goetia" },
  { n: 2031, id: "di-andras", title: "Andras", by: LE_BRETON, file: "Andras.png", role: "Goetia" },
  { n: 2032, id: "di-byleth", title: "Byleth", by: LE_BRETON, file: "Byleth.png", role: "Goetia" },
  // Prints
  { n: 2040, id: "schongauer-anthony", title: "Saint Anthony Tormented by Demons", by: ["Martin Schongauer", "c. 1470"], file: "Saint Anthony Tormented by Demons MET DP213862.jpg", role: "topics corner" },
  { n: 2041, id: "durer-four-horsemen", title: "The Four Horsemen", by: DURER, ref: "Rev.6.8", file: "The Four Horsemen, from The Apocalypse MET DT202810.jpg", crop: [0.04, 0.04, 0.92, 0.92], role: "beside Revelation 6" },
  { n: 2042, id: "durer-whore-of-babylon", title: "The Whore of Babylon", by: DURER, ref: "Rev.17.3-4", file: "The Whore of Babylon, from The Apocalypse MET DP816928.jpg", crop: [0.04, 0.04, 0.92, 0.92], role: "beside Revelation 17" },
  { n: 2043, id: "durer-beast-lamb-horns", title: "The Beast with Two Horns like a Lamb", by: DURER, ref: "Rev.13.11", file: "The Beast with Two Horns Like a Lamb, from The Apocalypse MET DP816931.jpg", crop: [0.04, 0.04, 0.92, 0.92], role: "lab sidebar" },
  { n: 2044, id: "durer-seven-trumpets", title: "The Seven Angels with the Trumpets", by: DURER, ref: "Rev.8.2", file: "The Seven Angels with the Trumpet, from The Apocalypse MET DP816919.jpg", crop: [0.04, 0.04, 0.92, 0.92], role: "beside Revelation 8" },
  { n: 2045, id: "goya-sleep-of-reason", title: "The Sleep of Reason Produces Monsters", by: ["Francisco Goya, Los Caprichos 43", "1799"], file: "Plate 43 from 'Los Caprichos'- The sleep of reason produces monsters (El sueño de la razon produce monstruos) MET DP816992.jpg", crop: [0.245, 0.13, 0.575, 0.62], role: "notebooks corner" },
  { n: 2046, id: "bruegel-last-judgment", title: "The Last Judgment", by: [...BRUEGEL_PRINT, "1558"], ref: "Matt.25.31-32", file: "The Last Judgment MET DP818256.jpg", trim: true, role: "topics sidebar", hero: { focusY: 45 } },
  { n: 2047, id: "bruegel-limbo", title: "The Descent of Christ into Limbo", by: [...BRUEGEL_PRINT, "c. 1561"], ref: "1Pet.3.19", file: "The Descent of Christ Into Limbo MET DP818251.jpg", trim: true, role: "Home rotation", hero: { focusY: 45 } },
  { n: 2048, id: "blake-behemoth-leviathan", title: "Behemoth and Leviathan", by: ["William Blake", "1825"], ref: "Job.40.15", file: "Behemoth and Leviathan, from Illustrations of the Book of Job MET DP816554.jpg", trim: true, role: "beside Job 40" },
  { n: 2049, id: "callot-anthony", title: "The Temptation of Saint Anthony", by: ["Jacques Callot", "1635"], file: "Jacques Callot, The Temptation of Saint Anthony (second version), 1635, NGA 60896.jpg", role: "Home rotation", hero: { focusY: 40 } },
  { n: 2050, id: "durer-knight-death-devil", title: "Knight, Death and the Devil", by: ["Albrecht Dürer", "1513"], file: "Knight, Death, and the Devil MET DP815737.jpg", trim: true, role: "settings sidebar" },
  { n: 2051, id: "levi-baphomet", title: "Baphomet", by: ["Éliphas Lévi, Dogme et rituel de la haute magie", "1856"], file: "Baphomet.png", trim: true, role: "model corner" },
  // Alchemy and the hermetic books, for the symbols
  { n: 2060, id: "maier-squared-circle", title: "Make a Circle of a Man and Woman", by: ["Michael Maier, Atalanta Fugiens, emblem XXI", "1617"], about: "The squared circle: the philosopher's stone", file: "Michael Maier Atalanta Fugiens Emblem 21.jpeg", role: "symbols" },
  { n: 2061, id: "khunrath-laboratory", title: "The Oratory and the Laboratory", by: ["Heinrich Khunrath, Amphitheatrum sapientiae aeternae", "1595"], file: "Alchemist's Laboratory, Heinrich Khunrath, Amphitheatrum sapientiae aeternae, 1595.jpg", role: "symbols", hero: { focusY: 45 } },
  { n: 2062, id: "khunrath-rose", title: "The Cosmic Rose", by: ["Heinrich Khunrath, Amphitheatrum sapientiae aeternae", "1595"], file: "Amphitheatrum sapientiae aeternae - The cosmic rose.jpg", role: "symbols" },
  { n: 2063, id: "khunrath-four-three-two-one", title: "The Four, the Three, the Two and the One", by: ["Heinrich Khunrath, Amphitheatrum sapientiae aeternae", "1595"], file: "The Four, the Three, the Two, and the One.jpg", role: "symbols" },
  { n: 2064, id: "emerald-tablet", title: "The Emerald Tablet", by: ["Heinrich Khunrath, Amphitheatrum sapientiae aeternae", "1606"], file: "Emerald tablet.jpg", role: "symbols" },
  { n: 2065, id: "dee-monas", title: "Monas Hieroglyphica", by: ["John Dee", "1564"], about: "The title page, with the monad", file: "Monas Hieroglyphica.jpg", role: "symbols" },
  { n: 2066, id: "fludd-utriusque", title: "The Macrocosm and the Microcosm", by: ["Robert Fludd, Utriusque cosmi historia", "1617"], file: "Robert Fludd Utriusque cosmi.jpg", role: "symbols" },
  { n: 2067, id: "fludd-anima-mundi", title: "The Soul of the World", by: ["Robert Fludd, Utriusque cosmi historia", "1617"], file: "Anima Mundi (by Robert Fludd, Utriusque Cosmi Historia, 1617).png", role: "symbols" },
  { n: 2068, id: "mutus-liber", title: "Jacob's Ladder", by: ["Mutus Liber, plate 1", "1677"], about: "The Mute Book: an alchemy told in fifteen plates and no words", file: "Mutus liber 1677 1.jpg", role: "symbols" },
  // The Masons' charts, for the lodge
  { n: 2070, id: "masonic-chart-1846", title: "Masonic Chart", by: ["American lithograph", "1846"], about: "The emblems of the three degrees", file: "Masonic chart LCCN2004670261.jpg", role: "lodge", hero: { focusY: 40 } },
  { n: 2071, id: "masonic-chart-1872", title: "Masonic Chart", by: ["American lithograph", "1872"], file: "Masonic chart LCCN2003656410.jpg", role: "lodge" },
  { n: 2072, id: "masonic-chart-1876", title: "The Masonic Chart", by: ["American lithograph", "1876"], file: "The masonic chart LCCN2002710037.jpg", role: "lodge" },
  { n: 2073, id: "emblematic-chart-1877", title: "Emblematic Chart and Masonic History", by: ["Ramsey, Millett and Hudson", "1877"], file: "Emblematic chart and Masonic history of F(ree) and A(ccepted) M(asons) - Ramsey, Millet, & Hudson Steam. Lith. Co. LCCN91784508.jpg", role: "lodge" },
  { n: 2074, id: "fellow-craft", title: "Fellow Craft", by: ["American print", "19th century"], about: "The winding stair to the middle chamber", file: "Fellow craft LCCN2003671743.jpg", role: "lodge" },
  { n: 2075, id: "tracing-board-engraving", title: "A Tracing Board", by: ["Engraving", "1850-1900"], file: "VM 16145-003 - Engraving of a Masonic tracing board - 1850-1900.jpg", role: "lodge" },
];

/** The paintings, as painted. `place` is where it hangs (Italian state museums restrict commercial reproduction). */
export const PAINTINGS = [
  { id: "garden-of-earthly-delights", title: "The Garden of Earthly Delights", artist: "Hieronymus Bosch", year: "c. 1490-1500", ref: null, about: "Eden, the world after it, and hell, in one triptych", place: "Museo del Prado, Madrid", file: "The Garden of Earthly Delights by Bosch High Resolution.jpg" },
  { id: "bosch-last-judgment", title: "The Last Judgment", artist: "Hieronymus Bosch", year: "c. 1482", ref: "Matt.25.31-33", place: "Academy of Fine Arts, Vienna", file: "Hieronymus Bosch - The Last Judgement.jpg" },
  { id: "bosch-hell", title: "Hell (Visions of the Hereafter)", artist: "Hieronymus Bosch", year: "c. 1505-15", ref: null, about: "The last of four panels: the damned and their devils at the bottom of the dark", place: "Palazzo Grimani, Venice", file: "Accademia - Visioni dell'Aldilà - L'inferno - Bosch.jpg" },
  { id: "bosch-ascent", title: "The Ascent of the Blessed (Visions of the Hereafter)", artist: "Hieronymus Bosch", year: "c. 1505-15", ref: null, about: "Angels lift the saved toward a tunnel of light", place: "Palazzo Grimani, Venice", file: "Hieronymus Bosch 013.jpg" },
  { id: "fall-of-the-rebel-angels", title: "The Fall of the Rebel Angels", artist: "Pieter Bruegel the Elder", year: "1562", ref: "Rev.12.7-9", place: "Royal Museums of Fine Arts of Belgium, Brussels", file: "Pieter Bruegel the Elder - The Fall of the Rebel Angels - Google Art Project.jpg" },
  { id: "dulle-griet", title: "Dulle Griet (Mad Meg)", artist: "Pieter Bruegel the Elder", year: "1563", ref: null, about: "Mad Meg leads an army of women to plunder the mouth of hell", place: "Museum Mayer van den Bergh, Antwerp", file: "Dulle Griet, by Pieter Brueghel (I).jpg" },
  { id: "memling-last-judgment", title: "The Last Judgment", artist: "Hans Memling", year: "c. 1467-71", ref: "Matt.25.32-33", place: "National Museum, Gdańsk", file: "Das Jüngste Gericht (Memling).jpg" },
  { id: "michelangelo-last-judgment", title: "The Last Judgment", artist: "Michelangelo", year: "1536-41", ref: "Matt.24.30-31", place: "Sistine Chapel, Vatican City", medium: "fresco", file: "Last Judgement (Michelangelo).jpg" },
  { id: "signorelli-damned", title: "The Damned", artist: "Luca Signorelli", year: "1499-1502", ref: "Rev.20.15", place: "Orvieto Cathedral", medium: "fresco", file: "Luca Signorelli - The Damned - WGA21220.jpg" },
  { id: "giotto-last-judgment", title: "The Last Judgment", artist: "Giotto", year: "c. 1306", ref: "Matt.25.31", place: "Scrovegni Chapel, Padua", medium: "fresco", file: "Giotto di Bondone - Last Judgment - WGA09228.jpg" },
  { id: "fra-angelico-last-judgment", title: "The Last Judgment", artist: "Fra Angelico", year: "c. 1431", ref: "Matt.25.34", place: "Museo di San Marco, Florence", medium: "tempera on panel", file: "Fra Angelico - Last Judgement - WGA00467.jpg" },
  { id: "lochner-last-judgment", title: "The Last Judgment", artist: "Stefan Lochner", year: "c. 1435", ref: "Matt.25.41", place: "Wallraf-Richartz-Museum, Cologne", file: "Stefan Lochner - Last Judgement - circa 1435.jpg" },
  { id: "van-eyck-last-judgment", title: "The Crucifixion; The Last Judgment", artist: "Jan van Eyck and workshop", year: "c. 1436-38", ref: "Rev.20.13", place: "The Metropolitan Museum of Art, New York", file: "The Crucifixion; The Last Judgment MET DT25.jpg", licence: "CC0 (The Met Open Access)" },
  { id: "botticelli-map-of-hell", title: "The Map of Hell", artist: "Sandro Botticelli", year: "c. 1480-90", ref: null, about: "Dante's hell as one funnel, circle by circle, down to Lucifer", place: "Vatican Library", medium: "silverpoint, ink and tempera on parchment", file: "Sandro Botticelli - La Carte de l'Enfer.jpg" },
  { id: "mouth-of-hell", title: "The Mouth of Hell", artist: "Master of Catherine of Cleves", year: "c. 1440", ref: null, about: "A page of a Book of Hours: hell as a mouth, a castle of devils inside it", place: "The Morgan Library and Museum, New York", medium: "illumination on vellum", file: "Master of Catherine of Cleves - Mouth of Hell; Final Absolution - Google Art Project.jpg" },
  { id: "raphael-st-michael", title: "Saint Michael and the Dragon", artist: "Raphael", year: "c. 1503-05", ref: "Rev.12.7", place: "Musée du Louvre, Paris", medium: "oil on panel", file: "Raffaello Sanzio - St Michael and the Dragon - WGA18633.jpg" },
  { id: "raphael-vision-of-ezekiel", title: "The Vision of Ezekiel", artist: "Raphael", year: "1518", ref: "Ezek.1.5-6", place: "Palazzo Pitti, Florence", medium: "oil on panel", file: "Raffaello Sanzio - The Vision of Ezekiel - WGA18874.jpg" },
  { id: "blake-great-red-dragon", title: "The Great Red Dragon and the Woman Clothed with the Sun", artist: "William Blake", year: "c. 1805", ref: "Rev.12.3-4", place: "National Gallery of Art, Washington", medium: "watercolour", file: "William Blake - The Great Red Dragon and the Woman Clothed with the Sun - Google Art Project.jpg" },
  { id: "blake-number-of-the-beast", title: "The Number of the Beast is 666", artist: "William Blake", year: "c. 1805", ref: "Rev.13.18", place: "Rosenbach Museum and Library, Philadelphia", medium: "watercolour", file: "The number of the beast is 666 Philadelphia, Rosenbach Museum and Library.jpg" },
  { id: "martin-pandemonium", title: "Pandemonium", artist: "John Martin", year: "1841", ref: null, about: "Milton's capital of hell, raised by the fallen angels (Paradise Lost, Book I)", place: "Musée du Louvre, Paris", file: "John Martin Le Pandemonium Louvre.JPG" },
  // Tracing boards: the emblems of each degree, laid out for the lecture
  ...["First", "Second", "Third"].map((d, i) => ({ id: `bowring-tracing-board-${i + 1}`, title: `${d} Degree Tracing Board`, artist: "Josiah Bowring", year: "1819", ref: null, about: `The emblems of the ${d.toLowerCase()} degree, for the lecture`, place: "Museum of Freemasonry, London", medium: "oil on canvas", file: `Josiah Bowring (1757-1832) - ${d} Degree Tracing Board - D2009-41${"i".repeat(i + 1)} - Museum of Freemasonry.jpg` })),
  ...["First", "Second", "Third"].map((d, i) => ({ id: `tracing-board-1832-${i + 1}`, title: `${d} Degree Tracing Board`, artist: "Unknown artist", year: "1832", ref: null, about: `The emblems of the ${d.toLowerCase()} degree`, place: "Museum of Freemasonry, London", medium: "oil on canvas", file: `Unknown artist - ${d} Degree Tracing Board - D2009-90${"i".repeat(i + 1)} - Museum of Freemasonry.jpg` })),
  // Splendor Solis: the seven planets' flasks
  ...[
    [12, "saturn", "Saturn", "Dragon and child"],
    [13, "jupiter", "Jupiter", "Three birds"],
    [14, "mars", "Mars", "Triple-headed bird"],
    [15, "sun", "Sun", "Triple-headed dragon"],
    [16, "venus", "Venus", "Peacock's Tail"],
    [17, "mercury", "Mercure", "The White Queen"],
    [18, "moon", "Moon", "The Red King"],
  ].map(([n, id, planet, what]) => ({ id: `splendor-solis-${id}`, title: `${planet === "Mercure" ? "Mercury" : planet}: ${what}`, artist: "Splendor Solis", year: "16th century", ref: null, about: `The flask of ${planet === "Mercure" ? "Mercury" : planet}, a stage of the work, its planet's chariot above`, place: "Splendor Solis, illuminated manuscript", medium: "illumination", file: `Splendor Solis. Image ${n} - ${planet} - ${what}.jpg` })),
];

/**
 * The Goetia's seals by spirit number: the Commons series from the 1904
 * edition (Category:Ars Goetia sigils), public domain. Some spirits have two
 * seals in the book; both are kept, in its order.
 */
export const SEALS = {
  1: ["01-Bael seal.png"],
  2: ["02-Agares seal.png"],
  3: ["03-Vassago seal.png"],
  4: ["04-Samigina seal.png"],
  5: ["05-Marbas seal.png"],
  6: ["06-Valefor seal.png"],
  7: ["07-Amon seal.png"],
  8: ["08-Barbatos seal.png"],
  9: ["09-Paimon seal01.png","09-Paimon seal02.png"],
  10: ["10-Buer seal.png"],
  11: ["11-Gusion seal.png"],
  12: ["12-Sitri seal.png"],
  13: ["13-Beleth seal01.png","13-Beleth seal02.png"],
  14: ["14-Leraie seal.png"],
  15: ["15-Eligos seal.png"],
  16: ["16-Zepar seal.png"],
  17: ["17-Botis seal.png"],
  18: ["18-Bathin seal01.png","18-Bathin seal02.png"],
  19: ["19-Sallos seal.png"],
  20: ["20-Purson seal.png"],
  21: ["21-Marax seal.png"],
  22: ["22-Ipos seal.png"],
  23: ["23-Aim seal.png"],
  24: ["24-Naberius seal.png"],
  25: ["25-Glasya-Labolas seal.png"],
  26: ["26-Bune seal01.png","26-Bune seal02.png"],
  27: ["27-Ronove seal.png"],
  28: ["28-Berith seal.png"],
  29: ["29-Astaroth seal.png"],
  30: ["30-Forneus seal.png"],
  31: ["31-Foras seal.png"],
  32: ["32-Asmoday seal.png"],
  33: ["33-Gaap seal.png"],
  34: ["34-Furfur seal.png"],
  35: ["35-Marchosias seal.png"],
  36: ["36-Stolas seal.png"],
  37: ["37-Phenex seal.png"],
  38: ["38-Halphus seal.png"],
  39: ["39-Malphas.png"],
  40: ["40-Raum seal.png"],
  41: ["41-Focalor seal.png"],
  42: ["42-Vepar seal01.png","42-Vepar seal02.png"],
  43: ["43-Sabnock seal.png"],
  44: ["44-Shax seal.png"],
  45: ["45-Vine seal.png"],
  46: ["46-Bifrons seal.png"],
  47: ["47-Vual seal01.png","47-Vual seal02.png"],
  48: ["48-Haagenti seal.png"],
  49: ["49-Crocell seal.png"],
  50: ["50-Furcas seal.png"],
  51: ["51-Balam seal.png"],
  52: ["52-Alloces seal.png"],
  53: ["53-Camio seal.png"],
  54: ["54-Murmur seal.png"],
  55: ["55-Orobas seal.png"],
  56: ["56-Gremory seal.png"],
  57: ["57-Ose seal.png"],
  58: ["58-Amy seal.png"],
  59: ["59-Orias seal.png"],
  60: ["60-Vapula seal.png"],
  61: ["61-Zagan seal.png"],
  62: ["62-Valac seal.png"],
  63: ["63-Andras seal.png"],
  64: ["64-Haures seal.png"],
  65: ["65-Andrealphus seal.png"],
  66: ["66-Cimeies seal.png"],
  67: ["67-Amdusias seal.png"],
  68: ["68-Belial seal.png"],
  69: ["Decarabia seal.png"],
  70: ["70-Seere seal01.png","70-Seere seal02.png"],
  71: ["71-Dantalion seal.png"],
  72: ["72-Andromalius seal.png"],
};
const SEAL_SIZE = 360;

const PAINT_WIDTH = 2000;
const THUMB = 520;
const TONE_WIDTH = 1200;
const MEAN = 118; // every hero tone brought to this average, as in literary.mjs

function parseRef(s) {
  if (!s) return null;
  const m = /^([1-4]?[A-Za-z]+)\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(s);
  if (!m) throw new Error(`bad ref ${s}`);
  return { book: m[1], chapter: +m[2], verse: +m[3], ...(m[4] ? { verseEnd: +m[4] } : {}) };
}
const refText = (r) => (r ? `${r.book} ${r.chapter}:${r.verse}${r.verseEnd ? `-${r.verseEnd}` : ""}` : "");
const DEUTERO = new Set(["Tob", "Jdt", "AddEsth", "Wis", "Sir", "Bar", "EpJer", "PrAzar", "Sus", "Bel", "DanGr", "1Macc", "2Macc", "3Macc", "4Macc", "1Esd", "2Esd", "PrMan", "AddPs", "1En"]);
const NT = new Set(["Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John", "2John", "3John", "Jude", "Rev"]);
const section = (r) => (!r ? "ot" : NT.has(r.book) ? "nt" : DEUTERO.has(r.book) ? "deutero" : "ot");
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const keyOf = (file) => file.replace(/[^\w.-]+/g, "_");

async function info(file) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${file}`)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=2400&format=json&formatversion=2`;
  const page = (await (await fetch(url, { headers: UA })).json()).query.pages[0];
  if (page.missing || !page.imageinfo) throw new Error(`missing on Commons: ${file}`);
  const ii = page.imageinfo[0];
  const licence = ii.extmetadata?.LicenseShortName?.value ?? "";
  if (!ALLOWED.test(licence.trim())) throw new Error(`refused ${file}: licence "${licence}" is not public domain or CC0`);
  // A small file is taken whole; a large one at 2400 wide.
  return { url: ii.width > 2400 && ii.thumburl ? ii.thumburl : ii.url, page: ii.descriptionurl, licence };
}

/** The cached download of a Commons file and what Commons says of it. */
async function download(file, processOnly) {
  const img = join(SRC, `${keyOf(file)}.img`);
  const metaFile = join(SRC, `${keyOf(file)}.json`);
  if (processOnly || (existsSync(img) && existsSync(metaFile))) return { img, ...JSON.parse(readFileSync(metaFile, "utf8")) };
  const i = await info(file);
  console.log(`  fetch ${file}`);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(i.url, { headers: UA });
    if (res.ok) {
      writeFileSync(img, Buffer.from(await res.arrayBuffer()));
      break;
    }
    if (attempt >= 5 || res.status !== 429) throw new Error(`${file}: HTTP ${res.status}`);
    await wait(15000 * (attempt + 1)); // Commons rate-limits bursts
  }
  writeFileSync(metaFile, JSON.stringify(i));
  await wait(1200);
  return { img, ...i };
}

/** A plate on white: cropped, its paper trimmed if asked. */
async function plateBase(p, img) {
  let base = sharp(readFileSync(img)).flatten({ background: "#ffffff" });
  if (p.crop) {
    const { width, height } = await base.metadata();
    const [l, t, cw, ch] = p.crop;
    base = sharp(await base.extract({ left: Math.round(l * width), top: Math.round(t * height), width: Math.round(cw * width), height: Math.round(ch * height) }).toBuffer());
  }
  if (p.trim) base = sharp(await base.trim({ threshold: 60 }).toBuffer());
  return sharp(await base.toBuffer());
}

/** Grayscale, levels stretched like the other plates: a full and a thumb JPEG. */
async function renderPlate(p, base) {
  const out = {};
  for (const [name, width] of [["full", 1000], ["thumb", 400]]) {
    const file = `${p.id}${name === "thumb" ? "-thumb" : ""}.jpg`;
    const { data, info } = await base.clone().grayscale().resize({ width, height: width, fit: "inside", withoutEnlargement: true }).normalise({ lower: 2, upper: 97 }).raw().toBuffer({ resolveWithObject: true });
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } }).jpeg({ quality: 62, mozjpeg: true }).toFile(join(OUT, file));
    out[name] = { file, width: info.width, height: info.height, dir: DIR };
  }
  return out;
}

/** A hero: the tone the app dithers live, bent to MEAN, and the untouched engraving. */
async function renderHero(p, base) {
  const { data, info: raw } = await base.clone().grayscale().resize({ width: TONE_WIDTH }).normalise({ lower: 1, upper: 96 }).raw().toBuffer({ resolveWithObject: true });
  const mean = data.reduce((a, v) => a + v, 0) / data.length;
  const k = Math.log(MEAN / 255) / Math.log(Math.max(1, mean) / 255);
  for (let i = 0; i < data.length; i++) data[i] = Math.round(255 * (data[i] / 255) ** k);
  const tone = `${p.id}-tone.jpg`;
  const info = await sharp(data, { raw: { width: raw.width, height: raw.height, channels: 1 } }).jpeg({ quality: 76, mozjpeg: true }).toFile(join(OUT, tone));
  const src = `${p.id}-src.jpg`;
  await base.clone().grayscale().resize({ width: TONE_WIDTH, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(join(OUT, src));
  return { id: `hero-${p.id}`, plate: p.id, title: p.title, work: p.about, artist: p.by[0], focusY: p.hero.focusY, algo: "atkinson", file: tone, tone, src, dir: DIR, width: info.width, height: info.height, rose: true };
}

/** Whether a painting is in colour, how dark it is and where its light falls (as in paintings.mjs). */
async function measure(buf) {
  const { data, info } = await sharp(buf).resize({ width: 160, height: 160, fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const lum = new Float32Array(n);
  const spread = new Array(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    spread[i] = Math.max(r, g, b) - Math.min(r, g, b);
  }
  spread.sort((a, b) => a - b);
  const colour = spread[Math.floor(n * 0.98)] - spread[n >> 1] > 25;
  const cut = Float32Array.from(lum).sort()[Math.floor(n * 0.9)];
  let sx = 0, sy = 0, c = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (lum[y * info.width + x] >= cut) {
        sx += x;
        sy += y;
        c++;
      }
  return {
    colour,
    key: Math.round(lum.reduce((a, b) => a + b, 0) / n),
    dark: Math.round((lum.reduce((k, v) => k + (v < 40 ? 1 : 0), 0) / n) * 100) / 100,
    lightX: Math.round((sx / c / info.width) * 100),
    lightY: Math.round((sy / c / info.height) * 100),
  };
}

async function renderPainting(p, img) {
  const buf = readFileSync(img);
  const m = await measure(buf);
  const base = () => sharp(buf).rotate().toColourspace("srgb");
  const shown = await base().resize({ width: PAINT_WIDTH, height: PAINT_WIDTH, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer({ resolveWithObject: true });
  const file = `${p.id}.jpg`;
  writeFileSync(join(OUT, file), shown.data);
  const thumb = await base().resize({ width: THUMB, height: THUMB, fit: "inside" }).jpeg({ quality: 78, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  const thumbFile = `${p.id}-thumb.jpg`;
  writeFileSync(join(OUT, thumbFile), thumb.data);
  return { m, full: { file, width: shown.info.width, height: shown.info.height, dir: DIR }, thumb: { file: thumbFile, width: thumb.info.width, height: thumb.info.height, dir: DIR } };
}

/** A seal as ink on nothing: the darkness of each pixel becomes its alpha. */
async function renderSeal(n, k, img) {
  const file = `seal-${String(n).padStart(2, "0")}${k ? `-${k + 1}` : ""}.png`;
  const { data, info } = await sharp(readFileSync(img))
    .flatten({ background: "#ffffff" })
    .grayscale()
    .trim({ threshold: 40 })
    .resize({ width: SEAL_SIZE, height: SEAL_SIZE, fit: "contain", background: "#ffffff" })
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < data.length; i++) rgba[i * 4 + 3] = 255 - data[i];
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9, palette: true }).toFile(join(OUT, file));
  return file;
}

async function main() {
  const processOnly = process.argv.includes("--process");
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const plates = [], heroes = [], paintings = [], credits = [];
  for (const p of PLATES) {
    let d;
    try {
      d = await download(p.file, processOnly);
    } catch (e) {
      console.log(`  skip ${p.id}: ${e.message}`);
      continue;
    }
    const base = await plateBase(p, d.img);
    const ref = parseRef(p.ref);
    plates.push({ n: p.n, id: p.id, title: p.title, ...(p.about ? { alt: p.about } : {}), refText: refText(ref), ref, section: section(ref), source: d.page, artist: p.by[0], year: p.by[1], licence: d.licence, role: p.role, rose: true, ...(await renderPlate(p, base)) });
    if (p.hero) heroes.push({ ...(await renderHero(p, base)), source: d.page });
    credits.push(`| ${p.title} | ${p.by[0]}, ${p.by[1]} | ${p.ref ?? p.about ?? "-"} | ${p.role}${p.hero ? ", hero" : ""} | ${d.licence} | [Commons](${d.page}) |`);
    console.log(`  plate ${p.n} ${p.id}${p.hero ? " + hero" : ""}`);
  }
  const seals = [];
  for (const [n, files] of Object.entries(SEALS)) {
    const out = [];
    for (const [k, f] of files.entries()) {
      const d = await download(f, processOnly);
      out.push(await renderSeal(+n, k, d.img));
      if (k === 0) credits.push(`| Seal of spirit ${n} | The Goetia, 1904 (Decarabia from de Laurence's 1916 reprint) | Goetia ${n} | bestiary | ${d.licence} | [Commons](${d.page}) |`);
    }
    seals.push({ n: +n, files: out, dir: DIR });
  }
  console.log(`  ${seals.length} seals`);
  for (const p of PAINTINGS) {
    let d;
    try {
      d = await download(p.file, processOnly);
    } catch (e) {
      console.log(`  skip ${p.id}: ${e.message}`);
      continue;
    }
    const { m, full, thumb } = await renderPainting(p, d.img);
    const licence = p.licence ?? `${d.licence} (PD-Art)`;
    paintings.push({
      id: p.id,
      title: p.title,
      artist: p.artist,
      year: p.year,
      ref: parseRef(p.ref),
      ...(p.about ? { about: p.about } : {}),
      medium: p.medium ?? "oil on panel",
      place: p.place,
      colour: m.colour,
      key: m.key,
      dark: m.dark,
      focusX: m.lightX,
      focusY: m.lightY,
      source: d.page,
      licence,
      rose: true,
      full,
      thumb,
    });
    credits.push(`| ${p.title} | ${p.artist}, ${p.year} | ${p.ref ?? p.about} | painting (${p.place}) | ${licence} | [Commons](${d.page}) |`);
    console.log(`  painting ${p.id} ${m.colour ? "colour" : "mono"} key ${m.key} ${full.width}x${full.height}`);
  }
  writeFileSync(join(OUT, "plates.json"), JSON.stringify(plates));
  writeFileSync(join(OUT, "heroes.json"), JSON.stringify(heroes));
  writeFileSync(join(OUT, "paintings.json"), JSON.stringify(paintings));
  writeFileSync(join(OUT, "seals.json"), JSON.stringify(seals));
  writeFileSync(
    join(ROOT, "docs", "curios-credits.md"),
    `# Sub Rosa art credits\n\nThe art shown only under the rose (docs/SUBROSA.md): every work public domain; every scan a Wikimedia Commons file tagged\n` +
      `public domain (PD-Art) or a museum's own CC0 release, as listed. Several paintings hang in Italian state museums, whose\n` +
      `Cultural Heritage Code restricts commercial reproduction there; check before selling a build.\n` +
      `Generated by \`scripts/art/curios.mjs\`; do not edit by hand.\n\n` +
      `| Work | Artist | Passage or subject | Used for | Licence | Source |\n|---|---|---|---|---|---|\n${credits.join("\n")}\n`,
  );
  console.log(`  ${plates.length} plates, ${heroes.length} heroes, ${paintings.length} paintings, ${seals.length} seals -> public/art/curios/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

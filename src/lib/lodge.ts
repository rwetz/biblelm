// Sub Rosa's lodge (docs/SUBROSA.md): Freemasonry as a reference shelf. The
// degrees and the bodies that confer them, the officers of a lodge and their
// stations and jewels, the numbers, and the dates. Kept to what the Wikipedia
// articles on Freemasonry, the Scottish Rite, the York Rite, Royal Arch
// Masonry and lodge officers state; the emblems themselves are symbols
// (src/lib/symbols.ts, family "masonic").

export interface Degree {
  n?: number;
  name: string;
  /** Its working tools or emblem, or what it is about. */
  note?: string;
}

export interface Body {
  name: string;
  /** Which degrees it confers, as a range, e.g. "4 to 14". */
  range?: string;
  degrees: Degree[];
}

export interface Rite {
  id: string;
  name: string;
  gist: string;
  bodies: Body[];
}

const SR = (n: number, name: string, note?: string): Degree => ({ n, name, ...(note ? { note } : {}) });

export const RITES: Rite[] = [
  {
    id: "craft",
    name: "The Craft",
    gist: "The blue lodge: the three degrees every Mason takes first.",
    bodies: [
      {
        name: "The lodge",
        range: "1 to 3",
        degrees: [
          { n: 1, name: "Entered Apprentice", note: "Initiated. The twenty-four-inch gauge and the common gavel; the rough ashlar" },
          { n: 2, name: "Fellowcraft", note: "Passed. The square, level and plumb; the pillars and the winding stair; the letter G" },
          { n: 3, name: "Master Mason", note: "Raised. The trowel; the legend of Hiram Abif, the acacia, the lost word" },
        ],
      },
    ],
  },
  {
    id: "york",
    name: "The York Rite",
    gist: "Also the American Rite: three bodies after the lodge, the last for Christians only.",
    bodies: [
      {
        name: "Royal Arch Chapter",
        degrees: [
          { name: "Mark Master Mason", note: "The keystone" },
          { name: "Past Master (Virtual)" },
          { name: "Most Excellent Master", note: "First named in Boston, 1769" },
          { name: "Royal Arch Mason", note: "The triple tau; the recovery of the lost word" },
        ],
      },
      {
        name: "Cryptic Council",
        degrees: [{ name: "Royal Master" }, { name: "Select Master" }, { name: "Super Excellent Master" }],
      },
      {
        name: "Commandery of Knights Templar",
        degrees: [
          { name: "Illustrious Order of the Red Cross" },
          { name: "Order of Malta", note: "With the passing Order of St Paul" },
          { name: "Order of the Temple", note: "A crowned cross on a cross pattée: In hoc signo vinces" },
        ],
      },
    ],
  },
  {
    id: "scottish",
    name: "The Scottish Rite",
    gist: "Thirty more degrees, 4 to 33: degrees of instruction, not of rank. Founded at Charleston, 31 May 1801.",
    bodies: [
      {
        name: "Lodge of Perfection",
        range: "4 to 14",
        degrees: [
          SR(4, "Secret Master"),
          SR(5, "Perfect Master"),
          SR(6, "Intimate Secretary"),
          SR(7, "Provost and Judge"),
          SR(8, "Intendant of the Building"),
          SR(9, "Elu of the Nine"),
          SR(10, "Elu of the Fifteen"),
          SR(11, "Elu of the Twelve"),
          SR(12, "Master Architect"),
          SR(13, "Royal Arch of Solomon"),
          SR(14, "Perfect Elu"),
        ],
      },
      {
        name: "Chapter of Rose Croix",
        range: "15 to 18",
        degrees: [SR(15, "Knight of the East, or of the Sword"), SR(16, "Prince of Jerusalem"), SR(17, "Knight of the East and West"), SR(18, "Knight Rose Croix", "The rose cross")],
      },
      {
        name: "Council of Kadosh",
        range: "19 to 30",
        degrees: [
          SR(19, "Grand Pontiff"),
          SR(20, "Master of the Symbolic Lodge"),
          SR(21, "Noachite, or Prussian Knight"),
          SR(22, "Knight of the Royal Axe, or Prince of Libanus"),
          SR(23, "Chief of the Tabernacle"),
          SR(24, "Prince of the Tabernacle"),
          SR(25, "Knight of the Brazen Serpent"),
          SR(26, "Prince of Mercy, or Scottish Trinitarian"),
          SR(27, "Knight of the Sun, or Prince Adept"),
          SR(28, "Knight Commander of the Temple"),
          SR(29, "Scottish Knight of Saint Andrew"),
          SR(30, "Knight Kadosh, or Knight of the White and Black Eagle"),
        ],
      },
      {
        name: "Consistory",
        range: "31 to 32",
        degrees: [SR(31, "Inspector Inquisitor"), SR(32, "Master of the Royal Secret", "The double-headed eagle")],
      },
      {
        name: "Supreme Council",
        range: "33",
        degrees: [SR(33, "Inspector General", "Conferred for service; ordo ab chao")],
      },
    ],
  },
];

export interface Officer {
  name: string;
  station: string;
  jewel: string;
  duty: string;
  /** A symbol drawn for its jewel, when there is one (src/lib/symbols.ts). */
  mark?: string;
}

/** The officers of a Craft lodge in order, the progressive line first. */
export const OFFICERS: Officer[] = [
  { name: "Worshipful Master", station: "East", jewel: "The square", duty: "Rules and governs the lodge", mark: "square-compasses" },
  { name: "Senior Warden", station: "West", jewel: "The level", duty: "The Master's deputy; closes the lodge at his command", mark: "level" },
  { name: "Junior Warden", station: "South", jewel: "The plumb", duty: "Calls the brethren from labour to refreshment", mark: "plumb" },
  { name: "Senior Deacon", station: "East, at the Master's right", jewel: "A dove, in England", duty: "Conducts candidates; carries the Master's messages" },
  { name: "Junior Deacon", station: "West, at the Senior Warden's right", jewel: "A dove, in England", duty: "Carries the Senior Warden's messages; guards the inner door in some lodges" },
  { name: "Treasurer", station: "East", jewel: "Crossed keys", duty: "Keeps the accounts and collects the dues" },
  { name: "Secretary", station: "East", jewel: "Crossed pens", duty: "Summons, minutes and returns to Grand Lodge" },
  { name: "Chaplain", station: "East", jewel: "An open book", duty: "Prayers and grace" },
  { name: "Stewards", station: "Beside the Junior Warden", jewel: "A cornucopia", duty: "Junior assistants; the refreshment" },
  { name: "Inner Guard", station: "Inside the door", jewel: "Crossed swords", duty: "Admits the qualified" },
  { name: "Tyler", station: "Outside the door, with a drawn sword", jewel: "A sword", duty: "Keeps off intruders" },
  { name: "Immediate Past Master", station: "East, at the Master's left", jewel: "The forty-seventh problem of Euclid, in England", duty: "Advises the Master", mark: "euclid-47" },
];

export interface Num {
  n: string;
  what: string;
  /** A symbol to open, by id. */
  symbol?: string;
}

export const NUMBERS: Num[] = [
  { n: "3", what: "The Craft degrees; the principal officers; the great and lesser lights; the ruffians of the Hiram legend; the first Grand Masters (Solomon, Hiram of Tyre, Hiram Abif). Three rule a lodge.", symbol: "great-lights" },
  { n: "4", what: "The cardinal virtues: fortitude, prudence, temperance and justice." },
  { n: "5", what: "Five hold a lodge. The orders of architecture (Tuscan, Doric, Ionic, Corinthian, Composite); the senses; the points of fellowship.", symbol: "stair" },
  { n: "7", what: "Seven make it perfect. The liberal arts and sciences: grammar, rhetoric, logic, arithmetic, geometry, music, astronomy.", symbol: "stair" },
  { n: "15", what: "The steps of the winding stair: three, five and seven.", symbol: "stair" },
  { n: "24", what: "The inches of the gauge and the hours of the day.", symbol: "gauge" },
  { n: "33", what: "The degrees of the Scottish Rite; the highest, given for service." },
  { n: "47", what: "Euclid's forty-seventh proposition, the Past Master's jewel.", symbol: "euclid-47" },
  { n: "4000", what: "Added to the year for Anno Lucis, the year of light: Masonic dating counts from the Creation, 4000 BC." },
];

/** When things happened, as the articles date them. */
export const DATES: [string, string][] = [
  ["c. 1390", "The Regius Poem, the oldest of the Old Charges, the masons' own histories"],
  ["1598", "The earliest lodge minutes, the Lodge of Edinburgh (Mary's Chapel)"],
  ["24 June 1717", "Four London lodges form the first Grand Lodge, on St John the Baptist's day"],
  ["1723", "Anderson's Constitutions, the first to name \"Hiram Abif\""],
  ["1730", "Samuel Prichard's Masonry Dissected, the first exposure of the three degrees and the Hiram legend"],
  ["1738", "Clement XII's In eminenti, the first papal ban"],
  ["1743", "The Royal Arch first recorded, at Youghal, Ireland"],
  ["1751", "The Antients' Grand Lodge, rivals to the \"Moderns\""],
  ["1761", "Estienne Morin's patent for the New World; his Rite of the Royal Secret has 25 degrees"],
  ["31 May 1801", "The Supreme Council of the Thirty-third Degree opens at Shepheard's Tavern, Charleston"],
  ["27 December 1813", "Antients and Moderns unite as the United Grand Lodge of England"],
  ["1826", "William Morgan disappears before publishing an exposure; the Anti-Masonic Party follows"],
  ["1859", "Albert Pike, Grand Commander of the Southern Jurisdiction"],
  ["1871", "Pike's Morals and Dogma"],
  ["1884", "Leo XIII's Humanum genus"],
  ["19 April 1897", "Léo Taxil confesses his twelve-year hoax of Masonic devil worship"],
  ["1983", "The Catholic Church's Declaration on Masonic Associations: membership forbidden, though excommunication is no longer automatic"],
];

/** The lodge's art: tracing boards (paintings) and the American charts (plates). */
export const LODGE_PAINTINGS = ["bowring-tracing-board-1", "bowring-tracing-board-2", "bowring-tracing-board-3", "tracing-board-1832-1", "tracing-board-1832-2", "tracing-board-1832-3"];
export const LODGE_PLATES = [2070, 2071, 2072, 2073, 2074, 2075];

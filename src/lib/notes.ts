// Notes about the Bible as a book: how it was translated, printed and
// numbered. Written by hand, short, and only what is well established. When a
// question is about the text rather than in it ("why is LORD in capitals?"),
// Jev may choose one of these; it never writes one. A note never stands in for
// Scripture: Search shows it beside the passages, labelled as a note.

export interface Note {
  id: string;
  title: string;
  /** What the note is about, as Jev reads it when choosing. */
  about: string;
  body: string[];
  /** Places to see it for yourself (OSIS). */
  see?: string[];
}

export const NOTES: Note[] = [
  {
    id: "lord",
    title: "LORD in capitals",
    about: "Why LORD or GOD is printed in capital letters in the Old Testament, and the divine name YHWH, Jehovah or Yahweh",
    body: [
      "Where the Hebrew has God's personal name, the four letters YHWH, most English Bibles print LORD in capitals. Jewish readers did not say the name aloud and read Adonai, “my Lord”, in its place, and translators followed that custom while marking where the name stands.",
      "Lord in ordinary type translates adonai, a title. Where the two come together (“Adonai YHWH”) the King James prints “Lord GOD”, so that LORD is not said twice. It gives the name as JEHOVAH in a handful of places, such as Exodus 6:3.",
    ],
    see: ["Exod.3.15", "Exod.6.3", "Ps.110.1"],
  },
  {
    id: "italics",
    title: "Words in italics",
    about: "Why some words in the King James Version are printed in italics",
    body: [
      "Italic words in the King James Version have no word behind them in the Hebrew or Greek. The translators added them so the English reads as a sentence, often a form of “to be”, and printed them differently so a reader can tell. They are not emphasis.",
    ],
    see: ["Ps.23.4", "Gen.1.2"],
  },
  {
    id: "red",
    title: "Words in red",
    about: "Why the words of Jesus are printed in red letters",
    body: [
      "Red-letter Bibles print the words Jesus speaks in red. The custom began with an edition of the King James Version published by Louis Klopsch in 1899; the original texts have no such marking, and editions sometimes differ on where a quotation begins and ends.",
    ],
    see: ["Matt.5.3", "John.14.6"],
  },
  {
    id: "numbers",
    title: "Chapters and verses",
    about: "Who divided the Bible into chapters and numbered verses, and when",
    body: [
      "The books were written without chapter or verse numbers. The chapters most Bibles use go back to Stephen Langton, about 1227. The New Testament verses were numbered by the printer Robert Estienne in his Greek New Testament of 1551, and the Geneva Bible of 1560 was the first whole English Bible with numbered verses.",
      "The divisions are a finding aid, not part of the text: some fall in the middle of a sentence.",
    ],
    see: ["Eph.5.21", "Eph.5.22"],
  },
  {
    id: "kjv",
    title: "The King James Version",
    about: "What the King James or Authorized Version is, when it was made, and why its spelling looks the way it does",
    body: [
      "The King James Version was made by about fifty scholars working in six companies and first printed in 1611, under James I of England. It was never formally authorized, though it is often called the Authorized Version.",
      "Most printings today, including this one, follow the Oxford revision of 1769, which modernized the spelling and corrected printing errors while keeping the 1611 wording.",
    ],
  },
  {
    id: "thou",
    title: "Thee, thou and ye",
    about: "Why the King James uses thee, thou, ye, and words ending in -eth and -est",
    body: [
      "The King James keeps distinctions that modern English lost. Thou and thee address one person; ye and you address more than one. So “ye must be born again” in John 3:7 is spoken to many, through Nicodemus.",
      "Endings such as -eth and -est are old verb forms: “he giveth” is “he gives”, “thou givest” is “you give”. Thou is not a special form for God; it was simply the singular.",
    ],
    see: ["John.3.7", "Luke.22.31"],
  },
  {
    id: "books",
    title: "Why Bibles have different books",
    about: "Why Protestant, Catholic and Orthodox Bibles contain different books, and what the Apocrypha or Deuterocanon is",
    body: [
      "Protestant Bibles have 66 books. Catholic Bibles add seven more to the Old Testament (Tobit, Judith, Wisdom, Sirach, Baruch, 1 and 2 Maccabees) and longer forms of Esther and Daniel; Orthodox Bibles include a few beyond those. These books come from the Greek Old Testament used by the early church.",
      "The 1611 King James printed them as the Apocrypha, between the Testaments. Many later printings left them out. You can choose which of these shelves BibleLM shows in Settings.",
    ],
  },
  {
    id: "selah",
    title: "Selah",
    about: "What the word Selah in the Psalms means",
    body: [
      "Selah appears 71 times in the Psalms and three times in Habakkuk. No one is certain what it means. It is usually taken as a musical or liturgical direction, perhaps a pause or a place to lift the voice, and it is not read as part of the sentence.",
    ],
    see: ["Ps.46.3", "Hab.3.3"],
  },
  {
    id: "pilcrow",
    title: "The paragraph mark ¶",
    about: "What the ¶ paragraph sign in the King James text means",
    body: [
      "The ¶ marks where the 1611 translators began a new paragraph, since every verse otherwise starts on its own line. The marks stop partway through Acts, and the reason has never been settled.",
    ],
    see: ["Gen.1.1", "Matt.5.1"],
  },
  {
    id: "strongs",
    title: "Strong's numbers",
    about: "What Strong's numbers are and how they link English words to Hebrew and Greek",
    body: [
      "James Strong's concordance of 1890 numbered every Hebrew and Greek word behind the King James text: H for Hebrew, G for Greek. The number lets you find every place the same original word stands, whatever English word translates it. In BibleLM, click a word in a translation that carries them to see its entry.",
    ],
  },
];

export const noteById = (id: string) => NOTES.find((n) => n.id === id);

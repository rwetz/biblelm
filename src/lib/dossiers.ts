// Sub Rosa's dossiers and symbols (docs/SUBROSA.md, S4): the curiosities,
// sorted. Every claim is tagged for where it comes from, and that sorting is
// the history lesson:
//
//   scripture  what the text itself says, with the verses
//   tradition  what churches, rabbis, scholars and poets made of it
//   folklore   legend and popular belief
//   modern     invented since about 1800
//
// Written by hand and fixed, like the Studies (src/lib/studies.ts): nothing
// here is generated. References are "Book.chapter.verse[-end]", checked by a
// test against the texts; "Read on" points at library sections by title and
// at shelf passages, checked too.

import type { OrnamentName } from "@/art/ornaments";
import { SYMBOLS, type SymbolFamily } from "./symbols";

export { FAMILIES, SYMBOLS, type SymbolFamily } from "./symbols";

export type ClaimTag = "scripture" | "tradition" | "folklore" | "modern";

export const TAGS: Record<ClaimTag, { label: string; gist: string }> = {
  scripture: { label: "Scripture", gist: "what the text says" },
  tradition: { label: "Tradition", gist: "what readers made of it" },
  folklore: { label: "Folklore", gist: "legend and popular belief" },
  modern: { label: "Modern invention", gist: "since about 1800" },
};

export interface Claim {
  tag: ClaimTag;
  text: string;
  /** Verses that bear it out, quoted under it. */
  refs?: string[];
}

/** Where to read on: a section of a library text (by title), or a passage in the reader. */
export type ReadOn = { library: string; section: string } | { passage: string };

export interface Curio {
  id: string;
  kind: "dossier" | "symbol";
  title: string;
  lede: string;
  /** The symbol drawn, or a dossier's mark. */
  mark?: OrnamentName;
  /** Plates (by number) and paintings (by id) that show it. */
  plates?: number[];
  paintings?: string[];
  /** A dossier's claims; a symbol may have none and only its facts. */
  claims: Claim[];
  read?: ReadOn[];
  /** A symbol's families, the first its own (src/lib/symbols.ts). */
  family?: SymbolFamily[];
  /** Its code point, hex, when Unicode has it. */
  unicode?: string;
  /** Facts, as label and value. */
  data?: [string, string][];
  /** Related symbols and dossiers, by id. */
  see?: string[];
}

export const DOSSIERS: Curio[] = [
  {
    id: "angels",
    kind: "dossier",
    title: "Biblically accurate angels",
    lede: "The wheels of eyes and the six wings belong to different beings, and most angels in the Bible are taken for men.",
    mark: "ophan",
    plates: [1015, 122, 12],
    paintings: ["raphael-vision-of-ezekiel"],
    claims: [
      { tag: "scripture", text: "The seraphim, heavenly beings only in Isaiah's vision, have six wings each: two cover the face, two the feet, and with two they fly.", refs: ["Isa.6.1-7"] },
      { tag: "scripture", text: "Ezekiel's living creatures, later called cherubim, have four faces (a man, a lion, an ox and an eagle), four wings, and straight legs ending in a calf's foot.", refs: ["Ezek.1.5-11", "Ezek.10.14-15"] },
      { tag: "scripture", text: "The eyes are on the wheels beside them, \"full of eyes round about\", and in Ezekiel 10 on the cherubim's whole bodies too.", refs: ["Ezek.1.15-18", "Ezek.10.12"] },
      { tag: "scripture", text: "Revelation's four beasts about the throne have six wings each and are full of eyes within, and they never rest from saying Holy, holy, holy.", refs: ["Rev.4.6-8"] },
      { tag: "scripture", text: "The messengers who speak to people come looking like men, plainly enough to be fed, wrestled and entertained unawares. No wings are mentioned.", refs: ["Gen.18.2", "Judg.13.6", "Heb.13.2"] },
      { tag: "scripture", text: "Only two angels are named in the Protestant canon, Michael and Gabriel. Raphael is named in Tobit, and Uriel in 2 Esdras and 1 Enoch.", refs: ["Dan.10.13", "Luke.1.19", "Tob.12.15", "2Esd.4.1"] },
      { tag: "tradition", text: "The nine choirs in three hierarchies come from Pseudo-Dionysius, about the year 500. The names are all in Scripture (thrones, dominions, principalities and powers are Paul's); the ranking is his.", refs: ["Col.1.16", "Eph.1.21"] },
      { tag: "modern", text: "\"Biblically accurate angel\" is an internet phrase of about 2020. Its pictures usually fold the wheels, the eyes and the six wings into one creature, which no single passage describes." },
    ],
    read: [{ library: "dionysius", section: "Caput VII" }, { passage: "Ezek.1.4-28" }],
  },
  {
    id: "hell",
    kind: "dossier",
    title: "The words for hell",
    lede: "Four different words stand behind the English \"hell\", and only one of them is a place of fire.",
    mark: "urn",
    plates: [2001],
    paintings: ["botticelli-map-of-hell", "mouth-of-hell"],
    claims: [
      { tag: "scripture", text: "Sheol is the Hebrew place of the dead, where Jacob expects to go mourning his son. The King James renders it \"grave\" 31 times, \"hell\" 31 times and \"pit\" three times.", refs: ["Gen.37.35", "Ps.16.10", "Ps.139.8"] },
      { tag: "scripture", text: "Hades is its Greek counterpart: Peter quotes Psalm 16 with it. In Revelation death and hades are themselves thrown into the lake of fire.", refs: ["Acts.2.27", "Luke.16.23", "Rev.20.13-14"] },
      { tag: "scripture", text: "Gehenna is the valley of Hinnom outside Jerusalem, where children were burned to Molech. It is the word Jesus uses for the hell of fire, where the worm dies not.", refs: ["2Kgs.23.10", "Jer.7.31", "Mark.9.43-48", "Matt.10.28"] },
      { tag: "scripture", text: "Tartarus appears once, as a verb: God \"cast down to hell\" the angels that sinned.", refs: ["2Pet.2.4"] },
      { tag: "scripture", text: "The lake of fire is prepared for the devil and his angels, and he is cast into it. Scripture never makes him its king.", refs: ["Matt.25.41", "Rev.20.10"] },
      { tag: "tradition", text: "Purgatory is Catholic teaching, defined at the councils of Florence (1439) and Trent (1563), with 2 Maccabees' prayer for the dead among its texts. Limbo was a theologians' answer about unbaptized infants, never defined.", refs: ["2Macc.12.43-45"] },
      { tag: "tradition", text: "The nine circles, Lucifer frozen at the bottom, are Dante's, about 1310. Botticelli drew his map of them." },
      { tag: "folklore", text: "Horns, a tail, a pitchfork and a devil stoking the fires come from medieval art and mystery plays, not from the text." },
    ],
    read: [{ library: "inferno", section: "Canto III" }, { library: "apocalypse-of-peter", section: "B. The Akhmim Fragment" }],
  },
  {
    id: "lucifer",
    kind: "dossier",
    title: "Lucifer",
    lede: "The name is in the King James once, translating a Hebrew word for the morning star, in a song about the king of Babylon.",
    mark: "sun",
    plates: [2006, 1007],
    paintings: ["fall-of-the-rebel-angels"],
    claims: [
      { tag: "scripture", text: "\"How art thou fallen from heaven, O Lucifer, son of the morning!\" The Hebrew is helel, the shining one: the morning star.", refs: ["Isa.14.12"] },
      { tag: "scripture", text: "The song is a taunt against the king of Babylon, who said in his heart he would climb above the stars.", refs: ["Isa.14.4", "Isa.14.13-15"] },
      { tag: "tradition", text: "Lucifer, \"light-bearer\", is the Latin name for the morning star, which Jerome used in the Vulgate. He used it again in 2 Peter for the day star rising in your hearts.", refs: ["2Pet.1.19"] },
      { tag: "tradition", text: "Reading Isaiah 14 as Satan's fall began with church fathers such as Tertullian and Origen, from about 200." },
      { tag: "scripture", text: "The canon's falls of Satan are in Luke and Revelation, and neither names Lucifer. Revelation gives the morning star to Christ.", refs: ["Luke.10.18", "Rev.12.7-9", "Rev.22.16"] },
      { tag: "tradition", text: "Milton makes Lucifer Satan's name in heaven, \"brighter once amidst the host of angels than that star the stars among\"." },
      { tag: "modern", text: "Pike's \"Lucifer, the Light-bearer! Strange and mysterious name to give to the Spirit of Darkness!\" is quoted as proof that Masons worship Lucifer. Léo Taxil's hoax of the 1890s put Luciferian orders in Pike's mouth; Taxil confessed in 1897." },
    ],
    read: [{ library: "paradise-lost", section: "Book VII" }, { library: "pike", section: "XIX. Grand Pontiff" }, { library: "inferno", section: "Canto XXXIV" }],
  },
  {
    id: "666",
    kind: "dossier",
    title: "666, or 616",
    lede: "The number of the beast is the number of a man, and some of the oldest copies give a different number.",
    plates: [2043],
    paintings: ["blake-number-of-the-beast"],
    claims: [
      { tag: "scripture", text: "\"Let him that hath understanding count the number of the beast: for it is the number of a man; and his number is Six hundred threescore and six.\"", refs: ["Rev.13.16-18"] },
      { tag: "tradition", text: "Some early manuscripts read 616. Irenaeus knew the reading about 180 and rejected it; a third-century papyrus from Oxyrhynchus, published in 2005, has it." },
      { tag: "tradition", text: "In gematria every letter is a number. \"Nero Caesar\" written in Hebrew letters adds to 666; spelled from the Latin form, without the final n, it adds to 616, which would explain both readings." },
      { tag: "scripture", text: "666 turns up elsewhere: the talents of gold that came to Solomon in a year, and the sons of Adonikam who came back from exile.", refs: ["1Kgs.10.14", "Ezra.2.13"] },
      { tag: "modern", text: "Barcodes, credit cards, vaccines and microchips have all been read as the mark of the beast, each in its turn." },
    ],
    read: [{ passage: "Rev.13.1-18" }],
  },
  {
    id: "boaz-jachin",
    kind: "dossier",
    title: "Boaz and Jachin",
    lede: "Two bronze pillars at the porch of Solomon's Temple, and at the door of every Masonic lodge.",
    mark: "square-compasses",
    plates: [89, 107],
    claims: [
      { tag: "scripture", text: "Hiram, a bronze-worker from Tyre, cast two pillars for the Temple's porch. The right he called Jachin and the left Boaz.", refs: ["1Kgs.7.13-22", "2Chr.3.15-17"] },
      { tag: "scripture", text: "Kings makes Hiram a widow's son of the tribe of Naphtali; Chronicles makes his mother a daughter of Dan, and calls him \"Huram my father's\", the root of the Masons' \"Hiram Abif\".", refs: ["1Kgs.7.14", "2Chr.2.13-14"] },
      { tag: "scripture", text: "When Jerusalem fell the Babylonians broke the pillars up and carried the bronze to Babylon.", refs: ["2Kgs.25.13-17"] },
      { tag: "tradition", text: "Jachin is usually read \"he will establish\" and Boaz \"in him is strength\"." },
      { tag: "tradition", text: "In Freemasonry the two pillars stand at the lodge's entrance, and their names belong to the first two degrees, as the exposés have printed since 1730." },
      { tag: "folklore", text: "The legend of the third degree, Hiram Abif killed by three craftsmen for refusing to give up the Master's word, is Masonic and first printed in 1730. Scripture says nothing of his death." },
    ],
    read: [{ library: "mackey", section: "XII. The Symbolism of Solomon's Temple" }, { library: "mackey", section: "XXVII. The Legend of the Third Degree" }, { library: "pike", section: "III. The Master" }],
  },
  {
    id: "masons",
    kind: "dossier",
    title: "Why the Masons build Solomon's Temple",
    lede: "A guild of stonemasons told its history through the most famous building in the Bible, and kept the story when it stopped laying stone.",
    mark: "square-compasses",
    plates: [89, 112],
    claims: [
      { tag: "scripture", text: "Solomon built the Temple with cedar and craftsmen from Hiram king of Tyre, and the stones were dressed before they came, so no hammer, axe or iron tool was heard in the house.", refs: ["1Kgs.5.6", "1Kgs.6.7"] },
      { tag: "tradition", text: "The Old Charges, the masons' own histories from about 1390 on, trace their craft through Euclid and the building of Solomon's Temple." },
      { tag: "tradition", text: "When the first Grand Lodge formed in London in 1717, its gentlemen kept the builders' tools as emblems. Anderson's Constitutions (1723) make Solomon a Grand Master and Hiram Abif his master builder." },
      { tag: "tradition", text: "Mackey's reading: the lodge stands for the Temple, and each Mason builds a temple of himself, as Paul and Peter call believers God's temple and living stones.", refs: ["1Cor.3.16", "1Pet.2.5"] },
      { tag: "folklore", text: "Hiram Abif's murder and the lost Master's word are the craft's own legend, first in print in 1730." },
      { tag: "modern", text: "That Masons secretly worship Lucifer comes chiefly from Léo Taxil's hoax (1885 to 1897), which he confessed in public." },
    ],
    read: [{ library: "mackey", section: "VII. The Union of Speculative and Operative Masonry at the Temple of Solomon" }, { library: "pike", section: "XIII. Royal Arch of Solomon" }],
  },
  {
    id: "azazel",
    kind: "dossier",
    title: "Azazel",
    lede: "A goat went into the wilderness \"for Azazel\". Who, or what, Azazel was has been argued ever since.",
    plates: [2021],
    claims: [
      { tag: "scripture", text: "On the Day of Atonement Aaron cast lots on two goats, one for the Lord and one for Azazel, and sent the second into the wilderness bearing the people's sins.", refs: ["Lev.16.8-10", "Lev.16.20-22"] },
      { tag: "tradition", text: "\"Scapegoat\" is Tyndale's word (1530), reading the Hebrew as \"the goat that goes away\". The King James kept it." },
      { tag: "tradition", text: "Some rabbis read Azazel as a place, a rugged cliff the goat was driven over." },
      { tag: "tradition", text: "In 1 Enoch Azazel is a leader of the fallen Watchers, who taught men to make swords and women to paint their eyes, and is bound in the desert until the judgement.", refs: ["1En.8.1", "1En.10.4-6"] },
      { tag: "tradition", text: "Milton makes Azazel Satan's standard-bearer, \"a cherub tall\"; Collin de Plancy's Dictionnaire infernal gives him a page and a portrait." },
    ],
    read: [{ library: "paradise-lost", section: "Book I" }, { passage: "1En.8.1-4" }],
  },
  {
    id: "lilith",
    kind: "dossier",
    title: "Lilith",
    lede: "Adam's first wife is not in the Bible. A night creature called lilith may be, once.",
    claims: [
      { tag: "scripture", text: "Among the wild beasts haunting ruined Edom, Isaiah names a lilith. The King James says \"screech owl\", the Vulgate lamia, newer versions \"night creature\".", refs: ["Isa.34.14"] },
      { tag: "folklore", text: "Behind the word stand the lilitu of Mesopotamia, demons of wind and night." },
      { tag: "folklore", text: "Aramaic incantation bowls from Babylonia, about 500 to 800, name Lilith as a demon who harms mothers and infants." },
      { tag: "folklore", text: "The story that she was made before Eve, refused to lie beneath Adam and flew away is first told in the Alphabet of Ben Sira, a satirical book of about 700 to 1000." },
      { tag: "tradition", text: "The legend answers a reader's question: Genesis tells of the making of woman twice.", refs: ["Gen.1.27", "Gen.2.21-22"] },
      { tag: "modern", text: "Lilith as a feminist figure, the first woman who would not submit, dates from the 1970s." },
    ],
  },
  {
    id: "legion",
    kind: "dossier",
    title: "Legion",
    lede: "\"My name is Legion: for we are many.\" A Roman army word for a crowd of spirits.",
    plates: [197, 165],
    claims: [
      { tag: "scripture", text: "A man living among the tombs, whom no chain could hold, answers Jesus with the name Legion, and the spirits ask to be sent into a herd of about two thousand swine.", refs: ["Mark.5.1-13", "Luke.8.26-33"] },
      { tag: "scripture", text: "Matthew has two men, not one, and the manuscripts disagree on the place: Gadarenes, Gerasenes or Gergesenes.", refs: ["Matt.8.28-32"] },
      { tag: "tradition", text: "A legion was a Roman unit of some five thousand men. The tenth legion, which held Judea after 70, had a boar among its emblems, and many readers have seen the swine as a jab at it." },
      { tag: "folklore", text: "The Goetia counts each spirit's following in legions: Bael rules 66, Paimon 200." },
    ],
    read: [{ library: "goetia", section: "1. Bael" }],
  },
  {
    id: "endor",
    kind: "dossier",
    title: "The witch of Endor",
    lede: "Saul, who had driven the mediums out, went to one at night in disguise. The Bible never calls her a witch.",
    plates: [80, 81],
    claims: [
      { tag: "scripture", text: "With the Philistines camped against him and no answer from God, Saul seeks \"a woman that hath a familiar spirit\" at Endor.", refs: ["1Sam.28.3-7"] },
      { tag: "scripture", text: "She sees gods ascending out of the earth and an old man covered with a mantle. Samuel speaks, and tells Saul he and his sons will be with him tomorrow.", refs: ["1Sam.28.13-19"] },
      { tag: "scripture", text: "Chronicles says Saul died for asking counsel of a medium; Sirach says Samuel prophesied after his death.", refs: ["1Chr.10.13", "Sir.46.20"] },
      { tag: "tradition", text: "Whether it was really Samuel was argued from the start: Origen said it was, and Eustathius of Antioch wrote a book against him saying it was a demon." },
      { tag: "tradition", text: "\"Witch\" is the word of the 1611 chapter summary. The text itself says only \"a woman that hath a familiar spirit\"." },
    ],
    read: [{ passage: "1Sam.28.3-25" }],
  },
  {
    id: "nephilim",
    kind: "dossier",
    title: "The Nephilim",
    lede: "\"There were giants in the earth in those days.\" Two verses, and a long argument over who their fathers were.",
    plates: [7, 75],
    claims: [
      { tag: "scripture", text: "When the sons of God took the daughters of men as wives, the Nephilim were on the earth, the mighty men of old.", refs: ["Gen.6.1-4"] },
      { tag: "scripture", text: "The spies sent into Canaan report Nephilim, the sons of Anak, beside whom they were as grasshoppers.", refs: ["Num.13.33"] },
      { tag: "tradition", text: "The Greek and Latin Bibles say \"giants\", and so the King James." },
      { tag: "tradition", text: "1 Enoch and Jubilees make the sons of God angels, the Watchers; so do Jude and 2 Peter, read with Enoch. From the third century many read them as the godly line of Seth instead (Julius Africanus, Augustine).", refs: ["1En.6.1-8", "Jub.5.1-2", "Jude.1.6"] },
      { tag: "scripture", text: "Og king of Bashan's bed was nine cubits long, and Goliath stood six cubits and a span.", refs: ["Deut.3.11", "1Sam.17.4"] },
      { tag: "modern", text: "The photographs of giant skeletons that circulate began as entries in a picture-editing contest in 2002." },
    ],
    read: [{ passage: "1En.6.1-8" }, { passage: "Jub.5.1-11" }],
  },
  {
    id: "solomon-demons",
    kind: "dossier",
    title: "Solomon and the demons",
    lede: "Scripture's Solomon is wise about trees and beasts. The Solomon who commands demons is a later and much longer story.",
    mark: "hexagram",
    plates: [107, 88],
    claims: [
      { tag: "scripture", text: "Solomon's wisdom ran to proverbs, songs, trees, beasts, birds, creeping things and fishes. No spirits are named.", refs: ["1Kgs.4.29-34"] },
      { tag: "scripture", text: "In his old age his wives turned his heart after Ashtoreth, Milcom and Chemosh.", refs: ["1Kgs.11.4-8"] },
      { tag: "tradition", text: "Josephus, about 94, says God taught Solomon to drive out demons, and tells of a Jew named Eleazar doing it before Vespasian with a ring and Solomon's incantations." },
      { tag: "tradition", text: "In the Testament of Solomon Michael brings him a ring engraved with a pentalpha, and with it he binds Ornias, Beelzeboul, Asmodeus and the rest to build the Temple.", refs: ["TSol.1.5", "TSol.1.21"] },
      { tag: "tradition", text: "In the Qur'an the jinn are among Solomon's hosts and labour for him, and do not notice he has died, leaning on his staff." },
      { tag: "folklore", text: "The Goetia, a seventeenth-century grimoire, seals 72 spirits in a vessel of brass and has them freed by the men of Babylon." },
    ],
    read: [{ passage: "TSol.1.1-12" }, { library: "goetia", section: "The Vessel of Brass" }],
  },
];

export const CURIOS: Curio[] = [...DOSSIERS, ...SYMBOLS];
export const curio = (id: string) => CURIOS.find((c) => c.id === id);

/** Every verse reference in the dossiers and symbols, for checking. */
export const curioRefs = (): string[] =>
  CURIOS.flatMap((c) => [...c.claims.flatMap((x) => x.refs ?? []), ...(c.read ?? []).flatMap((r) => ("passage" in r ? [r.passage] : []))]);

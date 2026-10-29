// Where the canon touches the books of the Pseudepigrapha shelf: Jude's one
// quotation of 1 Enoch (Jude 14-15), the echoes most scholars agree on, and
// the canon's stories that Jubilees, the Testament of Solomon and James's
// apocrypha retell. A short, labelled study note says how each is related;
// the texts themselves are shown as they are. Rules in code: which verses
// link is this table, not a model.

import type { Ref } from "./canon";

export interface CompanionLink {
  /** The canonical passage. */
  canon: Ref;
  /** The passage beyond the canon, on the Pseudepigrapha shelf. */
  beyond: Ref;
  /** quoted: the canon quotes it; echoed: the same matter; retold: it tells the canon's story its own way. */
  kind: "quoted" | "echoed" | "retold";
  /** Editorial, shown as a study note. */
  note: string;
}

const r = (book: string, chapter: number, verse: number, verseEnd?: number): Ref => ({ book, chapter, verse, ...(verseEnd && { verseEnd }) });

export const COMPANION_LINKS: CompanionLink[] = [
  // 1 Enoch
  { canon: r("Jude", 1, 14, 15), beyond: r("1En", 1, 9), kind: "quoted", note: "Jude quotes Enoch by name: the Lord coming with ten thousands of his saints to judge the ungodly." },
  { canon: r("Jude", 1, 6), beyond: r("1En", 10, 4, 6), kind: "echoed", note: "Angels who left their place, kept in chains under darkness until the judgement, as Enoch tells of the Watchers bound." },
  { canon: r("2Pet", 2, 4), beyond: r("1En", 10, 4, 6), kind: "echoed", note: "Angels that sinned, cast down and kept in darkness for judgement: the same story of the Watchers." },
  { canon: r("Gen", 6, 1, 4), beyond: r("1En", 6, 1, 8), kind: "retold", note: "The sons of God and the daughters of men, told at length in Enoch as the Watchers who came down on Mount Hermon." },
  { canon: r("Gen", 5, 21, 24), beyond: r("1En", 1, 1, 2), kind: "retold", note: "Enoch, who walked with God; the book is written in his name." },
  // Jubilees
  { canon: r("Gen", 6, 1, 4), beyond: r("Jub", 5, 1, 2), kind: "retold", note: "Jubilees calls the sons of God the angels of God, and their sons giants, as Enoch does." },
  { canon: r("Gen", 22, 1, 2), beyond: r("Jub", 17, 21), kind: "retold", note: "In Genesis God tests Abraham. In Jubilees the prince Mastema asks for the test, as the Satan asks for Job's." },
  { canon: r("Exod", 4, 24), beyond: r("Jub", 48, 3), kind: "retold", note: "Exodus says the Lord met Moses at the lodging place and sought to kill him; Jubilees gives the deed to Mastema." },
  // The Testament of Solomon
  { canon: r("Tob", 3, 8), beyond: r("TSol", 1, 21, 25), kind: "echoed", note: "Asmodeus, who killed Sarah's seven husbands, tells Solomon he is foiled by Raphael and by a fish's liver and gall, as in Tobit." },
  { canon: r("Matt", 12, 24), beyond: r("TSol", 1, 13, 15), kind: "echoed", note: "Beelzebub the prince of the devils, as the Pharisees call him, is Beelzeboul the exarch of the demons in the Testament." },
  { canon: r("1Kgs", 6, 7), beyond: r("TSol", 1, 11), kind: "retold", note: "Kings says no iron tool was heard while the Temple was built; the Testament says Solomon built it with demons set to cut the stone." },
  // The Gospel of Nicodemus
  { canon: r("Matt", 27, 52, 53), beyond: r("GosNic", 17, 1, 3), kind: "retold", note: "The saints who rose and went into the city: two of them, Karinus and Leucius, write down what they saw in hell." },
  { canon: r("1Pet", 3, 19), beyond: r("GosNic", 18, 1, 2), kind: "retold", note: "Christ preaching to the spirits in prison becomes the Harrowing of Hell, a light shining on the fathers in the dark." },
  { canon: r("Ps", 24, 7, 10), beyond: r("GosNic", 21, 1, 3), kind: "retold", note: "Lift up your heads, O ye gates: the psalm is the cry at the gates of hell, and the King of glory comes in." },
  { canon: r("Luke", 23, 42, 43), beyond: r("GosNic", 26, 1), kind: "retold", note: "The thief promised paradise meets the saints at its gate, carrying his cross." },
  // The Apocalypse of Paul
  { canon: r("2Cor", 12, 2, 4), beyond: r("ApPaul", 1, 1), kind: "retold", note: "Paul was caught up to the third heaven and heard what may not be told. The Apocalypse begins with his words and tells it." },
];

const covers = (span: Ref, at: Ref) =>
  span.book === at.book && span.chapter === at.chapter && (!at.verse || (at.verse >= span.verse && at.verse <= (span.verseEnd ?? span.verse)));

/** Links touching a verse, from either side. */
export function companionLinks(at: Ref): { link: CompanionLink; other: Ref }[] {
  return COMPANION_LINKS.flatMap((link) =>
    covers(link.canon, at) ? [{ link, other: link.beyond }] : covers(link.beyond, at) ? [{ link, other: link.canon }] : [],
  );
}

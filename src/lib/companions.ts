// Where the canon touches 1 Enoch: the one quotation (Jude 14-15) and the
// echoes most scholars agree on. A short, labelled study note says how each
// is related; the texts themselves are shown as they are. Rules in code:
// which verses link is this table, not a model.

import type { Ref } from "./canon";

export interface CompanionLink {
  /** The canonical passage. */
  canon: Ref;
  /** The passage in 1 Enoch. */
  enoch: Ref;
  kind: "quoted" | "echoed" | "retold";
  /** Editorial, shown as a study note. */
  note: string;
}

const r = (book: string, chapter: number, verse: number, verseEnd?: number): Ref => ({ book, chapter, verse, ...(verseEnd && { verseEnd }) });

export const COMPANION_LINKS: CompanionLink[] = [
  { canon: r("Jude", 1, 14, 15), enoch: r("1En", 1, 9), kind: "quoted", note: "Jude quotes Enoch by name: the Lord coming with ten thousands of his saints to judge the ungodly." },
  { canon: r("Jude", 1, 6), enoch: r("1En", 10, 4, 6), kind: "echoed", note: "Angels who left their place, kept in chains under darkness until the judgement, as Enoch tells of the Watchers bound." },
  { canon: r("2Pet", 2, 4), enoch: r("1En", 10, 4, 6), kind: "echoed", note: "Angels that sinned, cast down and kept in darkness for judgement: the same story of the Watchers." },
  { canon: r("Gen", 6, 1, 4), enoch: r("1En", 6, 1, 8), kind: "retold", note: "The sons of God and the daughters of men, told at length in Enoch as the Watchers who came down on Mount Hermon." },
  { canon: r("Gen", 5, 21, 24), enoch: r("1En", 1, 1, 2), kind: "retold", note: "Enoch, who walked with God; the book is written in his name." },
];

const covers = (span: Ref, at: Ref) =>
  span.book === at.book && span.chapter === at.chapter && (!at.verse || (at.verse >= span.verse && at.verse <= (span.verseEnd ?? span.verse)));

/** Links touching a verse, from either side. */
export function companionLinks(at: Ref): { link: CompanionLink; other: Ref }[] {
  return COMPANION_LINKS.flatMap((link) =>
    covers(link.canon, at) ? [{ link, other: link.enoch }] : covers(link.enoch, at) ? [{ link, other: link.canon }] : [],
  );
}

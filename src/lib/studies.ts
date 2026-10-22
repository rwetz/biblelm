// Studies for young men (18 to 25) fighting temptation: for each struggle,
// hand-chosen ideas with their verses and a question to work through, the
// stories where Scripture shows it, and the OpenBible topics whose
// reader-voted passages fill out the rest (src/lib/topics.ts).
//
// Everything here is written by hand and fixed: no machine picks or words
// anything. The headings and questions are study notes, shown as such and
// never mixed into Scripture. References are "Book.chapter.verse[-end]".

import { BOOKS, type Ref } from "./canon";
import { fuse } from "./semantic";
import { passages, type Topic } from "./topics";

export interface StudyIdea {
  title: string;
  refs: string[];
  question: string;
}

export interface StudyStory {
  title: string;
  ref: string;
}

export interface Struggle {
  id: string;
  title: string;
  /** One line under the title. */
  lede: string;
  /** OpenBible topic names whose passages are merged by votes. */
  topics: string[];
  ideas: StudyIdea[];
  stories: StudyStory[];
}

/** Passages written to young men, shown beside every study. */
export const TO_YOUNG_MEN: string[] = ["Ps.119.9-11", "Prov.1.8-10", "Eccl.12.1", "Lam.3.27", "1Tim.4.12", "2Tim.2.22", "Titus.2.6-8", "1John.2.14"];

export const STRUGGLES: Struggle[] = [
  {
    id: "lust",
    title: "Lust and pornography",
    lede: "The fight most men keep secret. Scripture is plain about it, and plain about grace.",
    topics: ["lust", "pornography", "sexual immorality", "purity", "masturbation", "temptation"],
    ideas: [
      { title: "Flee, don't negotiate", refs: ["2Tim.2.22", "1Cor.6.18", "Gen.39.12"], question: "Where do you usually start negotiating with temptation, and what would running look like at that exact point?" },
      { title: "It starts with the eyes", refs: ["Job.31.1", "Matt.5.27-30", "1John.2.16"], question: "What covenant could you make with your eyes this week: which devices, places and hours?" },
      { title: "Your body is not your own", refs: ["1Cor.6.19-20", "Rom.12.1"], question: "What changes if your body is a temple and not a private possession?" },
      { title: "There is a way out", refs: ["1Cor.10.13", "Jas.1.13-15", "Heb.4.15-16"], question: "Trace James 1:14-15 through the last time you fell: desire, then conception, then sin. Where was the exit?" },
      { title: "Grace after falling", refs: ["1John.1.9", "Ps.51.1-12", "Rom.8.1"], question: "After you fail, do you run to God or away from him? Why?" },
    ],
    stories: [
      { title: "Joseph runs from Potiphar's wife", ref: "Gen.39.7-12" },
      { title: "David on the roof", ref: "2Sam.11.1-4" },
      { title: "Nathan confronts David", ref: "2Sam.12.1-13" },
      { title: "Samson and Delilah", ref: "Judg.16.15-21" },
      { title: "The young man and the stranger's house", ref: "Prov.7.6-23" },
    ],
  },
  {
    id: "anger",
    title: "Anger",
    lede: "Quick temper, slow grudges, and what to do with the heat.",
    topics: ["anger", "wrath", "bitterness", "revenge", "self control", "patience"],
    ideas: [
      { title: "Slow to anger", refs: ["Jas.1.19-20", "Prov.16.32", "Prov.15.1"], question: "What usually happens in the seconds before you lose it? What would slowing down look like there?" },
      { title: "Don't let the sun go down", refs: ["Eph.4.26-27", "Eph.4.31-32"], question: "Is there anger you have carried past sunset for weeks or years? What would putting it away cost you?" },
      { title: "Anger is murder in the heart", refs: ["Matt.5.21-24"], question: "Who do you need to be reconciled with before your worship means much?" },
      { title: "Leave room for God", refs: ["Rom.12.17-21"], question: "Where are you trying to get even? What would overcoming evil with good look like there?" },
    ],
    stories: [
      { title: "Cain and Abel", ref: "Gen.4.3-8" },
      { title: "Moses strikes the rock", ref: "Num.20.7-12" },
      { title: "Jonah angry at mercy", ref: "Jonah.4.1-11" },
    ],
  },
  {
    id: "pride",
    title: "Pride, envy and comparison",
    lede: "Measuring yourself against other men, and the quiet arrogance underneath.",
    topics: ["pride", "humility", "arrogance", "boasting", "envy", "jealousy"],
    ideas: [
      { title: "Before a fall", refs: ["Prov.16.18", "Jas.4.6-10"], question: "Where are you most sure you don't need help?" },
      { title: "Comparing yourself", refs: ["Gal.6.4-5", "2Cor.10.12"], question: "Whose life do you scroll through and measure yourself against? What does it do to you?" },
      { title: "The mind of Christ", refs: ["Phil.2.3-8"], question: "What would counting others more significant than yourself look like this week, by name?" },
      { title: "Follow thou me", refs: ["John.21.20-22"], question: "Peter asked about John's path. What other man's path are you preoccupied with instead of your own?" },
    ],
    stories: [
      { title: "Saul envies David", ref: "1Sam.18.6-9" },
      { title: "Uzziah's pride", ref: "2Chr.26.16-21" },
      { title: "Nebuchadnezzar humbled", ref: "Dan.4.28-37" },
    ],
  },
  {
    id: "drift",
    title: "Laziness, screens and drift",
    lede: "Gaming, scrolling and the years that slip by without anything built.",
    topics: ["laziness", "gaming", "idleness", "diligence", "work", "time management", "self discipline", "sloth"],
    ideas: [
      { title: "Redeem the time", refs: ["Eph.5.15-17", "Ps.90.12"], question: "If you added up last week's hours, what would they say you love?" },
      { title: "Go to the ant", refs: ["Prov.6.6-11", "Prov.24.30-34"], question: "What in your life is a field overgrown with thorns because of a little sleep, a little folding of the hands?" },
      { title: "Work as for the Lord", refs: ["Col.3.23-24", "2Thess.3.10-12"], question: "What work are you doing half-heartedly because no one important is watching?" },
      { title: "Train yourself", refs: ["1Cor.9.24-27", "1Tim.4.7-8"], question: "What one discipline, kept daily for a month, would change the most?" },
    ],
    stories: [
      { title: "David stays home when kings go to war", ref: "2Sam.11.1-2" },
      { title: "The parable of the talents", ref: "Matt.25.14-30" },
    ],
  },
  {
    id: "escape",
    title: "Drink and escape",
    lede: "Drinking, getting high, or anything else you reach for to stop feeling.",
    topics: ["drunkenness", "addiction", "alcohol", "drugs", "drinking"],
    ideas: [
      { title: "Filled with the Spirit instead", refs: ["Eph.5.18-20"], question: "What are you hoping the drink or the high will fill?" },
      { title: "Who hath woe?", refs: ["Prov.23.29-35"], question: "Read verse 35 slowly. Have you ever woken up and gone straight back to it?" },
      { title: "Not mastered by anything", refs: ["1Cor.6.12", "Rom.6.12-14"], question: "What has the power to tell you what to do tonight?" },
      { title: "Be sober, be vigilant", refs: ["1Pet.5.8-9"], question: "When is your guard lowest, and who knows that about you?" },
    ],
    stories: [
      { title: "Noah's drunkenness", ref: "Gen.9.20-23" },
      { title: "Belshazzar's feast", ref: "Dan.5.1-6" },
    ],
  },
  {
    id: "alone",
    title: "Loneliness and going it alone",
    lede: "No one to tell, no one who asks. Temptation grows best in the dark.",
    topics: ["loneliness", "isolation", "friendship", "fellowship", "accountability", "brotherhood"],
    ideas: [
      { title: "Two are better than one", refs: ["Eccl.4.9-12"], question: "If you fell tonight, who would lift you up? Do they know that?" },
      { title: "Confess to one another", refs: ["Jas.5.16", "1John.1.7"], question: "What have you never said out loud to another man?" },
      { title: "Iron sharpens iron", refs: ["Prov.27.17", "Prov.27.6"], question: "Who in your life is allowed to wound you as a friend?" },
      { title: "Don't stop meeting", refs: ["Heb.10.24-25", "Heb.3.12-13"], question: "Which Christian men do you see every week? If none, who could you ask?" },
    ],
    stories: [
      { title: "David and Jonathan", ref: "1Sam.18.1-4" },
      { title: "Elijah alone under the juniper tree", ref: "1Kgs.19.3-18" },
      { title: "Paul asks for Timothy", ref: "2Tim.4.9-18" },
    ],
  },
  {
    id: "fear",
    title: "Fear about the future",
    lede: "Work, money, marriage, whether any of it will come.",
    topics: ["fear", "anxiety", "worry", "future", "hope", "courage"],
    ideas: [
      { title: "Be careful for nothing", refs: ["Phil.4.6-7", "Matt.6.25-34"], question: "Write down the three things you worry about most. What would bringing each to God in prayer sound like?" },
      { title: "Be strong and of a good courage", refs: ["Josh.1.9", "Isa.41.10"], question: "Where is fear deciding things for you right now?" },
      { title: "Lean not on your own understanding", refs: ["Prov.3.5-6", "Jer.29.11"], question: "Which decision are you trying to see all the way to the end before you take a step?" },
    ],
    stories: [
      { title: "Gideon hiding in the winepress", ref: "Judg.6.11-16" },
      { title: "Joshua takes command", ref: "Josh.1.1-9" },
      { title: "Peter on the water", ref: "Matt.14.25-33" },
    ],
  },
  {
    id: "identity",
    title: "Who you are and what you're for",
    lede: "Manhood, calling and purpose, read from Scripture rather than the feed.",
    topics: ["identity", "purpose", "calling", "manhood", "men", "strength", "integrity", "young men"],
    ideas: [
      { title: "Quit you like men", refs: ["1Cor.16.13-14"], question: "Paul pairs strength with love in the same breath. Which do you lean on, and which do you lack?" },
      { title: "Let no man despise thy youth", refs: ["1Tim.4.12"], question: "In which of word, conduct, love, faith and purity could you be an example this month?" },
      { title: "A new creation", refs: ["2Cor.5.17", "Gal.2.20"], question: "What old label do you still answer to?" },
      { title: "Made for good works", refs: ["Eph.2.10", "1John.2.14"], question: "John says young men are strong and have overcome. What would you build if you believed that?" },
    ],
    stories: [
      { title: "Daniel resolves not to defile himself", ref: "Dan.1.8-17" },
      { title: "Josiah seeks God while young", ref: "2Chr.34.1-3" },
    ],
  },
];

const BOOK_SET = new Set(BOOKS.map((b) => b.osis));

/** "Gen.39.7-12" as a Ref, or undefined if it is malformed. */
export function studyRef(s: string): Ref | undefined {
  const m = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(s);
  if (!m || !BOOK_SET.has(m[1])) return undefined;
  const verse = +m[3];
  const verseEnd = m[4] ? +m[4] : undefined;
  if (verseEnd !== undefined && verseEnd <= verse) return undefined;
  return { book: m[1], chapter: +m[2], verse, ...(verseEnd ? { verseEnd } : {}) };
}

/**
 * The passages readers vote for across a struggle's topics, merged by
 * reciprocal rank so no one topic swamps the rest, as [start, end] over the
 * verse index. Passages already in the study's ideas or stories are left out.
 */
export function readersPassages(all: Topic[], s: Struggle, skip: Set<number>, limit = 12): [number, number][] {
  const lists: number[][] = [];
  const ends = new Map<number, number>();
  for (const name of s.topics) {
    const t = all.find((x) => x.name === name);
    if (!t) continue;
    const ps = passages(t);
    for (const p of ps) if (!ends.has(p.start) || ends.get(p.start)! < p.end) ends.set(p.start, p.end);
    lists.push(ps.map((p) => p.start));
  }
  return fuse(lists)
    .filter((v) => !skip.has(v))
    .slice(0, limit)
    .map((v) => [v, ends.get(v) ?? v]);
}

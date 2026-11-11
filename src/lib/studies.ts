// Studies for young men (18 to 25) fighting temptation: for each struggle,
// hand-chosen ideas with their verses and a question to work through, the
// stories where Scripture shows it, and the OpenBible topics whose
// reader-voted passages fill out the rest (src/lib/topics.ts).
//
// Everything here is written by hand and fixed: no machine picks or words
// anything. The headings and questions are study notes, shown as such and
// never mixed into Scripture. References are "Book.chapter.verse[-end]";
// studies.test.ts checks every one against the KJV when the data is built.

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

/** Where a struggle sits in the list of studies. */
export type StudyGroup = "flesh" | "heart" | "others" | "faith";

export const STUDY_GROUPS: { id: StudyGroup; label: string }[] = [
  { id: "flesh", label: "The flesh" },
  { id: "heart", label: "The heart" },
  { id: "others", label: "With others" },
  { id: "faith", label: "Faith and calling" },
];

export interface Struggle {
  id: string;
  title: string;
  group: StudyGroup;
  /** One line under the title. */
  lede: string;
  /** OpenBible topic names whose passages are merged by votes. */
  topics: string[];
  ideas: StudyIdea[];
  stories: StudyStory[];
}

/** Passages written to young men, shown beside every study. */
export const TO_YOUNG_MEN: string[] = [
  "Ps.119.9-11",
  "Ps.71.17",
  "Prov.1.8-10",
  "Prov.20.29",
  "Eccl.11.9-10",
  "Eccl.12.1",
  "Jer.1.6-8",
  "Lam.3.27",
  "1Tim.4.12",
  "2Tim.2.22",
  "Titus.2.6-8",
  "1Pet.5.5",
  "1John.2.14",
];

export const STRUGGLES: Struggle[] = [
  // ── The flesh ──────────────────────────────────────────────────────────
  {
    id: "lust",
    title: "Lust and pornography",
    group: "flesh",
    lede: "The fight most men keep secret. Scripture is plain about it, and plain about grace.",
    topics: ["lust", "pornography", "sexual immorality", "purity", "sexual purity", "masturbation", "temptation"],
    ideas: [
      { title: "Flee, don't negotiate", refs: ["2Tim.2.22", "1Cor.6.18", "Gen.39.12", "Prov.5.8"], question: "Where do you usually start negotiating with temptation, and what would running look like at that exact point?" },
      { title: "It starts with the eyes", refs: ["Job.31.1", "Matt.5.27-30", "Ps.101.3", "Ps.119.37", "1John.2.16"], question: "What covenant could you make with your eyes this week: which devices, places and hours?" },
      { title: "Your body is not your own", refs: ["1Cor.6.19-20", "Rom.12.1", "1Thess.4.3-5"], question: "What changes if your body is a temple and not a private possession?" },
      { title: "There is a way out", refs: ["1Cor.10.13", "Jas.1.13-15", "Heb.4.15-16", "Matt.26.41"], question: "Trace James 1:14-15 through the last time you fell: desire, then conception, then sin. Where was the exit?" },
      { title: "Put it to death", refs: ["Gal.5.16-17", "Rom.8.13", "Col.3.5"], question: "What would putting this to death, rather than managing it, require of you this week?" },
      { title: "Rejoice with the wife of thy youth", refs: ["Prov.5.15-21", "1Cor.7.2", "Heb.13.4"], question: "Do you think of marriage as a cure for lust, or as a covenant you are preparing for now?" },
      { title: "Grace after falling", refs: ["1John.1.9", "Ps.51.1-12", "Rom.8.1", "Prov.24.16", "Mic.7.8"], question: "After you fail, do you run to God or away from him? Why?" },
    ],
    stories: [
      { title: "Joseph runs from Potiphar's wife", ref: "Gen.39.7-12" },
      { title: "David on the roof", ref: "2Sam.11.1-4" },
      { title: "Nathan confronts David", ref: "2Sam.12.1-13" },
      { title: "Amnon and Tamar", ref: "2Sam.13.1-15" },
      { title: "Samson and Delilah", ref: "Judg.16.15-21" },
      { title: "The young man and the stranger's house", ref: "Prov.7.6-23" },
    ],
  },
  {
    id: "escape",
    title: "Drink and escape",
    group: "flesh",
    lede: "Drinking, getting high, or anything else you reach for to stop feeling.",
    topics: ["drunkenness", "addiction", "alcohol", "drugs", "drinking", "self control"],
    ideas: [
      { title: "Filled with the Spirit instead", refs: ["Eph.5.18-20", "Isa.55.1-2"], question: "What are you hoping the drink or the high will fill?" },
      { title: "Who hath woe?", refs: ["Prov.23.29-35", "Prov.20.1"], question: "Read verse 35 slowly. Have you ever woken up and gone straight back to it?" },
      { title: "Not mastered by anything", refs: ["1Cor.6.12", "Rom.6.12-14", "2Pet.2.19"], question: "What has the power to tell you what to do tonight?" },
      { title: "Be sober, be vigilant", refs: ["1Pet.5.8-9", "1Thess.5.6-8", "Rom.13.12-14"], question: "When is your guard lowest, and who knows that about you?" },
      { title: "Come unto me, all ye that labour", refs: ["Matt.11.28-30", "Ps.55.22", "1Pet.5.7"], question: "What weight are you trying to drink or scroll away? Have you once handed it to God in words?" },
      { title: "Pour out your heart before him", refs: ["Ps.62.8", "Ps.142.1-3", "Ps.42.5"], question: "When did you last tell God exactly how you feel, without tidying it up?" },
    ],
    stories: [
      { title: "Esau sells his birthright for a meal", ref: "Gen.25.29-34" },
      { title: "Noah's drunkenness", ref: "Gen.9.20-23" },
      { title: "Nabal drunk at his feast", ref: "1Sam.25.36-38" },
      { title: "Belshazzar's feast", ref: "Dan.5.1-6" },
      { title: "The prodigal son", ref: "Luke.15.11-24" },
    ],
  },
  {
    id: "drift",
    title: "Laziness, screens and drift",
    group: "flesh",
    lede: "Gaming, scrolling and the years that slip by without anything built.",
    topics: ["laziness", "gaming", "idleness", "diligence", "work", "time management", "self discipline", "sloth"],
    ideas: [
      { title: "Redeem the time", refs: ["Eph.5.15-17", "Ps.90.12", "Jas.4.13-15"], question: "If you added up last week's hours, what would they say you love?" },
      { title: "Go to the ant", refs: ["Prov.6.6-11", "Prov.24.30-34", "Prov.13.4"], question: "What in your life is a field overgrown with thorns because of a little sleep, a little folding of the hands?" },
      { title: "Work as for the Lord", refs: ["Col.3.23-24", "2Thess.3.10-12", "Prov.22.29"], question: "What work are you doing half-heartedly because no one important is watching?" },
      { title: "Whatsoever thy hand findeth to do", refs: ["Eccl.9.10", "Prov.12.24", "Prov.10.4-5"], question: "What would you finish this month if you started tonight?" },
      { title: "Set your affection on things above", refs: ["Col.3.1-2", "Phil.4.8", "Ps.119.37"], question: "What fills your mind in the last hour before you sleep, and what would you put there instead?" },
      { title: "Train yourself", refs: ["1Cor.9.24-27", "1Tim.4.7-8", "Heb.12.11"], question: "What one discipline, kept daily for a month, would change the most?" },
    ],
    stories: [
      { title: "David stays home when kings go to war", ref: "2Sam.11.1-2" },
      { title: "Ruth gleans in the field", ref: "Ruth.2.2-7" },
      { title: "The people had a mind to work", ref: "Neh.4.6" },
      { title: "The wise and foolish virgins", ref: "Matt.25.1-13" },
      { title: "The parable of the talents", ref: "Matt.25.14-30" },
    ],
  },
  {
    id: "money",
    title: "Money, betting and getting rich quick",
    group: "flesh",
    lede: "Betting apps, coins and the itch to get rich fast, or never having enough.",
    topics: ["money", "greed", "covetousness", "contentment", "gambling", "debt", "wealth", "giving"],
    ideas: [
      { title: "The love of money", refs: ["1Tim.6.6-10", "Heb.13.5", "Eccl.5.10"], question: "How much would be enough? Write the number down. Has it moved before?" },
      { title: "He that maketh haste to be rich", refs: ["Prov.28.20", "Prov.13.11", "Prov.21.5", "Prov.23.4-5"], question: "What are you hoping a quick win will do for you that slow work will not?" },
      { title: "The borrower is servant to the lender", refs: ["Prov.22.7", "Rom.13.8", "Ps.37.21"], question: "Who do you owe, and what is your plan, in writing, to pay them?" },
      { title: "Treasure in heaven", refs: ["Matt.6.19-24", "Luke.12.15"], question: "Look at where your money went last month. What does it say your heart is set on?" },
      { title: "I have learned to be content", refs: ["Phil.4.11-13", "Prov.30.8-9"], question: "What would contentment with what you have look like on payday?" },
      { title: "A cheerful giver", refs: ["2Cor.9.6-8", "Prov.3.9-10", "Acts.20.35"], question: "What could you give away this month that would cost you something?" },
    ],
    stories: [
      { title: "Achan hides the wedge of gold", ref: "Josh.7.19-21" },
      { title: "Gehazi runs after Naaman's silver", ref: "2Kgs.5.20-27" },
      { title: "The rich young ruler", ref: "Mark.10.17-22" },
      { title: "The rich fool", ref: "Luke.12.16-21" },
      { title: "Judas and the thirty pieces", ref: "Matt.26.14-16" },
      { title: "Zacchaeus gives back fourfold", ref: "Luke.19.1-10" },
    ],
  },

  // ── The heart ──────────────────────────────────────────────────────────
  {
    id: "anger",
    title: "Anger",
    group: "heart",
    lede: "Quick temper, slow grudges, and what to do with the heat.",
    topics: ["anger", "wrath", "revenge", "self control", "patience"],
    ideas: [
      { title: "Slow to anger", refs: ["Jas.1.19-20", "Prov.16.32", "Prov.15.1", "Prov.14.29", "Prov.29.11"], question: "What usually happens in the seconds before you lose it? What would slowing down look like there?" },
      { title: "Don't let the sun go down", refs: ["Eph.4.26-27", "Eph.4.31-32", "Ps.4.4"], question: "Is there anger you have carried past sunset for weeks or years? What would putting it away cost you?" },
      { title: "Anger is murder in the heart", refs: ["Matt.5.21-24", "1John.3.15"], question: "Who do you need to be reconciled with before your worship means much?" },
      { title: "Make no friendship with an angry man", refs: ["Prov.22.24-25", "Prov.29.22", "Gal.5.19-21"], question: "Whose temper have you picked up, and whose are you passing on?" },
      { title: "A city broken down", refs: ["Prov.25.28", "Gal.5.22-23", "Col.3.12-13"], question: "Which fruit of the Spirit would have changed your last blow-up?" },
      { title: "Leave room for God", refs: ["Rom.12.17-21", "1Pet.2.21-23"], question: "Where are you trying to get even? What would overcoming evil with good look like there?" },
    ],
    stories: [
      { title: "Cain and Abel", ref: "Gen.4.3-8" },
      { title: "Simeon and Levi at Shechem", ref: "Gen.34.25-31" },
      { title: "Moses strikes the rock", ref: "Num.20.7-12" },
      { title: "Abigail turns back David's revenge", ref: "1Sam.25.23-35" },
      { title: "Naaman goes away in a rage", ref: "2Kgs.5.11-14" },
      { title: "Peter's sword in the garden", ref: "John.18.10-11" },
      { title: "Jonah angry at mercy", ref: "Jonah.4.1-11" },
    ],
  },
  {
    id: "pride",
    title: "Pride, envy and comparison",
    group: "heart",
    lede: "Measuring yourself against other men, and the quiet arrogance underneath.",
    topics: ["pride", "humility", "arrogance", "boasting", "envy", "jealousy"],
    ideas: [
      { title: "Before a fall", refs: ["Prov.16.18", "Prov.11.2", "Jas.4.6-10", "1Pet.5.5-6"], question: "Where are you most sure you don't need help?" },
      { title: "Comparing yourself", refs: ["Gal.6.4-5", "2Cor.10.12", "Exod.20.17", "Prov.14.30"], question: "Whose life do you scroll through and measure yourself against? What does it do to you?" },
      { title: "What hast thou that thou didst not receive?", refs: ["1Cor.4.7", "Jer.9.23-24", "Deut.8.17-18"], question: "Which of your strengths do you quietly take credit for?" },
      { title: "The mind of Christ", refs: ["Phil.2.3-8", "Mark.10.42-45"], question: "What would counting others more significant than yourself look like this week, by name?" },
      { title: "Rejoice with them that do rejoice", refs: ["Rom.12.15-16", "1Cor.12.26"], question: "Whose win this year was hard for you to celebrate? Tell him well done." },
      { title: "Follow thou me", refs: ["John.21.20-22"], question: "Peter asked about John's path. What other man's path are you preoccupied with instead of your own?" },
    ],
    stories: [
      { title: "Joseph's brothers envy him", ref: "Gen.37.3-11" },
      { title: "Saul envies David", ref: "1Sam.18.6-9" },
      { title: "Uzziah's pride", ref: "2Chr.26.16-21" },
      { title: "Haman cannot bear Mordecai", ref: "Esth.5.9-14" },
      { title: "Nebuchadnezzar humbled", ref: "Dan.4.28-37" },
      { title: "The Pharisee and the publican", ref: "Luke.18.9-14" },
      { title: "Herod takes the glory", ref: "Acts.12.21-23" },
    ],
  },
  {
    id: "bitterness",
    title: "Bitterness and forgiving",
    group: "heart",
    lede: "Someone hurt you and you keep replaying it. What forgiving is, and what it is not.",
    topics: ["forgiveness", "bitterness", "unforgiveness", "grudges", "reconciliation", "offense", "resentment"],
    ideas: [
      { title: "Even as Christ forgave you", refs: ["Col.3.13", "Matt.6.14-15", "Mark.11.25"], question: "Who is the one person you would rather not see named here?" },
      { title: "Seventy times seven", refs: ["Matt.18.21-35"], question: "The servant was forgiven ten thousand talents. What has God forgiven you that you can name?" },
      { title: "Lest any root of bitterness", refs: ["Heb.12.14-15", "Acts.8.23"], question: "What has the grudge grown into: in your sleep, your talk, your prayers?" },
      { title: "Vengeance is mine", refs: ["Deut.32.35", "Prov.20.22", "Prov.24.17-18"], question: "What would it mean to hand the account to God and stop keeping it yourself?" },
      { title: "Love your enemies", refs: ["Matt.5.43-48", "Luke.6.27-28", "Luke.23.34"], question: "What could you pray for the man who wronged you, and mean it?" },
      { title: "Go and be reconciled", refs: ["Matt.5.23-24", "Matt.18.15", "Rom.12.18"], question: "Is there a conversation you owe someone? What is its first sentence?" },
    ],
    stories: [
      { title: "Esau runs to meet Jacob", ref: "Gen.33.1-4" },
      { title: "Joseph forgives his brothers", ref: "Gen.50.15-21" },
      { title: "David spares Saul in the cave", ref: "1Sam.24.3-12" },
      { title: "The prodigal's elder brother", ref: "Luke.15.25-32" },
      { title: "Stephen prays for those who stone him", ref: "Acts.7.57-60" },
    ],
  },
  {
    id: "shame",
    title: "Guilt and shame",
    group: "heart",
    lede: "When you think you have gone too far, or fallen too many times, to come back.",
    topics: ["guilt", "shame", "condemnation", "grace", "repentance", "mercy", "forgiveness"],
    ideas: [
      { title: "No condemnation", refs: ["Rom.8.1-2", "Rom.8.33-34", "John.3.17"], question: "Whose voice tells you that you are condemned? Is it God's?" },
      { title: "As far as the east is from the west", refs: ["Ps.103.8-14", "Isa.1.18", "Mic.7.18-19"], question: "What do you keep confessing as if God had not heard you the first time?" },
      { title: "Godly sorrow", refs: ["2Cor.7.9-11", "Ps.32.1-5"], question: "Is your sorrow pushing you toward God or away from him? How can you tell?" },
      { title: "Despising the shame", refs: ["Heb.12.1-2", "Isa.53.4-6", "1Pet.2.24"], question: "Christ bore shame on the cross. What shame are you still carrying that he already carried?" },
      { title: "Forgetting those things which are behind", refs: ["Phil.3.12-14", "1Tim.1.15-16"], question: "Paul called himself chief of sinners and kept running. What past do you need to stop living in?" },
      { title: "Boldness to enter", refs: ["Heb.10.19-22", "1John.2.1-2"], question: "What would it look like to pray today as a son welcomed home, not a servant on probation?" },
    ],
    stories: [
      { title: "Manasseh humbles himself", ref: "2Chr.33.10-13" },
      { title: "The woman taken in adultery", ref: "John.8.3-11" },
      { title: "The prodigal comes home", ref: "Luke.15.17-24" },
      { title: "The thief on the cross", ref: "Luke.23.39-43" },
      { title: "Peter restored by the fire", ref: "John.21.15-19" },
    ],
  },
  {
    id: "fear",
    title: "Fear about the future",
    group: "heart",
    lede: "Work, money, marriage, whether any of it will come.",
    topics: ["fear", "anxiety", "worry", "future", "hope", "courage", "trust"],
    ideas: [
      { title: "Be careful for nothing", refs: ["Phil.4.6-7", "Matt.6.25-34", "1Pet.5.7"], question: "Write down the three things you worry about most. What would bringing each to God in prayer sound like?" },
      { title: "Be strong and of a good courage", refs: ["Josh.1.9", "Isa.41.10", "2Tim.1.7", "Ps.27.1"], question: "Where is fear deciding things for you right now?" },
      { title: "Lean not on your own understanding", refs: ["Prov.3.5-6", "Prov.16.9", "Ps.37.3-5", "Jer.29.11"], question: "Which decision are you trying to see all the way to the end before you take a step?" },
      { title: "Perfect love casteth out fear", refs: ["1John.4.18", "Rom.8.15", "Rom.8.31-32"], question: "Which of your fears is really a fear of being punished or left?" },
      { title: "Seek ye first", refs: ["Matt.6.33", "Ps.37.25", "Phil.4.19"], question: "If the money and the job were settled, what would you be seeking first? Seek that now." },
    ],
    stories: [
      { title: "Abram goes out to a land he has not seen", ref: "Gen.12.1-4" },
      { title: "Joshua takes command", ref: "Josh.1.1-9" },
      { title: "Gideon hiding in the winepress", ref: "Judg.6.11-16" },
      { title: "Elisha's servant sees the horses of fire", ref: "2Kgs.6.15-17" },
      { title: "Jesus stills the storm", ref: "Mark.4.35-41" },
      { title: "Peter on the water", ref: "Matt.14.25-33" },
    ],
  },
  {
    id: "despair",
    title: "Darkness and despair",
    group: "heart",
    lede: "The heavy months. Scripture has words for them, and other men have been here. If you are thinking of ending your life, tell someone today; in the US, call or text 988.",
    topics: ["depression", "despair", "hopelessness", "sadness", "grief", "discouragement", "suicide", "comfort"],
    ideas: [
      { title: "Why art thou cast down, O my soul?", refs: ["Ps.42.5-11", "Ps.43.5"], question: "Talk back to your own soul as the psalmist does. What would you say?" },
      { title: "Out of the depths", refs: ["Ps.130.1-6", "Ps.88.13-18"], question: "Psalm 88 ends in darkness and is still a prayer. What would your honest prayer be today?" },
      { title: "Nigh unto them that are of a broken heart", refs: ["Ps.34.17-18", "Ps.147.3", "Isa.42.3"], question: "What would it mean that God is closest exactly where you feel most broken?" },
      { title: "Joy cometh in the morning", refs: ["Ps.30.5", "Lam.3.19-26", "Rom.15.13"], question: "What mercies, however small, were new this morning?" },
      { title: "Bear ye one another's burdens", refs: ["Gal.6.2", "Prov.12.25", "Rom.12.15"], question: "Who knows how you are really doing? If no one, who could you tell this week?" },
      { title: "Come apart and rest a while", refs: ["Mark.6.31", "Ps.127.2", "Matt.11.28"], question: "How are you sleeping, eating and moving? The angel's first help to Elijah was bread and sleep." },
    ],
    stories: [
      { title: "Hannah weeps at Shiloh", ref: "1Sam.1.9-18" },
      { title: "Elijah fed under the juniper tree", ref: "1Kgs.19.4-8" },
      { title: "Job curses his day", ref: "Job.3.1-11" },
      { title: "Jeremiah: cursed be the day", ref: "Jer.20.14-18" },
      { title: "Jesus sorrowful unto death", ref: "Mark.14.32-36" },
      { title: "The jailer: do thyself no harm", ref: "Acts.16.25-34" },
    ],
  },

  // ── With others ────────────────────────────────────────────────────────
  {
    id: "alone",
    title: "Loneliness and going it alone",
    group: "others",
    lede: "No one to tell, no one who asks. Temptation grows best in the dark.",
    topics: ["loneliness", "isolation", "friendship", "fellowship", "accountability", "brotherhood"],
    ideas: [
      { title: "Two are better than one", refs: ["Eccl.4.9-12", "Prov.18.24"], question: "If you fell tonight, who would lift you up? Do they know that?" },
      { title: "Confess to one another", refs: ["Jas.5.16", "1John.1.7", "Prov.28.13", "Gal.6.1-2"], question: "What have you never said out loud to another man?" },
      { title: "Iron sharpens iron", refs: ["Prov.27.17", "Prov.27.6", "Prov.13.20"], question: "Who in your life is allowed to wound you as a friend?" },
      { title: "Don't stop meeting", refs: ["Heb.10.24-25", "Heb.3.12-13", "Acts.2.42-47"], question: "Which Christian men do you see every week? If none, who could you ask?" },
      { title: "I will never leave thee", refs: ["Heb.13.5-6", "Deut.31.6", "Ps.68.6", "Ps.27.10"], question: "When you feel most alone, what do you believe about God in that moment?" },
    ],
    stories: [
      { title: "Aaron and Hur hold up Moses' hands", ref: "Exod.17.10-13" },
      { title: "Ruth will not leave Naomi", ref: "Ruth.1.16-18" },
      { title: "David and Jonathan", ref: "1Sam.18.1-4" },
      { title: "Elijah alone under the juniper tree", ref: "1Kgs.19.3-18" },
      { title: "Sent out two by two", ref: "Luke.10.1-2" },
      { title: "Watch with me", ref: "Matt.26.36-41" },
      { title: "Paul asks for Timothy", ref: "2Tim.4.9-18" },
    ],
  },
  {
    id: "tongue",
    title: "Lying, crude talk and the tongue",
    group: "others",
    lede: "Small lies, crude jokes, the group chat. What comes out shows what is in.",
    topics: ["lying", "honesty", "tongue", "gossip", "words", "speech", "slander", "truth", "cursing"],
    ideas: [
      { title: "Out of the abundance of the heart", refs: ["Matt.12.34-37", "Luke.6.45"], question: "Read your last week of messages as if Jesus were in the chat. What would you take back?" },
      { title: "A little member", refs: ["Jas.3.2-10", "Prov.18.21"], question: "Where has your tongue started a fire you are still putting out?" },
      { title: "Putting away lying", refs: ["Eph.4.25", "Col.3.9-10", "Prov.12.22"], question: "Which lie do you tell so often you have half stopped noticing it?" },
      { title: "No corrupt communication", refs: ["Eph.4.29", "Eph.5.3-4", "Col.4.6"], question: "What would change if every joke you told had to be fit for a brother's ears and a sister's?" },
      { title: "A talebearer revealeth secrets", refs: ["Prov.11.13", "Prov.16.28", "Prov.26.20-22"], question: "Who have you talked about this week who was not there to answer?" },
      { title: "Set a watch before my mouth", refs: ["Ps.141.3", "Ps.19.14", "Prov.10.19", "Jas.1.26"], question: "When is it wisest for you to say less?" },
    ],
    stories: [
      { title: "Abram calls Sarai his sister", ref: "Gen.12.11-19" },
      { title: "Jacob deceives his father", ref: "Gen.27.18-24" },
      { title: "Isaiah, a man of unclean lips", ref: "Isa.6.5-7" },
      { title: "Peter denies Christ", ref: "Matt.26.69-75" },
      { title: "Ananias and Sapphira", ref: "Acts.5.1-11" },
    ],
  },
  {
    id: "approval",
    title: "Going along and the fear of men",
    group: "others",
    lede: "Going along with the guys, keeping quiet, needing to be liked.",
    topics: ["peer pressure", "approval", "conformity", "boldness", "courage", "friends", "fear"],
    ideas: [
      { title: "If sinners entice thee", refs: ["Prov.1.10-15", "Ps.1.1-2"], question: "Where are you walking, standing and sitting with those you know are heading the wrong way?" },
      { title: "Evil communications corrupt good manners", refs: ["1Cor.15.33", "Prov.12.26", "2Cor.6.14"], question: "Which friendship is changing you more than you are changing it?" },
      { title: "The fear of man bringeth a snare", refs: ["Prov.29.25", "Gal.1.10", "John.12.42-43"], question: "Whose opinion do you check before you decide what you think?" },
      { title: "Fear not them which kill the body", refs: ["Matt.10.28-33", "Isa.51.7-8"], question: "What has it cost you so far to be known as a Christian, and what are you afraid it will?" },
      { title: "Love not the world", refs: ["1John.2.15-17", "Jas.4.4", "Rom.12.2"], question: "Where do you look exactly like everyone else your age, and should you?" },
      { title: "Not ashamed of the gospel", refs: ["Rom.1.16", "2Tim.1.8", "Mark.8.38"], question: "When were you last quiet about Christ because of who was in the room?" },
    ],
    stories: [
      { title: "Aaron makes the golden calf", ref: "Exod.32.21-24" },
      { title: "Rehoboam listens to the young men", ref: "1Kgs.12.6-11" },
      { title: "Daniel's friends will not bow", ref: "Dan.3.13-18" },
      { title: "Pilate gives the crowd what it wants", ref: "Mark.15.12-15" },
      { title: "We cannot but speak", ref: "Acts.4.18-20" },
      { title: "Peter withdraws from the Gentiles", ref: "Gal.2.11-14" },
    ],
  },
  {
    id: "women",
    title: "Dating, singleness and marriage",
    group: "others",
    lede: "Wanting a wife, waiting for one, and how to treat the women in your life now.",
    topics: ["dating", "marriage", "singleness", "being single", "relationships", "love", "husbands", "purity"],
    ideas: [
      { title: "As sisters, with all purity", refs: ["1Tim.5.1-2", "1Thess.4.3-6"], question: "Would the women you talk to say you treat them with all purity, as sisters?" },
      { title: "Stir not up love until it please", refs: ["Song.2.7", "Song.8.4"], question: "What are you awakening in yourself, or in her, before its time?" },
      { title: "Whoso findeth a wife", refs: ["Gen.2.18", "Prov.18.22", "Prov.31.10-12", "Prov.31.30"], question: "What are you actually looking for in a wife? Would Proverbs 31 change your list?" },
      { title: "As Christ loved the church", refs: ["Eph.5.25-33", "1Pet.3.7", "Col.3.19"], question: "Which of these could you start practising now, before marriage, toward the people around you?" },
      { title: "Charity suffereth long", refs: ["1Cor.13.4-7", "Song.8.6-7"], question: "Put your name in place of charity in verses 4 to 7. Which line is hardest to read?" },
      { title: "The unmarried careth for the things of the Lord", refs: ["1Cor.7.7-8", "1Cor.7.32-35", "Matt.19.10-12"], question: "If you are single this year, what could you give to God that a married man could not?" },
    ],
    stories: [
      { title: "Isaac and Rebekah", ref: "Gen.24.61-67" },
      { title: "Jacob serves seven years for Rachel", ref: "Gen.29.18-20" },
      { title: "Samson demands a Philistine wife", ref: "Judg.14.1-3" },
      { title: "Boaz and Ruth at the threshing floor", ref: "Ruth.3.7-13" },
      { title: "Solomon's wives turn his heart", ref: "1Kgs.11.1-4" },
      { title: "Joseph will not shame Mary", ref: "Matt.1.18-25" },
    ],
  },
  {
    id: "father",
    title: "Fathers, family and home",
    group: "others",
    lede: "Honouring parents you love, or ones who hurt you, and leaving home well.",
    topics: ["fathers", "parents", "family", "father", "children", "home", "honoring parents"],
    ideas: [
      { title: "Honour thy father and thy mother", refs: ["Exod.20.12", "Eph.6.1-3", "Prov.23.22"], question: "What would honouring your parents look like now that you are a man and not a child?" },
      { title: "A father of the fatherless", refs: ["Ps.68.5", "2Cor.6.18", "Matt.7.9-11"], question: "What did your father teach you about God without meaning to? What does Scripture say instead?" },
      { title: "Fathers, provoke not your children", refs: ["Eph.6.4", "Col.3.21"], question: "What from your father's house do you want to carry on, and what should stop with you?" },
      { title: "The son shall not bear the iniquity of the father", refs: ["Ezek.18.19-20", "Exod.20.5-6", "1Pet.1.18-19"], question: "What pattern in your family do you fear repeating? Bring it to the one who redeems." },
      { title: "Leave father and mother", refs: ["Gen.2.24", "Matt.10.37", "Luke.14.26"], question: "In what ways have you still not left home, and in what ways have you left it badly?" },
      { title: "My son, give me thine heart", refs: ["Prov.23.26", "Prov.4.1-4"], question: "Which older man could you ask to teach you what your father could not?" },
    ],
    stories: [
      { title: "Eli would not restrain his sons", ref: "1Sam.3.11-14" },
      { title: "Jonathan defends David to his father", ref: "1Sam.20.30-34" },
      { title: "Absalom steals the hearts of Israel", ref: "2Sam.15.1-6" },
      { title: "David weeps for Absalom", ref: "2Sam.18.33" },
      { title: "Jesus subject to his parents", ref: "Luke.2.49-52" },
      { title: "The father runs to his son", ref: "Luke.15.20-24" },
    ],
  },

  // ── Faith and calling ──────────────────────────────────────────────────
  {
    id: "doubt",
    title: "Doubt and hard questions",
    group: "faith",
    lede: "Arguments online, questions you cannot answer, and the fear that it might not be true.",
    topics: ["doubt", "faith", "unbelief", "questions", "evidence", "resurrection", "truth"],
    ideas: [
      { title: "Help thou mine unbelief", refs: ["Mark.9.23-24", "Jas.1.5-6"], question: "Can you pray the father's prayer honestly: I believe, and help my unbelief?" },
      { title: "Come and see", refs: ["John.1.45-46", "John.20.24-29"], question: "What would you need to see, and are you willing to go and look?" },
      { title: "Many infallible proofs", refs: ["Luke.1.1-4", "Acts.1.3", "1Cor.15.3-8", "2Pet.1.16"], question: "Have you weighed the evidence for the resurrection yourself, or only heard others argue about it?" },
      { title: "A reason of the hope that is in you", refs: ["1Pet.3.15", "2Cor.10.5"], question: "Which question do you dread being asked? Start writing your answer." },
      { title: "To whom shall we go?", refs: ["John.6.66-69", "Ps.73.1-3", "Ps.73.16-17"], question: "If you left, where would you go? What does that alternative actually offer?" },
      { title: "The heavens declare", refs: ["Ps.19.1-4", "Rom.1.19-20", "Job.38.1-7"], question: "Go outside tonight and look up for ten minutes. What do you notice?" },
    ],
    stories: [
      { title: "Gideon's fleece", ref: "Judg.6.36-40" },
      { title: "Fire on Carmel", ref: "1Kgs.18.36-39" },
      { title: "John asks, art thou he?", ref: "Matt.11.2-6" },
      { title: "Zacharias doubts the angel", ref: "Luke.1.18-20" },
      { title: "The Bereans search the Scriptures", ref: "Acts.17.10-12" },
    ],
  },
  {
    id: "dryness",
    title: "Prayer, the Word and a cold heart",
    group: "faith",
    lede: "When God feels far, prayer feels empty, and the Bible sits unopened.",
    topics: ["prayer", "bible study", "devotion", "spiritual growth", "meditation", "seeking god", "reading the bible"],
    ideas: [
      { title: "As the hart panteth", refs: ["Ps.42.1-2", "Ps.63.1", "Ps.84.1-2"], question: "What are you thirsty for this week, honestly?" },
      { title: "Draw nigh to God", refs: ["Jas.4.8", "Jer.29.12-13", "Rev.3.20"], question: "What would drawing near look like in ten minutes tomorrow morning?" },
      { title: "Thy word is quick and powerful", refs: ["Ps.119.97-104", "2Tim.3.16-17", "Heb.4.12"], question: "Which verse could you carry in memory this week, and when will you learn it?" },
      { title: "Pray without ceasing", refs: ["1Thess.5.16-18", "Luke.18.1", "Matt.6.5-13"], question: "What would it take to pray the Lord's Prayer slowly, every day for a week?" },
      { title: "Abide in me", refs: ["John.15.4-8", "Ps.46.10"], question: "What are you trying to produce without staying joined to the vine?" },
      { title: "Return to thy first love", refs: ["Rev.2.4-5", "Hos.6.1-3", "Lam.3.40-41"], question: "When did you last love God most? What were you doing then that you have stopped?" },
    ],
    stories: [
      { title: "Josiah hears the book of the law", ref: "2Kgs.22.8-13" },
      { title: "Daniel prays three times a day", ref: "Dan.6.10" },
      { title: "Jesus rises a great while before day", ref: "Mark.1.35" },
      { title: "Mary sits at his feet", ref: "Luke.10.38-42" },
      { title: "The road to Emmaus", ref: "Luke.24.13-32" },
    ],
  },
  {
    id: "identity",
    title: "Who you are and what you're for",
    group: "faith",
    lede: "Manhood, calling and purpose, read from Scripture rather than the feed.",
    topics: ["identity", "purpose", "calling", "manhood", "men", "strength", "integrity", "young men"],
    ideas: [
      { title: "Quit you like men", refs: ["1Cor.16.13-14", "1Kgs.2.2-3"], question: "Paul pairs strength with love in the same breath. Which do you lean on, and which do you lack?" },
      { title: "Let no man despise thy youth", refs: ["1Tim.4.12", "Titus.2.6-8"], question: "In which of word, conduct, love, faith and purity could you be an example this month?" },
      { title: "Sons, not servants", refs: ["Gal.4.6-7", "Rom.8.14-17", "1John.3.1-2"], question: "Do you live like a son of God or like a hired hand who hopes to be kept on?" },
      { title: "A new creation", refs: ["2Cor.5.17", "Gal.2.20", "1Pet.2.9"], question: "What old label do you still answer to?" },
      { title: "A lamp unto my feet", refs: ["Ps.119.105", "Josh.1.8", "Rom.12.2"], question: "Where are you getting your picture of a man: the feed, your friends, or the Word?" },
      { title: "The husband and father to come", refs: ["Eph.5.25-29", "Deut.6.5-7", "Ps.127.1"], question: "What kind of man would you want your son to be? Are you becoming that man?" },
      { title: "Made for good works", refs: ["Eph.2.10", "Matt.5.14-16", "1John.2.14"], question: "John says young men are strong and have overcome. What would you build if you believed that?" },
    ],
    stories: [
      { title: "Joseph faithful in prison", ref: "Gen.39.20-23" },
      { title: "Samuel: speak, for thy servant heareth", ref: "1Sam.3.8-10" },
      { title: "David before Goliath", ref: "1Sam.17.32-37" },
      { title: "Daniel resolves not to defile himself", ref: "Dan.1.8-17" },
      { title: "Josiah seeks God while young", ref: "2Chr.34.1-3" },
      { title: "Timothy's faith from his mother and grandmother", ref: "2Tim.1.5" },
    ],
  },
];

/** The studies under each group heading, in list order. */
export function studiesByGroup(): { group: (typeof STUDY_GROUPS)[number]; studies: Struggle[] }[] {
  return STUDY_GROUPS.map((group) => ({ group, studies: STRUGGLES.filter((s) => s.group === group.id) }));
}

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
export function readersPassages(all: Topic[], s: Struggle, skip: Set<number>, limit = 20): [number, number][] {
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

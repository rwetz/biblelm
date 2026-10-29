// "Scripture or myth?" (docs/SUBROSA.md, S5): things people are sure the
// Bible says, each answered with the verses and, where it is not Scripture,
// where it came from (the dossiers' tags: tradition, folklore, modern
// invention). Written by hand and checked by a test like the dossiers.
// Each question is a card on the FSRS scheduler (src/lib/fsrs.ts): a wrong
// answer brings it back soon, a right one later and later.

import type { ClaimTag } from "./dossiers";
import { newCard, review, type Card } from "./fsrs";

export interface Question {
  id: string;
  /** Said as a statement, to be judged. */
  claim: string;
  /** Is it in Scripture? */
  scripture: boolean;
  /** Where it comes from, when it is not Scripture's. */
  origin?: Exclude<ClaimTag, "scripture">;
  answer: string;
  refs: string[];
}

export const QUESTIONS: Question[] = [
  { id: "apple", claim: "The forbidden fruit was an apple.", scripture: false, origin: "tradition", answer: "Genesis says only \"the fruit of the tree\". The apple came later, helped by a Latin pun: malum is both \"evil\" and \"apple\".", refs: ["Gen.3.3", "Gen.3.6"] },
  { id: "lucifer", claim: "The Bible names Satan \"Lucifer\".", scripture: false, origin: "tradition", answer: "\"Lucifer\", the morning star, is the Vulgate's and the KJV's word in a taunt against the king of Babylon. Reading it as Satan's name came from later interpreters.", refs: ["Isa.14.12"] },
  { id: "pitchfork", claim: "The devil has horns, a tail and a pitchfork.", scripture: false, origin: "folklore", answer: "Scripture draws him as a serpent and a great red dragon. The horns and the fork come from medieval art and the stage.", refs: ["Rev.12.9"] },
  { id: "rules-hell", claim: "Satan rules over hell.", scripture: false, origin: "tradition", answer: "Revelation has the devil thrown into the lake of fire, not reigning there. The king of hell is Dante's and Milton's.", refs: ["Rev.20.10"] },
  { id: "eyes", claim: "Some angels are wheels full of eyes.", scripture: true, answer: "Ezekiel sees wheels beside the living creatures, their rims full of eyes round about.", refs: ["Ezek.1.18", "Ezek.10.12"] },
  { id: "six-wings", claim: "The seraphim have six wings.", scripture: true, answer: "\"Each one had six wings; with twain he covered his face, and with twain he covered his feet, and with twain he did fly.\"", refs: ["Isa.6.2"] },
  { id: "cherubs", claim: "Cherubs are winged babies.", scripture: false, origin: "tradition", answer: "The cherubim guard Eden with a flaming sword and have four faces. The winged babies are the putti of Renaissance painting.", refs: ["Gen.3.24", "Ezek.10.14"] },
  { id: "three-kings", claim: "Three wise men came to the infant Jesus.", scripture: false, origin: "tradition", answer: "Matthew counts the gifts, three, not the wise men. Their number, their crowns and their names came later.", refs: ["Matt.2.1", "Matt.2.11"] },
  { id: "magdalene", claim: "Mary Magdalene had been a prostitute.", scripture: false, origin: "tradition", answer: "Luke says seven devils went out of her. The prostitute came from a sermon of Pope Gregory the Great in 591, which joined her to other women of the Gospels.", refs: ["Luke.8.2"] },
  { id: "beast-666", claim: "The number of the beast is 666.", scripture: true, answer: "Revelation gives 666. Some early manuscripts read 616, and Irenaeus knew both.", refs: ["Rev.13.18"] },
  { id: "antichrist", claim: "Revelation tells of the Antichrist.", scripture: false, origin: "tradition", answer: "The word \"antichrist\" is only in John's letters, where there are many. Revelation has the beast; joining the two is later reading.", refs: ["1John.2.18"] },
  { id: "legion", claim: "A demon gives his name as Legion.", scripture: true, answer: "\"My name is Legion: for we are many.\"", refs: ["Mark.5.9"] },
  { id: "tartarus", claim: "Scripture sends fallen angels to Tartarus.", scripture: true, answer: "Second Peter's Greek says God \"cast them down to Tartarus\"; English Bibles print \"hell\".", refs: ["2Pet.2.4"] },
  { id: "gehenna", claim: "The hell Jesus warns of is named after a valley outside Jerusalem.", scripture: true, answer: "His word is Gehenna, the valley of the son of Hinnom, where Jeremiah condemns the burning of children.", refs: ["Mark.9.43", "Jer.7.31"] },
  { id: "lilith", claim: "Lilith is named in the Bible.", scripture: true, answer: "Once, among the creatures of a ruined land in Isaiah; the KJV says \"screech owl\". The story of Adam's first wife is medieval.", refs: ["Isa.34.14"] },
  { id: "azazel", claim: "Azazel is named in the Law of Moses.", scripture: true, answer: "On the Day of Atonement one goat is \"for Azazel\", the KJV's \"scapegoat\".", refs: ["Lev.16.8"] },
  { id: "serpent-satan", claim: "Genesis calls the serpent in Eden Satan.", scripture: false, origin: "tradition", answer: "Genesis calls it a serpent, more subtle than any beast. Revelation later names \"that old serpent, called the Devil, and Satan\".", refs: ["Gen.3.1", "Rev.12.9"] },
  { id: "solomon-demons", claim: "The Bible says Solomon commanded demons.", scripture: false, origin: "tradition", answer: "Kings praises his wisdom, not any power over spirits. The demons are the Testament of Solomon's, and the Goetia's after it.", refs: ["1Kgs.4.29"] },
  { id: "money", claim: "Scripture says money is the root of all evil.", scripture: false, origin: "folklore", answer: "It says \"the love of money is the root of all evil\".", refs: ["1Tim.6.10"] },
  { id: "endor", claim: "A woman at Endor called up the prophet Samuel for King Saul.", scripture: true, answer: "Saul seeks out a woman with a familiar spirit, and she sees Samuel come up out of the earth.", refs: ["1Sam.28.7", "1Sam.28.14"] },
  { id: "archangel", claim: "Scripture calls Michael an archangel.", scripture: true, answer: "\"Michael the archangel, when contending with the devil\".", refs: ["Jude.1.9"] },
  { id: "whale", claim: "Jonah was swallowed by a whale.", scripture: true, answer: "Jonah says \"a great fish\". Matthew's Greek says a sea monster, which the KJV prints as \"whale\".", refs: ["Jonah.1.17", "Matt.12.40"] },
];

export type QuizCards = Record<string, Card>;

/** Today's question: the most overdue card, else the first not yet asked; null when none is due. */
export function nextQuestion(cards: QuizCards, now = Date.now()): Question | null {
  const due = QUESTIONS.filter((q) => cards[q.id] && cards[q.id].due <= now).sort((a, b) => cards[a.id].due - cards[b.id].due);
  return due[0] ?? QUESTIONS.find((q) => !cards[q.id]) ?? null;
}

/** The card after answering: wrong comes back in minutes (again), right on the schedule (good). */
export function answer(cards: QuizCards, q: Question, right: boolean, now = Date.now()): QuizCards {
  const card = cards[q.id] ?? newCard(q.id, q.refs[0], undefined, now);
  return { ...cards, [q.id]: review(card, right ? 3 : 1, now) };
}

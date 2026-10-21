// The questions BibleLM asks Jev, with no imports, so the app and the
// benchmark (scripts/bench/jev.ts) send exactly the same requests.

export const MODEL = "jev-latest";

// 1. How to treat a query typed into search.
export const ROUTE_QUESTIONS = {
  intent: {
    type: "choice",
    instructions: "A person typed this into a Bible study search box. What are they most likely looking for?",
    criteria: {
      words: "Verses containing these exact words or this phrase",
      theme: "Passages about a theme, idea or situation, whatever words they use",
      story: "A particular narrative, event or person in the Bible",
      question: "An answer to a question, which the app should meet with relevant passages, not a reply",
    },
  },
};

// 3. What kind of passage a verse is.
export const VERSE_QUESTIONS = {
  kind: {
    type: "choice",
    instructions: "What kind of passage is this Bible verse, judged from its own words?",
    criteria: {
      narrative: "Tells what happened: events, journeys, deeds",
      law: "Commands, rules or instructions for worship and life",
      praise: "Praise or thanksgiving to God",
      lament: "Grief, complaint or a cry for help",
      prophecy: "A message of warning, judgment or promise spoken for God",
      teaching: "Explains, argues or exhorts: wisdom, doctrine, counsel",
      prayer: "Words addressed to God, asking or confessing",
      list: "Names, numbers, genealogies, boundaries or inventories",
    },
  },
};

// 4. How closely each cross reference speaks to the open verse.
export const XREF_LEVELS = [
  "Unrelated to the verse",
  "Shares a word or an image only",
  "Speaks to the same subject",
  "Makes the same point, or quotes or fulfils it",
];

export function xrefQuestions(source: { ref: string; text: string }, refs: { ref: string; text: string }[]) {
  return Object.fromEntries(
    refs.map((r, i) => [
      `x${i}`,
      {
        type: "score",
        instructions: `A reader is studying ${source.ref}: "${source.text}". How closely does ${r.ref} speak to it? Judge only this passage: "${r.text}"`,
        criteria: XREF_LEVELS,
      },
    ]),
  );
}

// 5. What the Lab's model wrote (never Scripture).
export const JUDGE_QUESTIONS = {
  style: {
    type: "score",
    instructions: "This text was written by a tiny language model imitating the King James Bible. How much does it sound like the King James Version?",
    criteria: ["Not at all", "A few phrases do", "Mostly, with odd words or grammar", "Could pass for the King James Version"],
  },
  sense: {
    type: "score",
    instructions: "Setting style aside, how much sense do the sentences of this generated text make?",
    criteria: ["None: word salad", "Fragments make sense", "Most sentences make sense", "It reads as a coherent passage"],
  },
};

// 6. A question typed into search: which passages answer it, which words in
// each, and whether one of the hand-written notes on the text does (src/lib/notes.ts).

export const ANSWER_LEVELS = [
  "Does not answer the question",
  "Touches the subject but does not answer it",
  "Gives part of an answer",
  "Answers the question directly",
];

/**
 * A verse cut at its punctuation into the clauses Jev may choose between.
 * Very short pieces join the one before, and there are at most `max`.
 */
export function clauses(text: string, max = 6): string[] {
  const parts: string[] = [];
  for (const p of text.split(/(?<=[;:,.?!])\s+/)) {
    const s = p.trim();
    if (!s) continue;
    if (parts.length && s.split(/\s+/).length < 3) parts[parts.length - 1] += ` ${s}`;
    else parts.push(s);
  }
  // A short opening ("Yea,") belongs to the clause it opens.
  if (parts.length > 1 && parts[0].split(/\s+/).length < 3) parts.splice(0, 2, `${parts[0]} ${parts[1]}`);
  while (parts.length > max) {
    // Join the shortest neighbouring pair.
    let at = 0;
    for (let i = 1; i < parts.length - 1; i++) if (parts[i].length + parts[i + 1].length < parts[at].length + parts[at + 1].length) at = i;
    parts.splice(at, 2, `${parts[at]} ${parts[at + 1]}`);
  }
  return parts;
}

export function answerQuestions(question: string, passages: { ref: string; text: string; clauses: string[] }[], notes: { id: string; about: string }[]) {
  const q: Record<string, unknown> = {
    note: {
      type: "choice",
      instructions: `Someone asked a Bible study app: "${question}". If the question is about the Bible as a book (its translation, wording, printing or numbering), which note answers it?`,
      criteria: {
        ...Object.fromEntries(notes.map((n) => [n.id, n.about])),
        none: "None of these: no note answers it, or the question asks what Scripture itself says",
      },
    },
  };
  passages.forEach((p, i) => {
    q[`a${i}`] = {
      type: "score",
      instructions: `Someone asked: "${question}". How well does ${p.ref} answer it? Judge only this passage: "${p.text}"`,
      criteria: ANSWER_LEVELS,
    };
    if (p.clauses.length > 1)
      q[`c${i}`] = {
        type: "choice",
        instructions: `Someone asked: "${question}". Which words of ${p.ref} speak to it most directly?`,
        criteria: Object.fromEntries(p.clauses.map((c, j) => [`c${j}`, c])),
      };
  });
  return q;
}

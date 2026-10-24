// The 1 Enoch parser on a few lines laid out like the Gutenberg text.
import { describe, expect, it } from "vitest";
import { parseCharles, roman } from "./enoch.mjs";

const page = (body) => `front matter\n\n   THE BOOK OF ENOCH\n      I-XXXVI.\n\n${body}\n\nPRINTED IN GREAT BRITAIN BY RICHARD CLAY.\n`;
const parse = (body) => Object.fromEntries(parseCharles(page(body), []).flatMap((c) => c.v.map(([v, t]) => [`${c.c}.${v}`, t])));

describe("parseCharles", () => {
  it("reads Roman numerals", () => {
    expect([roman("I"), roman("IV"), roman("XLIX"), roman("XCIX"), roman("CVIII")]).toEqual([1, 4, 49, 99, 108]);
  });

  it("splits chapters and verses, inline and at line starts, and drops the critical signs", () => {
    const v = parse(`I. 1. The words of the blessing 〚and〛 of Enoch. 2. And he took up
his ⌜parable⌝ and said.

    3. Concerning the elect I said.

II. Observe ye every thing.`);
    expect(v).toEqual({
      "1.1": "The words of the blessing and of Enoch.",
      "1.2": "And he took up his parable and said.",
      "1.3": "Concerning the elect I said.",
      "2.1": "Observe ye every thing.",
    });
  });

  it("never takes a number in the prose for a verse", () => {
    const v = parse(`I. 1. In 8 years she falls behind 80 days. 2. And the year is completed.`);
    expect(v["1.1"]).toBe("In 8 years she falls behind 80 days.");
    expect(v["1.2"]).toBe("And the year is completed.");
  });

  it("starts a chapter from its heading when the text opens on a bare 1.", () => {
    const v = parse(`I. 1. First.

             II. _The Coming Judgement._

    1. The first Parable.`);
    expect(v["2.1"]).toBe("The first Parable.");
  });

  it("keeps the Ethiopic and drops a Greek column beside it", () => {
    const v = parse(`I. 1. First.

     E

     II. 1. After these fragrant odours.

          G^g

          II. 1. To the north-east I beheld.

2. And thence I went.`);
    expect(v["2.1"]).toBe("After these fragrant odours.");
    expect(v["2.2"]).toBe("And thence I went.");
  });

  it("joins lettered half-verses, which Charles prints out of order", () => {
    const v = parse(`I. 1. First.
    6 _a._ And there mine eyes saw,
    7 _a._ And I saw his dwelling-place.
    6 _b._ And righteousness shall prevail.`);
    expect(v["1.6"]).toBe("And there mine eyes saw, And righteousness shall prevail.");
    expect(v["1.7"]).toBe("And I saw his dwelling-place.");
  });

  it("resumes a chapter Charles moved, from its heading", () => {
    const v = parse(`III. 1. Third. 2. More.

                  III. 12-17. _The Last Weeks._

    12. And after that the eighth week.`);
    expect(v["3.12"]).toBe("And after that the eighth week.");
  });
});

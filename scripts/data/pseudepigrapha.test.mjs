// The Pseudepigrapha and library parsers, on a few paragraphs laid out like their sources.
import { describe, expect, it } from "vitest";
import { htmlParas } from "./lib.mjs";
import { numbered, parseConybeare, parseJamesChapters, parseSefariaChapter } from "./pseudepigrapha.mjs";
import { prose, verse } from "./library.mjs";

describe("htmlParas", () => {
  it("reads paragraphs as text: footnote markers and page numbers out, <br> kept as a line", () => {
    const html = `<p>And he said<sup id="cite_ref-1" class="reference"><a href="#n1">[1]</a></sup>: Come
hither.</p><p>Line one<br />line two &amp; three</p><span class="pagenum ws-pagenum"><span class="pagenum-inner">12</span></span>`;
    expect(htmlParas(html)).toEqual(["And he said: Come hither.", "Line one\nline two & three"]);
  });
});

describe("numbered", () => {
  it("splits on the next verse number only, inline or at a paragraph's start", () => {
    const v = numbered(["1 Many of them shall be false prophets. 2 And in 40 days they shall become sons of perdition.", "3 And then shall God come."]);
    expect(v).toEqual([
      [1, "Many of them shall be false prophets."],
      [2, "And in 40 days they shall become sons of perdition."],
      [3, "And then shall God come."],
    ]);
  });

  it("joins a paragraph without a number to the verse before it, and text before the first to verse 1", () => {
    expect(numbered(["A heading of sorts.", "1 First.", "Still the first.", "2 Second."])).toEqual([
      [1, "A heading of sorts. First. Still the first."],
      [2, "Second."],
    ]);
  });
});

describe("parseConybeare", () => {
  it("reads his numbered paragraphs, mending the known slip", () => {
    const [c] = parseConybeare(["Introductory remarks.", "1. Testament of Solomon, son of David.", "2. And behold.", "3. So King Solomon.", "12, And the angel bade the whales.", "13. So Ornias took the finger-ring.", "↑ a note"]);
    // 12 is too far after 3 to be a verse: a number in the prose stays in it.
    expect(c.v.map(([n]) => n)).toEqual([1, 2, 3]);
    const [d] = parseConybeare(["1. Testament of Solomon.", "2. I Solomon.", "3, And the angel bade the whales.", "4. So Ornias.", "↑ a note"], [["3, And the angel", "3. And the angel"]]);
    expect(d.v).toEqual([[1, "Testament of Solomon."], [2, "I Solomon."], [3, "And the angel bade the whales."], [4, "So Ornias."]]);
  });
});

describe("parseJamesChapters", () => {
  it("heads chapters by a numeral, the running number in brackets winning, and drops James's bracketed notes", () => {
    const cs = parseJamesChapters(["I", "1 For the chief priests.", "2 And Pilate.", "[A note of James's.]", "II (XVIII)", "Now when we were set together."]);
    expect(cs).toEqual([
      { c: 1, v: [[1, "For the chief priests."], [2, "And Pilate."]] },
      { c: 18, v: [[1, "Now when we were set together."]] },
    ]);
  });
});

describe("parseSefariaChapter", () => {
  it("takes Charles's version and joins his broken lines", () => {
    const json = { versions: [{ versionTitle: "The Book of Jubilees, trans. R. H. Charles. London [1917]", text: ["And He called<br>to Moses.", "And Moses went up."] }] };
    expect(parseSefariaChapter(1, json)).toEqual({ c: 1, v: [[1, "And He called to Moses."], [2, "And Moses went up."]] });
    expect(() => parseSefariaChapter(1, { versions: [] })).toThrow();
  });
});

describe("library text", () => {
  it("joins prose lines, drops italics marks and Gutenberg's footnote blocks", () => {
    expect(prose(["The _Lemegeton_ is", "in five parts.[1]", "", "Footnote 1:", "", "  A note."])).toEqual(["The Lemegeton is in five parts."]);
  });

  it("keeps verse lines, a blank or an indent starting a new paragraph", () => {
    expect(verse(["Midway upon the journey", "    I found myself", "", "Ah me!"])).toEqual(["Midway upon the journey\nI found myself", "Ah me!"]);
    expect(verse(["Of Man's first disobedience,", "    Say first, for Heaven"], { indentStarts: true })).toEqual(["Of Man's first disobedience,", "Say first, for Heaven"]);
  });
});

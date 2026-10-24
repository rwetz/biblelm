import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { linkRef, Markdown } from "./markdown";

const html = (text: string) => renderToStaticMarkup(<Markdown text={text} />);

describe("a note's Markdown", () => {
  it("draws bold, italic and code inline", () => {
    expect(html("Jesus **must** go through _Samaria_, `dei`")).toBe("<div><p>Jesus <strong>must</strong> go through <em>Samaria</em>, <code class=\"rounded bg-muted px-1 font-mono text-[0.85em]\">dei</code></p></div>");
  });

  it("makes lists, quotes and paragraphs", () => {
    const out = html("Two things:\n\n- grace\n- truth\n\n> the Word was made flesh");
    expect(out).toContain("<ul");
    expect(out).toContain("<li>grace</li><li>truth</li>");
    expect(out).toContain("<blockquote");
  });

  it("links verses written either way, and leaves anything else as typed", () => {
    expect(linkRef("John.3.16")).toEqual({ book: "John", chapter: 3, verse: 16 });
    expect(linkRef("Rom 8:28")).toEqual({ book: "Rom", chapter: 8, verse: 28 });
    expect(html("see [[John.3.16]]")).toContain("John 3:16");
    expect(html("see [[not a verse]]")).toContain("[[not a verse]]");
  });

  it("never turns a note's text into HTML", () => {
    expect(html("<img src=x onerror=alert(1)>")).toContain("&lt;img");
  });
});

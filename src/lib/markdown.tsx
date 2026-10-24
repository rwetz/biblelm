// A note's Markdown, drawn as React elements (never as raw HTML, so a note
// can hold no script): paragraphs, "- " lists, "> " quotes, "# " headings,
// **bold**, *italic* or _italic_, `code`, and [[John.3.16]] or [[John 3:16]]
// links that open the verse. Enough for study notes; anything else shows as
// typed.

import { Fragment, type ReactNode } from "react";
import { formatRef, parseOsis, parseRef, type Ref } from "./canon";

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_|`[^`\n]+`|\[\[[^\]\n]+\]\])/g;

/** "[[John.3.16]]" or "[[John 3:16]]" -> a Ref, or undefined. */
export function linkRef(inner: string): Ref | undefined {
  return parseOsis(inner.trim()) ?? parseRef(inner.trim());
}

function inline(text: string, onRef?: (r: Ref) => void): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part.startsWith("**")) return <strong key={i}>{inline(part.slice(2, -2), onRef)}</strong>;
    if (part.startsWith("`")) return <code key={i} className="rounded bg-muted px-1 font-mono text-[0.85em]">{part.slice(1, -1)}</code>;
    if (part.startsWith("[[")) {
      const r = linkRef(part.slice(2, -2));
      if (!r) return part;
      return onRef ? (
        <button key={i} type="button" onClick={(e) => (e.stopPropagation(), onRef(r))} className="text-brand hover:underline">
          {formatRef(r)}
        </button>
      ) : (
        <span key={i} className="text-brand">{formatRef(r)}</span>
      );
    }
    return <em key={i}>{inline(part.slice(1, -1), onRef)}</em>;
  });
}

export function Markdown({ text, onRef, className }: { text: string; onRef?: (r: Ref) => void; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*] /.test(l)))
          return (
            <ul key={b} className="my-1 list-disc pl-5">
              {lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*[-*] /, ""), onRef)}</li>)}
            </ul>
          );
        if (lines.every((l) => l.startsWith(">")))
          return (
            <blockquote key={b} className="my-1 border-l-2 border-border pl-3 italic text-muted-foreground">
              {inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "), onRef)}
            </blockquote>
          );
        const head = /^#{1,6}\s+(.*)$/.exec(lines[0]);
        return (
          <p key={b} className={b ? "mt-2" : undefined}>
            {head && <strong>{inline(head[1], onRef)}</strong>}
            {(head ? lines.slice(1) : lines).map((l, i) => (
              <Fragment key={i}>
                {(head || i > 0) && <br />}
                {inline(l, onRef)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

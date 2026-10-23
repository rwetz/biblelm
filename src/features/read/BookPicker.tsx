// Go to a book and chapter: the books under their sections, as the contents
// page of a printed Bible lays them out, then that book's chapters as a grid.
// Replaces a 66-row dropdown that had to be scrolled to find anything.

import { useState } from "react";
import { Button, Icon, Popover, PopoverContent, PopoverTrigger, cn } from "@nexis/design";
import { book as bookOf, bookName, SHELVES } from "@/lib/canon";
import type { Translation } from "@/lib/bible";

const SECTIONS: { testament: "OT" | "NT"; title: string; books: string[] }[] = [
  { testament: "OT", title: "Law", books: ["Gen", "Exod", "Lev", "Num", "Deut"] },
  { testament: "OT", title: "History", books: ["Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth"] },
  { testament: "OT", title: "Poetry and wisdom", books: ["Job", "Ps", "Prov", "Eccl", "Song"] },
  { testament: "OT", title: "Major prophets", books: ["Isa", "Jer", "Lam", "Ezek", "Dan"] },
  { testament: "OT", title: "Minor prophets", books: ["Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal"] },
  { testament: "NT", title: "Gospels", books: ["Matt", "Mark", "Luke", "John"] },
  { testament: "NT", title: "History", books: ["Acts"] },
  { testament: "NT", title: "Letters of Paul", books: ["Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm"] },
  { testament: "NT", title: "Other letters", books: ["Heb", "Jas", "1Pet", "2Pet", "1John", "2John", "3John", "Jude"] },
  { testament: "NT", title: "Prophecy", books: ["Rev"] },
];
const LISTED = new Set(SECTIONS.flatMap((s) => s.books));

export function BookPicker({
  t,
  books,
  bookId,
  chapter,
  onGo,
}: {
  t: Translation;
  /** The books on the enabled shelves, in canonical order. */
  books: string[];
  bookId: string;
  chapter: number;
  onGo: (book: string, chapter: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const have = new Set(books);
  const extra = books.filter((b) => !LISTED.has(b));
  const extraSections = SHELVES.filter((s) => s.id !== "protestant")
    .map((s) => ({ title: s.label, books: extra.filter((b) => bookOf(b)?.shelf === s.id) }))
    .filter((s) => s.books.length);

  const choose = (b: string) => {
    const chs = t.chapters(b);
    if (chs.length <= 1) {
      onGo(b, chs[0] ?? 1);
      setOpen(false);
    } else setPicked(b);
  };

  const column = (testament: "OT" | "NT") => (
    <div className="min-w-0 space-y-3">
      <p className="font-garamond text-lg text-foreground">{testament === "OT" ? "Old Testament" : "New Testament"}</p>
      {SECTIONS.filter((s) => s.testament === testament).map((s) => (
        <Section key={s.title} title={s.title} books={s.books.filter((b) => have.has(b))} current={bookId} onPick={choose} cols={testament === "OT" ? 3 : 2} />
      ))}
    </div>
  );

  const showing = picked ?? null;
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setPicked(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" className="min-w-40 justify-between gap-2" aria-label="Book and chapter">
          <span className="truncate">
            {bookName(bookId)} {chapter}
          </span>
          <Icon name="chevron-down" size="xs" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[78vh] w-[min(52rem,calc(100vw-2rem))] overflow-y-auto p-5">
        {showing ? (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Button variant="ghost" size="icon-sm" aria-label="Back to the books" onClick={() => setPicked(null)}>
                <Icon name="chevron-left" />
              </Button>
              <p className="font-garamond text-xl text-foreground">{bookName(showing)}</p>
              <span className="text-xs text-muted-foreground">{t.chapters(showing).length} chapters</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
              {t.chapters(showing).map((c) => {
                const on = showing === bookId && c === chapter;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onGo(showing, c);
                      setOpen(false);
                    }}
                    className={cn(
                      "h-9 rounded-lg text-sm tabular-nums transition-colors outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
                      on ? "bg-brand/12 font-semibold text-brand" : "text-muted-foreground",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-6 sm:grid-cols-[3fr_2fr]">
              {column("OT")}
              {column("NT")}
            </div>
            {extraSections.length > 0 && (
              <div className="grid gap-6 border-t border-border/60 pt-4 sm:grid-cols-2">
                {extraSections.map((s) => (
                  <Section key={s.title} title={s.title} books={s.books} current={bookId} onPick={choose} />
                ))}
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, books, current, onPick, cols = 2 }: { title: string; books: string[]; current: string; onPick: (b: string) => void; cols?: 2 | 3 }) {
  if (!books.length) return null;
  return (
    <section>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">{title}</p>
      <div className={cn("grid gap-x-1", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {books.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onPick(b)}
            className={cn(
              "truncate rounded-md px-2 py-1 text-left text-sm transition-colors outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
              b === current ? "bg-brand/12 font-medium text-brand" : "text-foreground/80",
            )}
          >
            {bookName(b)}
          </button>
        ))}
      </div>
    </section>
  );
}

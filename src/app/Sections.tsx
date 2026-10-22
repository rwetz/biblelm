// A page's parts as a book's contents: a Roman numeral, the name, a line on
// what is there, and a dithered ornament in place of an icon. The open one is
// inked: its numeral in the accent, its ornament fully resolved, a line of
// drifting dots under it. Used wherever a page switches between views (the
// Lab's rooms, Topics, the Atlas, the Gallery).

import { cn } from "@nexis/design";
import { Ornament } from "@/art/Art";
import type { OrnamentName } from "@/art/ornaments";

export type Section<Id extends string> = { id: Id; name: string; gist: string; mark: OrnamentName };

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function Sections<Id extends string>({
  sections,
  value,
  onChange,
  label,
  className,
}: {
  sections: readonly Section<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  /** Accessible name of the navigation. */
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("-mx-2 flex flex-wrap gap-1", className)}>
      {sections.map((s, i) => {
        const on = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onChange(s.id)}
            className={cn("group relative flex min-w-[10.5rem] shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted/60", on && "bg-muted/70")}
          >
            <span className={cn("w-8 font-garamond text-xl leading-none tracking-wide transition-colors", on ? "text-brand" : "text-muted-foreground group-hover:text-foreground")}>{ROMAN[i] ?? i + 1}</span>
            <span className="min-w-0">
              <span className={cn("block font-garamond text-[17px] leading-tight", on ? "text-foreground" : "text-foreground/80")}>{s.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{s.gist}</span>
            </span>
            <Ornament name={s.mark} reveal={false} level={on ? 1 : 0.7} className="ml-auto h-7" />
            {on && <span aria-hidden className="palette-seek is-seeking absolute inset-x-3 bottom-0.5 h-0.5" />}
          </button>
        );
      })}
    </nav>
  );
}

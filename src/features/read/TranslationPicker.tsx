// Choose the translation to read: each one with its date, its canon and what
// it marks, grouped by language, instead of a bare list of names.

import { useState } from "react";
import { Button, Icon, Popover, PopoverContent, PopoverTrigger, cn } from "@nexis/design";
import type { TranslationMeta } from "@/lib/bible";

export function TranslationPicker({ catalog, value, onChange }: { catalog: TranslationMeta[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = catalog.find((t) => t.id === value);
  const languages = [...new Set(catalog.map((t) => t.language))];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" className="justify-between gap-2" aria-label="Translation">
          <span className="font-medium">{current?.abbr ?? value.toUpperCase()}</span>
          <span className="hidden max-w-44 truncate text-muted-foreground @2xl:inline">{current?.name}</span>
          <Icon name="chevron-down" size="xs" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(30rem,calc(100vw-2rem))] gap-3 p-3">
        {languages.map((lang) => (
          <section key={lang}>
            {languages.length > 1 && <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">{lang}</p>}
            <div className="space-y-0.5">
              {catalog
                .filter((t) => t.language === lang)
                .map((t) => {
                  const on = t.id === value;
                  const marks = [t.books.length > 66 ? `${t.books.length} books` : t.books.length < 66 ? "Old Testament only" : "66 books", t.strongs && "Strong's", t.redLetter && "red letter"].filter(Boolean);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onChange(t.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/40",
                        on && "bg-brand/12",
                      )}
                    >
                      <span className={cn("w-9 shrink-0 pt-0.5 font-mono text-xs font-semibold", on ? "text-brand" : "text-muted-foreground")}>{t.abbr}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className={cn("truncate font-garamond text-[17px]", on ? "text-brand" : "text-foreground")}>{t.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{t.year}</span>
                        </span>
                        <span className="block text-xs text-muted-foreground">{marks.join(" · ")}</span>
                      </span>
                      {on && <Icon name="check" size="sm" className="mt-1 text-brand" />}
                    </button>
                  );
                })}
            </div>
          </section>
        ))}
      </PopoverContent>
    </Popover>
  );
}

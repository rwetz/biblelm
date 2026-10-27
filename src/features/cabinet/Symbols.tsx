// The cabinet's symbols (src/lib/symbols.ts): a database of signs, each drawn
// and dithered in a halo of dots, filtered by family or by a word, and opening
// on a sheet of facts, the claims where it has them, its pictures and its
// neighbours.

import { useMemo, useState } from "react";
import { Button, cn, Icon, Input } from "@nexis/design";
import { Dither, Fleuron, Ornament, usePlates } from "@/art/Art";
import { plateUrl } from "@/lib/art";
import { curio, FAMILIES, SYMBOLS, type Curio, type SymbolFamily } from "@/lib/dossiers";
import type { LibraryEntry } from "@/lib/library";
import { ClaimList, Pictures, ReadOnList } from "./Claims";

/** A symbol drawn and dithered in its halo, or its plate dithered where it is a picture (Baphomet). */
export function SymbolArt({ c, dot = 2, className }: { c: Curio; dot?: number; className?: string }) {
  const plates = usePlates();
  if (c.mark) return <Ornament name={c.mark} label={c.title} glow algo="floyd" dot={dot} className={className} />;
  const plate = plates.find((p) => p.n === c.plates?.[0]);
  return plate ? <Dither src={plateUrl(plate.full)} algo="floyd" dot={dot} focusY={30} label={c.title} className={cn("text-foreground", className)} style={{ aspectRatio: `${plate.full.width} / ${plate.full.height}` }} /> : null;
}

/** A symbol as a tile: its drawing, its name, its family. */
export function SymbolTile({ c, onOpen, small = false, family = !small }: { c: Curio; onOpen: () => void; small?: boolean; family?: boolean }) {
  return (
    <button type="button" onClick={onOpen} className="group block w-full text-left">
      <span className={cn("grid place-items-center", small ? "h-20" : "h-28")}>
        <SymbolArt c={c} className={small ? "h-16" : "h-24"} dot={small ? 1.5 : 2} />
      </span>
      <span className={cn("mt-1.5 block font-garamond leading-tight group-hover:underline", small ? "text-[15px]" : "text-lg")}>{c.title}</span>
      {family && <span className="mt-0.5 block text-[11px] text-muted-foreground">{c.family?.[0] ? FAMILIES[c.family[0]] : ""}</span>}
    </button>
  );
}

const ORDER = Object.keys(FAMILIES) as SymbolFamily[];

/** Every fact a symbol has, flattened, for the filter. */
const haystack = (c: Curio) => [c.title, c.lede, ...(c.data ?? []).flat(), ...c.claims.map((x) => x.text)].join(" ").toLowerCase();

export function SymbolsShelf({ family, onFamily, onOpen }: { family: SymbolFamily | null; onFamily: (f: SymbolFamily | null) => void; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return SYMBOLS.filter((c) => (!family || c.family?.includes(family)) && words.every((w) => haystack(c).includes(w)));
  }, [family, q]);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Chip on={!family} onClick={() => onFamily(null)}>All {SYMBOLS.length}</Chip>
        {ORDER.map((f) => (
          <Chip key={f} on={family === f} onClick={() => onFamily(family === f ? null : f)}>
            {FAMILIES[f]} {SYMBOLS.filter((c) => c.family?.includes(f)).length}
          </Chip>
        ))}
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a symbol, a metal, a degree" aria-label="Find a symbol" className="ml-auto h-8 w-full max-w-64 text-sm" />
      </div>
      <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-5 gap-y-7">
        {shown.map((c) => (
          <li key={c.id}>
            <SymbolTile c={c} onOpen={() => onOpen(c.id)} />
          </li>
        ))}
      </ul>
      {!shown.length && <p className="mt-6 font-garamond text-muted-foreground">Nothing matches.</p>}
    </>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("rounded-full px-2.5 py-1 text-xs transition-colors", on ? "bg-foreground text-background" : "bg-muted/70 text-muted-foreground hover:bg-foreground/10 hover:text-foreground")}
    >
      {children}
    </button>
  );
}

/** A symbol's sheet: the drawing, its facts in a table, its claims, pictures, neighbours. */
export function SymbolView({ c, library, back, onClose, onOpen, onRead }: { c: Curio; library: LibraryEntry[]; back: string; onClose: () => void; onOpen: (id: string) => void; onRead: (text: string, section: number) => void }) {
  const rows: [string, string][] = [
    ["Family", (c.family ?? []).map((f) => FAMILIES[f]).join(", ")],
    ...(c.data ?? []),
    ...(c.unicode ? [["Unicode", `U+${c.unicode}`] as [string, string]] : []),
  ];
  const see = (c.see ?? []).map(curio).filter((x): x is Curio => !!x);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <article className="mx-auto max-w-[46rem] px-(--gutter) pb-24 pt-(--page-top)">
        <Button variant="ghost" size="sm" onClick={onClose} className="mb-4">
          <Icon name="chevron-left" /> {back}
        </Button>
        <header className="grid items-center gap-6 sm:grid-cols-[13rem_1fr]">
          <SymbolArt c={c} dot={2.5} className="mx-auto h-48 sm:h-52" />
          <div>
            <h1 className="font-blackletter text-5xl leading-tight">{c.title}</h1>
            <p className="mt-2 font-garamond text-lg italic text-muted-foreground">{c.lede}</p>
          </div>
        </header>
        <dl className="mt-8 divide-y divide-border border-y border-border">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-x-6 gap-y-0.5 py-2.5 sm:grid-cols-[11rem_1fr]">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground sm:pt-1">{k}</dt>
              <dd className="font-garamond text-[17px] leading-snug">{v}</dd>
            </div>
          ))}
        </dl>
        {c.claims.length > 0 && <ClaimList claims={c.claims} className="mt-8" />}
        {!!(c.plates?.length || c.paintings?.length) && <Pictures plates={c.plates} paintings={c.paintings} className="mt-10" />}
        {c.read && c.read.length > 0 && (
          <section className="mt-10">
            <h2 className="font-garamond text-xl">Read on</h2>
            <div className="mt-2">
              <ReadOnList read={c.read} library={library} onRead={onRead} />
            </div>
          </section>
        )}
        {see.length > 0 && (
          <section className="mt-10">
            <h2 className="font-garamond text-xl">See also</h2>
            <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-4">
              {see.map((s) => (
                <li key={s.id}>
                  {s.kind === "symbol" ? (
                    <SymbolTile c={s} small onOpen={() => onOpen(s.id)} />
                  ) : (
                    <button type="button" onClick={() => onOpen(s.id)} className="font-garamond text-[15px] hover:underline">{s.title}</button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        <Fleuron />
      </article>
    </div>
  );
}

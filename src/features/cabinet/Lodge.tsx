// The cabinet's lodge (src/lib/lodge.ts): Freemasonry as a reference. The
// degrees by rite and body, the officers and their stations, the numbers,
// the emblems (masonic symbols, each opening its sheet), the tracing boards
// and charts, and the dates.

import { useState } from "react";
import { cn } from "@nexis/design";
import { Ornament } from "@/art/Art";
import { curio, SYMBOLS } from "@/lib/dossiers";
import { DATES, LODGE_PAINTINGS, LODGE_PLATES, NUMBERS, OFFICERS, RITES } from "@/lib/lodge";
import type { OrnamentName } from "@/art/ornaments";
import { Pictures } from "./Claims";
import { Chip, SymbolTile } from "./Symbols";

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 mt-12 border-b border-border pb-2 font-garamond text-2xl first:mt-0">{children}</h2>;
}

export function LodgeShelf({ onSymbol }: { onSymbol: (id: string) => void }) {
  const [rite, setRite] = useState(RITES[0].id);
  const shown = RITES.find((r) => r.id === rite)!;
  const emblems = SYMBOLS.filter((c) => c.family?.includes("masonic"));
  return (
    <div>
      <Heading>Degrees</Heading>
      <div className="flex flex-wrap gap-2">
        {RITES.map((r) => (
          <Chip key={r.id} on={r.id === rite} onClick={() => setRite(r.id)}>{r.name}</Chip>
        ))}
      </div>
      <p className="mt-3 font-garamond text-[15px] text-muted-foreground">{shown.gist}</p>
      <div className="mt-5 grid gap-x-10 gap-y-6 md:grid-cols-2">
        {shown.bodies.map((b) => (
          <section key={b.name}>
            <h3 className="flex items-baseline justify-between gap-3 font-garamond text-lg">
              {b.name}
              {b.range && <span className="text-xs tabular-nums text-muted-foreground">{b.range}</span>}
            </h3>
            <ol className="mt-1.5 divide-y divide-border/60">
              {b.degrees.map((d) => (
                <li key={d.name} className="grid grid-cols-[2.25rem_1fr] gap-x-2 py-1.5">
                  <span className="pt-0.5 text-right font-garamond text-[15px] tabular-nums text-muted-foreground">{d.n ?? ""}</span>
                  <span>
                    <span className="font-garamond text-[16px]">{d.name}</span>
                    {d.note && <span className="block text-xs text-muted-foreground">{d.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <Heading>Officers</Heading>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-12 py-2 font-normal" />
              <th className="py-2 font-normal">Office</th>
              <th className="py-2 font-normal">Station</th>
              <th className="py-2 font-normal">Jewel</th>
              <th className="py-2 font-normal">Duty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 font-garamond text-[15px]">
            {OFFICERS.map((o) => {
              const c = o.mark ? curio(o.mark) : undefined;
              return (
                <tr key={o.name} className="align-top">
                  <td className="py-1.5 pr-2">
                    {c?.mark && (
                      <button type="button" onClick={() => onSymbol(c.id)} aria-label={c.title}>
                        <Ornament name={c.mark as OrnamentName} glow algo="floyd" dot={1} className="h-8" />
                      </button>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-[16px]">{o.name}</td>
                  <td className="py-2 pr-4">{o.station}</td>
                  <td className="py-2 pr-4">{o.jewel}</td>
                  <td className="py-2 text-muted-foreground">{o.duty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Heading>Numbers</Heading>
      <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {NUMBERS.map((x) => (
          <li key={x.n} className="grid grid-cols-[4.5rem_1fr] items-baseline gap-3">
            <span className="text-right font-blackletter text-4xl leading-none">{x.n}</span>
            <span className="font-garamond text-[15px] leading-snug">
              {x.what}
              {x.symbol && (
                <button type="button" onClick={() => onSymbol(x.symbol!)} className={cn("ml-1 text-xs text-muted-foreground underline-offset-2 hover:underline")}>
                  {curio(x.symbol)?.title}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <Heading>Emblems</Heading>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-x-5 gap-y-7">
        {emblems.map((c) => (
          <li key={c.id}>
            <SymbolTile c={c} family={false} onOpen={() => onSymbol(c.id)} />
          </li>
        ))}
      </ul>

      <Heading>Tracing boards and charts</Heading>
      <Pictures paintings={LODGE_PAINTINGS} plates={LODGE_PLATES} />

      <Heading>Dates</Heading>
      <ol className="divide-y divide-border/60">
        {DATES.map(([when, what]) => (
          <li key={when} className="grid grid-cols-[9rem_1fr] gap-4 py-2">
            <span className="font-garamond text-[15px] tabular-nums text-muted-foreground">{when}</span>
            <span className="font-garamond text-[16px] leading-snug">{what}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

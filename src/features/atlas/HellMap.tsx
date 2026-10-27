// The Atlas's hell, under the rose (src/lib/hell.ts): Botticelli's Map of Hell
// with Dante's descent marked on it. A mark opens what Dante found there, the
// Doré plates of that canto, and the canto itself in the cabinet's library.

import { useEffect, useState } from "react";
import { Button, cn, Icon } from "@nexis/design";
import { Engraving, usePaintings, usePlates } from "@/art/Art";
import { paintingCredit, paintingUrl } from "@/lib/art";
import { HELL, HELL_PAINTING, type HellPlace } from "@/lib/hell";
import { loadLibrary, type LibraryEntry } from "@/lib/library";
import { useStudy } from "@/store/study";

export function HellMap() {
  const painting = usePaintings().find((p) => p.id === HELL_PAINTING);
  const plates = usePlates();
  const openCabinet = useStudy((s) => s.openCabinet);
  const openLook = useStudy((s) => s.openLook);
  const [inferno, setInferno] = useState<LibraryEntry | null>(null);
  const [on, setOn] = useState<HellPlace>(HELL[0]);
  useEffect(() => {
    loadLibrary().then((l) => setInferno(l.find((t) => t.id === "inferno") ?? null), () => {});
  }, []);
  if (!painting) return <p className="p-8 text-sm text-muted-foreground">The map of hell is not built yet: run node scripts/art/curios.mjs.</p>;
  // Doré's plates of this canto, by the canto their caption names.
  const ofCanto = plates.filter((p) => p.rose && new RegExp(`^Inferno, ${on.canto}\\b(?!I|V|X)`).test(p.alt ?? ""));
  const section = inferno?.sections.findIndex((s) => s.title === on.canto) ?? -1;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-(--gutter) pb-20 pt-6 lg:grid-cols-[1fr_20rem]">
        <figure>
          <div className="relative">
            <img src={paintingUrl(painting.full)} alt={`${painting.title}, ${paintingCredit(painting)}`} className="w-full rounded-sm" />
            {HELL.map((h, i) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setOn(h)}
                aria-label={h.name}
                aria-pressed={on.id === h.id}
                style={{ left: `${h.x}%`, top: `${h.y}%` }}
                className={cn(
                  "absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-garamond text-[13px] shadow ring-1 transition-transform hover:scale-110",
                  on.id === h.id ? "bg-brand text-brand-foreground ring-brand" : "bg-card/90 text-foreground ring-foreground/30",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <figcaption className="mt-2 text-xs text-muted-foreground">
            {painting.title}, {paintingCredit(painting)}. The marks follow Dante down, from the gate to the ice.
          </figcaption>
        </figure>
        <aside>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {HELL.indexOf(on) + 1} of {HELL.length} · Inferno, {on.canto}
          </p>
          <h2 className="mt-1 font-blackletter text-3xl leading-tight">{on.name}</h2>
          <p className="mt-2 font-garamond text-[17px] leading-relaxed">{on.gist}</p>
          {section >= 0 && (
            <Button variant="ghost" size="sm" className="-ml-3 mt-2" onClick={() => openCabinet({ text: "inferno", section, shelf: "library" })}>
              Read {on.canto} <Icon name="chevron-right" />
            </Button>
          )}
          {ofCanto.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {ofCanto.map((p) => (
                <button key={p.id} type="button" onClick={() => openLook({ kind: "plate", id: p.id })} className="group text-left">
                  <Engraving plate={p} size="thumb" className="aspect-[4/5] w-full rounded-sm object-cover" />
                  <span className="mt-1 block font-garamond text-sm leading-tight group-hover:underline">{p.title}</span>
                </button>
              ))}
            </div>
          )}
          <ol className="mt-6 space-y-0.5 border-t border-border pt-3">
            {HELL.map((h, i) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setOn(h)}
                  className={cn("flex w-full gap-2 rounded-md px-2 py-1 text-left font-garamond text-[15px] hover:bg-muted/60", on.id === h.id && "bg-muted/70")}
                >
                  <span className="w-5 shrink-0 text-right tabular-nums text-muted-foreground">{i + 1}</span>
                  {h.name}
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">Dante's hell, not Scripture's: a poem of the 1300s, drawn in the 1480s.</p>
        </aside>
      </div>
    </div>
  );
}

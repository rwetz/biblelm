// Developer mode: every piece of art on demand, so a bad crop, a plate tied
// to the wrong verse or a dither that loses the picture can be found without
// waiting for the church year or reading to the right chapter.

import { useMemo } from "react";
import { Button, Field, Icon, Panel, Slider, Switch, cn } from "@nexis/design";
import { Dither, Engraving, Ornament, useHeroes, usePlates } from "@/art/Art";
import { ORNAMENTS, type OrnamentName } from "@/art/ornaments";
import { heroUrl, plateUrl, seasonalHero } from "@/lib/art";
import { formatRef } from "@/lib/canon";
import { useStudy } from "@/store/study";

export function DeveloperPanel() {
  const { devMode, devHero, devPlate, set, read, go } = useStudy();
  const heroes = useHeroes();
  const plates = usePlates();
  const today = useMemo(() => seasonalHero(heroes), [heroes]);
  const n = devPlate ?? 1;
  const plate = plates.find((p) => p.n === n);
  const step = (d: number) => set({ devPlate: Math.min(plates.length || 241, Math.max(1, n + d)) });

  return (
    <Panel title="Developer" meta="for finding art and layout bugs">
      <div className="space-y-6">
        <Field label="Developer mode" hint="Choose the Home hero and the sidebar plate yourself instead of the church year and your reading." inline>
          <Switch checked={devMode} onCheckedChange={(on) => set({ devMode: on })} />
        </Field>

        {devMode && (
          <>
            <section>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">Home hero</p>
                <button
                  type="button"
                  onClick={() => set({ devHero: null })}
                  className={cn("text-xs hover:underline", devHero ? "text-brand" : "text-muted-foreground")}
                >
                  Follow the church year{today ? ` (today: ${today.title})` : ""}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {heroes.map((h) => {
                  const on = (devHero ?? today?.id) === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => set({ devHero: h.id })}
                      className={cn(
                        "overflow-hidden rounded-lg text-left ring-1 transition-colors hover:ring-foreground/40",
                        on ? "ring-2 ring-brand" : "ring-foreground/10",
                      )}
                    >
                      <Dither src={heroUrl(h)} algo={h.algo === "bayer" ? "bayer" : "atkinson"} reveal={false} className="h-24 w-full text-foreground" />
                      <span className="block truncate px-2 py-1 text-[11px] text-muted-foreground">{h.title}</span>
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => go("home")}>
                <Icon name="home" size="sm" /> See it on Home
              </Button>
            </section>

            <section>
              <div className="mb-2 flex items-center gap-3">
                <p className="text-sm font-medium">Plates</p>
                <span className="text-xs text-muted-foreground">
                  {n} of {plates.length || 241}, shown in the sidebar while chosen
                </span>
                <span className="flex-1" />
                <Button variant="ghost" size="icon-sm" aria-label="Previous plate" onClick={() => step(-1)}>
                  <Icon name="chevron-left" />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Next plate" onClick={() => step(1)}>
                  <Icon name="chevron-right" />
                </Button>
              </div>
              <Slider value={[n]} min={1} max={plates.length || 241} step={1} onValueChange={([v]) => set({ devPlate: v })} />
              {plate && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <figure>
                    <Engraving plate={plate} size="thumb" className="w-full" />
                    <figcaption className="mt-1 text-[11px] text-muted-foreground">Engraving, as beside the text ({plate.full.width} px scan)</figcaption>
                  </figure>
                  <figure>
                    <Dither key={plate.id} src={plateUrl(plate.full)} algo="floyd" dot={1} focusY={30} className="aspect-[4/5] w-full text-foreground" />
                    <figcaption className="mt-1 text-[11px] text-muted-foreground">Dithered, as in the sidebar and empty states</figcaption>
                  </figure>
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-garamond text-lg">{plate.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {plate.ref ? formatRef(plate.ref) : `No parsed reference (${plate.refText})`} · {plate.id}
                      </p>
                    </div>
                    {plate.ref && (
                      <Button variant="secondary" size="sm" onClick={() => read(plate.ref!, { select: true })}>
                        Open the passage
                      </Button>
                    )}
                    {devPlate && (
                      <Button variant="ghost" size="sm" onClick={() => set({ devPlate: null })}>
                        Sidebar follows reading again
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section>
              <p className="mb-2 text-sm font-medium">Ornaments</p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {(Object.keys(ORNAMENTS) as OrnamentName[]).map((name) => (
                  <div key={name} className="flex flex-col items-center gap-1 rounded-lg p-2 ring-1 ring-foreground/10">
                    <div className="grid h-20 w-full place-items-center">
                      <Ornament name={name} className={ORNAMENTS[name].w > ORNAMENTS[name].h * 1.5 ? "w-full" : "h-20"} />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{ORNAMENTS[name].title}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </Panel>
  );
}

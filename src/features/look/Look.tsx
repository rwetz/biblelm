// Look: one picture, the whole window, with the passage it shows beside it.
// The old practice of praying with a picture (visio divina) asks only this:
// look, read, look again. Paintings are kept as painted, dissolving into the
// page only at their edges; Doré's plates stay engravings.

import { useEffect, useMemo } from "react";
import { Button, Icon, Tooltip, TooltipContent, TooltipTrigger } from "@nexis/design";
import { Engraving, Painting, paintingShadow, usePaintings, usePlates } from "@/art/Art";
import { byBibleOrder, paintingCredit, paintingUrl, plateCredit, type Painting as PaintingData, type Plate } from "@/lib/art";
import { formatRef, type Ref } from "@/lib/canon";
import { useTranslation } from "@/lib/hooks";
import { VerseText } from "@/features/read/ReadView";
import { useStudy } from "@/store/study";

/** Everything Look can step through, in Bible order: paintings first in a chapter, then plates. */
export function useLookList(): { kind: "painting" | "plate"; item: PaintingData | Plate }[] {
  const paintings = usePaintings();
  const plates = usePlates();
  return useMemo(
    () => [...[...paintings].sort(byBibleOrder).map((item) => ({ kind: "painting" as const, item })), ...plates.map((item) => ({ kind: "plate" as const, item }))],
    [paintings, plates],
  );
}

export function Look() {
  const look = useStudy((s) => s.look);
  const openLook = useStudy((s) => s.openLook);
  const read = useStudy((s) => s.read);
  const translation = useStudy((s) => s.translation);
  const [t] = useTranslation(translation);
  const list = useLookList();
  const at = look ? list.findIndex((x) => x.kind === look.kind && x.item.id === look.id) : -1;
  const cur = at >= 0 ? list[at] : null;
  // Step within the same kind, so arrows walk the paintings or the plates.
  const same = useMemo(() => (cur ? list.filter((x) => x.kind === cur.kind) : []), [list, cur]);
  const pos = cur ? same.indexOf(cur) : -1;

  useEffect(() => {
    if (!look) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") openLook(null);
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (step && same.length) {
        const next = same[(pos + step + same.length) % same.length];
        openLook({ kind: next.kind, id: next.item.id });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [look, same, pos, openLook]);

  if (!look || !cur) return null;
  const ref: Ref | null = cur.item.ref;
  const verses = t && ref ? t.range(ref) : [];
  const painting = cur.kind === "painting" ? (cur.item as PaintingData) : null;
  const plate = cur.kind === "plate" ? (cur.item as Plate) : null;
  const go = (step: number) => {
    const next = same[(pos + step + same.length) % same.length];
    openLook({ kind: next.kind, id: next.item.id });
  };

  return (
    <div role="dialog" aria-modal aria-label={`Look: ${cur.item.title}`} className="fixed inset-0 z-50 flex bg-background text-foreground">
      <div className="relative min-w-0 flex-1">
        {painting ? (
          <Painting
            key={painting.id}
            src={paintingUrl(painting.full)}
            dot={2}
            label={`${painting.title}, ${paintingCredit(painting)}`}
            look={{
              colour: painting.colour,
              focusX: painting.focusX,
              focusY: painting.focusY,
              edges: { top: 0.1, right: 0.1, bottom: 0.14, left: 0.1 },
              grain: 0,
              shadow: paintingShadow(painting) * 0.5,
              fit: "contain",
            }}
            className="absolute inset-6"
          />
        ) : (
          plate && (
            <div className="absolute inset-6 grid place-items-center overflow-hidden">
              <Engraving key={plate.id} plate={plate} className="max-h-full w-auto object-contain" />
            </div>
          )
        )}
      </div>
      <aside className="flex w-[26rem] shrink-0 flex-col border-l border-border/60 bg-card/50">
        <header className="flex items-center gap-1 px-4 pt-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Previous" onClick={() => go(-1)}>
                <Icon name="chevron-left" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous ( ← )</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Next" onClick={() => go(1)}>
                <Icon name="chevron-right" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next ( → )</TooltipContent>
          </Tooltip>
          <span className="flex-1 text-center text-xs text-muted-foreground">
            {pos + 1} of {same.length}
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => openLook(null)}>
            <Icon name="close" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-6">
          <h2 className="font-garamond text-3xl leading-tight">{cur.item.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {painting ? (
              <>
                {paintingCredit(painting)} · {painting.medium}
                <span className="block">{painting.place}</span>
              </>
            ) : (
              plate ? `${plateCredit(plate)}${plate.artist ? "" : ", wood engraving"}` : ""
            )}
          </p>
          <p className="mt-6 font-garamond text-sm italic text-muted-foreground">Look first. Then read. Then look again.</p>
          {ref ? (
            <section className="mt-4">
              <button type="button" className="text-xs font-semibold text-brand hover:underline" onClick={() => { openLook(null); read(ref, { select: true }); }}>
                {formatRef(ref)}
              </button>
              <div className="scripture mt-2 !text-[1.15rem] !leading-8">
                {verses.map((v) => (
                  <span key={v.verse}>
                    <sup className="vnum">{v.verse}</sup>
                    <VerseText raw={v.raw} />{" "}
                  </span>
                ))}
              </div>
            </section>
          ) : (
            painting?.about && <p className="mt-4 font-garamond text-lg leading-8">{painting.about}</p>
          )}
          <footer className="mt-8 border-t border-border/60 pt-3 text-xs leading-5 text-muted-foreground">
            {painting ? painting.licence : "Public domain"} ·{" "}
            <a href={painting?.source ?? plate?.source} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              source
            </a>
          </footer>
        </div>
      </aside>
    </div>
  );
}

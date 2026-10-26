// The Gallery: every picture in the app, in Bible order, each opening in Look
// beside the passage it shows. Paintings appear as painted (thumbnails, no
// dots); Doré's plates as engravings.

import { useMemo, useState } from "react";
import {cn } from "@nexis/design";
import { DitherHero, Engraving, usePaintings, usePlates } from "@/art/Art";
import { byBibleOrder, PAGE_PAINTINGS, paintingCredit, paintingUrl, plateCredit, type Painting, type Plate } from "@/lib/art";
import { bookName, formatRef } from "@/lib/canon";
import { useStudy } from "@/store/study";
import { PageMark } from "@/art/SidebarArt";
import { Sections } from "@/app/Sections";

type Show = "paintings" | "plates";

export function GalleryView() {
  const paintings = usePaintings();
  const plates = usePlates();
  const openLook = useStudy((s) => s.openLook);
  const [show, setShow] = useState<Show>("paintings");
  const hero = paintings.find((p) => p.id === PAGE_PAINTINGS.gallery);
  const groups = useMemo(() => {
    // A detail cut from a plate already shown (Jerome's lion, Merian's wheel) is not a picture of its own.
    const DETAILS = new Set(["empty notebook", "ophan", "living creature"]);
    const items: (Painting | Plate)[] = show === "paintings" ? [...paintings].sort(byBibleOrder) : plates.filter((p) => !DETAILS.has(p.role ?? ""));
    const out: [string, (Painting | Plate)[]][] = [];
    for (const it of items) {
      const key = it.ref ? it.ref.book : "";
      if (out.length && out[out.length - 1][0] === key) out[out.length - 1][1].push(it);
      else out.push([key, [it]]);
    }
    return out;
  }, [show, paintings, plates]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <DitherHero hero={hero} height="clamp(10rem, 27vh, 15rem)" clearLeft fadeFrom={36} caption={false}>
        <div className="mx-auto flex w-full max-w-6xl flex-1 items-end gap-4 px-(--gutter) pb-4">
          <div>
            <h1 className="flex items-center gap-3 font-blackletter text-5xl"><PageMark page="gallery" />Gallery</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Caravaggio, Rembrandt and their followers in oil; Doré, Dürer, Schnorr and Blake in engraving and woodcut. Each opens beside the passage it shows.
            </p>
          </div>
        </div>
      </DitherHero>
      <div className="mx-auto w-full max-w-6xl px-(--gutter) pt-2">
        <Sections
          label="Gallery"
          value={show}
          onChange={setShow}
          sections={[
            { id: "paintings", name: "Paintings", gist: `${paintings.length} in oil, in colour`, mark: "lamp" },
            { id: "plates", name: "Engravings", gist: `${plates.length} plates and woodcuts`, mark: "fleuron" },
          ]}
        />
      </div>
      <div className="mx-auto w-full max-w-6xl px-(--gutter) pb-20">
        {groups.map(([book, items]) => (
          <section key={book || "none"} className="mt-8">
            <h2 className="font-blackletter text-2xl">{book ? bookName(book) : "Beside the Scriptures"}</h2>
            <div className={cn("mt-3 grid gap-x-5 gap-y-6", show === "paintings" ? "grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]")}>
              {items.map((it) => {
                const painting = "medium" in it ? it : null;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => openLook({ kind: painting ? "painting" : "plate", id: it.id })}
                    className="group text-left"
                  >
                    <div className="grid aspect-[4/5] place-items-center overflow-hidden rounded-sm bg-muted/30">
                      {painting ? (
                        <img
                          src={paintingUrl(painting.thumb)}
                          alt={`${painting.title}, ${paintingCredit(painting)}`}
                          loading="lazy"
                          decoding="async"
                          className={cn("h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]", !painting.colour && "engraving")}
                          style={{ objectPosition: `${painting.focusX}% ${painting.focusY}%` }}
                        />
                      ) : (
                        <Engraving plate={it as Plate} size="thumb" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <p className="mt-2 font-garamond text-[15px] leading-snug group-hover:underline">{it.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {painting ? paintingCredit(painting) : plateCredit(it as Plate)}
                      {it.ref && <> · {formatRef(it.ref)}</>}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

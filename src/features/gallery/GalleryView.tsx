// The Gallery: every picture in the app, in Bible order, each opening in Look
// beside the passage it shows. Paintings appear as painted (thumbnails, no
// dots); Doré's plates as engravings.

import { useMemo, useState } from "react";
import { Segmented, cn } from "@nexis/design";
import { DitherHero, Engraving, usePaintings, usePlates } from "@/art/Art";
import { byBibleOrder, PAGE_PAINTINGS, paintingCredit, paintingUrl, type Painting, type Plate } from "@/lib/art";
import { bookName, formatRef } from "@/lib/canon";
import { useStudy } from "@/store/study";

type Show = "paintings" | "plates";

export function GalleryView() {
  const paintings = usePaintings();
  const plates = usePlates();
  const openLook = useStudy((s) => s.openLook);
  const [show, setShow] = useState<Show>("paintings");
  const hero = paintings.find((p) => p.id === PAGE_PAINTINGS.gallery);
  const groups = useMemo(() => {
    const items: (Painting | Plate)[] = show === "paintings" ? [...paintings].sort(byBibleOrder) : plates;
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
      <DitherHero hero={hero} height="15rem" clearLeft fadeFrom={45} caption={false}>
        <div className="mx-auto flex w-full max-w-6xl flex-1 items-end gap-4 px-8 pb-4">
          <div>
            <h1 className="font-blackletter text-5xl">Gallery</h1>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Caravaggio, Rembrandt and their followers in oil, and Doré's engravings. Each opens beside the passage it shows.
            </p>
          </div>
          <span className="flex-1" />
          <Segmented
            label="Show"
            value={show}
            onChange={setShow}
            segments={[
              { id: "paintings", label: `Paintings (${paintings.length})`, icon: "image" },
              { id: "plates", label: `Doré (${plates.length})`, icon: "document" },
            ]}
          />
        </div>
      </DitherHero>
      <div className="mx-auto w-full max-w-6xl px-8 pb-20">
        {groups.map(([book, items]) => (
          <section key={book || "none"} className="mt-8">
            <h2 className="font-blackletter text-2xl">{book ? bookName(book) : "Beside the Scriptures"}</h2>
            <div className={cn("mt-3 grid gap-x-5 gap-y-6", show === "paintings" ? "grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]")}>
              {items.map((it) => {
                const painting = "artist" in it ? it : null;
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
                          className={cn("h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]", !painting.colour && "engraving")}
                          style={{ objectPosition: `${painting.focusX}% ${painting.focusY}%` }}
                        />
                      ) : (
                        <Engraving plate={it as Plate} size="thumb" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <p className="mt-2 font-garamond text-[15px] leading-snug group-hover:underline">{it.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {painting ? paintingCredit(painting) : "Doré, 1866"}
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

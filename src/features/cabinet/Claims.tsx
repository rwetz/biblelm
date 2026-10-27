// The parts a dossier and a symbol share: tagged claims with their verses
// quoted from your translation, the pictures that show it, and where to read on.

import { useEffect, useState } from "react";
import { Badge, cn } from "@nexis/design";
import { Engraving, usePaintings, usePlates } from "@/art/Art";
import { paintingCredit, paintingUrl, plateCredit } from "@/lib/art";
import { formatRef, type Ref } from "@/lib/canon";
import { loadTranslation, type Translation } from "@/lib/bible";
import { TAGS, type Claim, type ClaimTag, type Curio, type ReadOn } from "@/lib/dossiers";
import type { LibraryEntry } from "@/lib/library";
import { studyRef } from "@/lib/studies";
import { useStudy } from "@/store/study";

/** What the four tags mean. */
export function TagKey() {
  return (
    <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      {(Object.keys(TAGS) as ClaimTag[]).map((t) => (
        <span key={t} className="flex items-center gap-1.5">
          <Tag tag={t} /> {TAGS[t].gist}
        </span>
      ))}
    </p>
  );
}

const TAG_VARIANT: Record<ClaimTag, "brand" | "secondary" | "outline"> = { scripture: "brand", tradition: "secondary", folklore: "outline", modern: "outline" };

export function Tag({ tag }: { tag: ClaimTag }) {
  return (
    <Badge variant={TAG_VARIANT[tag]} className={cn("shrink-0", tag === "modern" && "border-dashed")}>
      {TAGS[tag].label}
    </Badge>
  );
}

/** How a dossier's claims divide among the tags, as a line of small counts. */
export function TagCounts({ c }: { c: Curio }) {
  const n = (t: ClaimTag) => c.claims.filter((x) => x.tag === t).length;
  return (
    <span className="mt-1.5 block text-[11px] text-muted-foreground">
      {(Object.keys(TAGS) as ClaimTag[])
        .filter((t) => n(t))
        .map((t) => `${n(t)} ${TAGS[t].label.toLowerCase()}`)
        .join(", ")}
    </span>
  );
}

function useTranslation(): Translation | null {
  const translation = useStudy((s) => s.translation);
  const [t, setT] = useState<Translation | null>(null);
  useEffect(() => {
    let live = true;
    loadTranslation(translation).then((x) => live && setT(x), () => {});
    return () => {
      live = false;
    };
  }, [translation]);
  return t;
}

/** Claims in order, each under its tag, the verses that bear it out quoted beneath. */
export function ClaimList({ claims, className }: { claims: Claim[]; className?: string }) {
  const t = useTranslation();
  const read = useStudy((s) => s.read);
  return (
    <ol className={cn("space-y-6", className)}>
      {claims.map((x, i) => (
        <li key={i} className="space-y-2">
          <div className="flex items-start gap-3">
            <Tag tag={x.tag} />
            <p className="font-garamond text-[17px] leading-relaxed">{x.text}</p>
          </div>
          {t && x.refs && (
            <div className="ml-4 space-y-2 border-l border-border pl-4">
              {x.refs.map((r) => {
                const ref = studyRef(r);
                return ref ? <Quote key={r} r={ref} t={t} onOpen={() => read(ref, { select: true })} /> : null;
              })}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function Quote({ r, t, onOpen }: { r: Ref; t: Translation; onOpen: () => void }) {
  return (
    <blockquote>
      <button type="button" onClick={onOpen} className="text-xs font-semibold text-brand hover:underline">{formatRef(r)}</button>
      <p className="scripture !text-[16px] !leading-7">
        {t.range(r).map((v) => (
          <span key={v.verse}>
            {r.verseEnd && <sup className="vnum">{v.verse}</sup>}
            {v.text}{" "}
          </span>
        ))}
      </p>
    </blockquote>
  );
}

/** Plates (by number) and paintings (by id) as a grid; each opens in Look. */
export function Pictures({ plates: nums = [], paintings: ids = [], className }: { plates?: number[]; paintings?: string[]; className?: string }) {
  const openLook = useStudy((s) => s.openLook);
  const plates = usePlates();
  const paintings = usePaintings();
  const art = [
    ...nums.flatMap((n) => plates.filter((p) => p.n === n).map((p) => ({ key: p.id, kind: "plate" as const, id: p.id, title: p.title, by: plateCredit(p), plate: p }))),
    ...ids.flatMap((id) => paintings.filter((p) => p.id === id).map((p) => ({ key: p.id, kind: "painting" as const, id: p.id, title: p.title, by: paintingCredit(p), src: paintingUrl(p.thumb) }))),
  ];
  if (!art.length) return null;
  return (
    <div className={cn("grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-5", className)}>
      {art.map((a) => (
        <button key={a.key} type="button" onClick={() => openLook({ kind: a.kind, id: a.id })} className="group text-left">
          {a.kind === "plate" ? (
            <Engraving plate={a.plate} size="thumb" className="aspect-[4/5] w-full rounded-sm object-cover" />
          ) : (
            <img src={a.src} alt="" loading="lazy" decoding="async" className="aspect-[4/5] w-full rounded-sm object-cover" />
          )}
          <span className="mt-1 block font-garamond text-sm leading-tight group-hover:underline">{a.title}</span>
          <span className="text-xs text-muted-foreground">{a.by}</span>
        </button>
      ))}
    </div>
  );
}

/** Where to read on: library sections and shelf passages. */
export function ReadOnList({ read: items, library, onRead }: { read: ReadOn[]; library: LibraryEntry[]; onRead: (text: string, section: number) => void }) {
  const read = useStudy((s) => s.read);
  return (
    <ul className="space-y-1.5">
      {items.map((r, i) => {
        if ("passage" in r) {
          const ref = studyRef(r.passage);
          if (!ref) return null;
          return (
            <li key={i}>
              <button type="button" onClick={() => read(ref)} className="font-garamond text-[16px] text-brand hover:underline">
                {formatRef(ref)}
              </button>
            </li>
          );
        }
        const text = library.find((x) => x.id === r.library);
        const section = text?.sections.findIndex((s) => s.title === r.section) ?? -1;
        if (!text || section < 0) return null;
        return (
          <li key={i}>
            <button type="button" onClick={() => onRead(text.id, section)} className="font-garamond text-[16px] hover:underline">
              <span className="italic">{text.title}</span>, {r.section}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// An illustrated notebook for paper (or a PDF through the print dialog): the
// title page with its cover plate, then every note in Bible order with the
// verse it is on and the pictures of that passage, as in an illustrated Bible.
// Paintings print as painted; Doré's plates as engravings.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Engraving, Fleuron, usePaintings, usePlates } from "@/art/Art";
import { paintingCredit, paintingUrl, paintingsInChapter, platesInChapter } from "@/lib/art";
import { bookName, formatRef, parseOsis } from "@/lib/canon";
import { useTranslation } from "@/lib/hooks";
import { VerseText } from "@/features/read/ReadView";
import { useNotebooks, type Notebook } from "@/store/notebooks";

export function PrintNotebook({ nb, onDone }: { nb: Notebook; onDone: () => void }) {
  const notes = useNotebooks((s) => s.notes).filter((n) => n.notebook === nb.id).sort((a, b) => a.start.localeCompare(b.start, undefined, { numeric: true }));
  const [t] = useTranslation(nb.translations[0] ?? "kjv");
  const plates = usePlates();
  const paintings = usePaintings();
  const cover = plates.find((p) => p.id === nb.plate);
  const ready = !!t && plates.length > 0;

  useEffect(() => {
    if (!ready) return;
    const after = () => onDone();
    window.addEventListener("afterprint", after);
    // Let the pictures load before the print dialog takes its snapshot.
    const imgs = [...document.querySelectorAll<HTMLImageElement>(".print-sheet img")];
    Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => ((i.onload = r), (i.onerror = r)))))).then(() => setTimeout(() => window.print(), 50));
    return () => window.removeEventListener("afterprint", after);
  }, [ready, onDone]);

  const shown = new Set<string>();
  let lastBook = "";
  return createPortal(
    <div className="print-sheet">
      <section className="print-title">
        <h1 className="font-blackletter text-6xl">{nb.title}</h1>
        {nb.description && <p className="mt-4 font-garamond text-xl italic">{nb.description}</p>}
        {cover && <Engraving plate={cover} loading="eager" className="mx-auto mt-10 max-h-[60vh] w-auto" />}
        <p className="mt-8 font-garamond text-sm">{notes.length} notes · {(nb.translations[0] ?? "kjv").toUpperCase()}</p>
      </section>
      {t &&
        notes.map((n) => {
          const r = parseOsis(n.start);
          if (!r) return null;
          const end = n.end ? parseOsis(n.end) : undefined;
          const ref = end ? { ...r, verseEnd: end.verse } : r;
          const book = r.book;
          const newBook = book !== lastBook;
          lastBook = book;
          const chapterKey = `${r.book}.${r.chapter}`;
          const first = !shown.has(chapterKey);
          shown.add(chapterKey);
          const pics = first ? platesInChapter(plates, r.book, r.chapter).slice(0, 1) : [];
          const paints = first ? paintingsInChapter(paintings, r.book, r.chapter).slice(0, 1) : [];
          return (
            <article key={n.id} className="print-note">
              {newBook && <h2 className="mt-10 text-center font-blackletter text-4xl">{bookName(book)}</h2>}
              {paints.map((p) => (
                <figure key={p.id} className="my-6 text-center">
                  <img src={paintingUrl(p.full)} alt="" className="mx-auto max-h-[45vh] w-auto" />
                  <figcaption className="mt-1 font-garamond text-xs italic">{p.title}, {paintingCredit(p)}</figcaption>
                </figure>
              ))}
              {pics.map((p) => (
                <figure key={p.id} className="my-6 text-center">
                  <Engraving plate={p} loading="eager" className="mx-auto max-h-[45vh] w-auto" />
                  <figcaption className="mt-1 font-garamond text-xs italic">{p.title}, Gustave Doré</figcaption>
                </figure>
              ))}
              <h3 className="mt-6 font-garamond text-lg font-semibold">{formatRef(ref)}</h3>
              <blockquote className="scripture my-2 border-l-2 pl-4 !text-[15px] !leading-7">
                {t.range(ref).map((v) => (
                  <span key={v.verse}>
                    <VerseText raw={v.raw} />{" "}
                  </span>
                ))}
              </blockquote>
              <div className="whitespace-pre-wrap font-garamond text-[15px] leading-7">{n.body}</div>
              {n.tags.length > 0 && <p className="mt-1 text-xs">{n.tags.map((x) => `#${x}`).join(" ")}</p>}
            </article>
          );
        })}
      <Fleuron />
    </div>,
    document.body,
  );
}

// Sub Rosa, the cabinet: shown only under the rose. Its shelves hold the
// library (the Goetia, Dionysius, Dante, Milton and the Masons: books read
// beside the Bible, never as it), the dossiers and the symbols (each claim
// tagged Scripture, tradition, folklore or modern invention, src/lib/dossiers.ts)
// and the books of the Pseudepigrapha shelf, which open in the reader. A
// library text reads here, section by section, in its own pages, so nothing
// of it is ever set as Scripture. See docs/SUBROSA.md.

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, cn, Icon, Spinner } from "@nexis/design";
import { CornerPlate, DitherHero, Engraving, Fleuron, Ornament, useHeroes, usePagePlate, usePaintings, usePlates } from "@/art/Art";
import { PageMark } from "@/art/SidebarArt";
import { Sections } from "@/app/Sections";
import { PAGE_PLATES, paintingCredit, paintingUrl, plateCredit } from "@/lib/art";
import { BOOKS, bookName, formatRef, type Ref } from "@/lib/canon";
import { loadTranslation, type Translation } from "@/lib/bible";
import { curio, DOSSIERS, SYMBOLS, TAGS, type ClaimTag, type Curio, type ReadOn } from "@/lib/dossiers";
import { byline, headingOf, loadLibrary, loadLibraryText, type LibraryEntry, type LibraryText } from "@/lib/library";
import { studyRef } from "@/lib/studies";
import { useStudy, type CabinetPlace, type CabinetShelf } from "@/store/study";
import { DataMissing } from "@/features/read/ReadView";

/** The books beside the Bible, in the reader: the Pseudepigrapha shelf, with a line on each. */
const BESIDE: Record<string, string> = {
  "1En": "The Watchers who came down on Hermon, and the giants. Quoted in Jude.",
  Jub: "Genesis and Exodus told again by an angel, with Mastema, prince of the spirits.",
  TSol: "Solomon builds the Temple with demons, sealed by Michael's ring, each named and questioned.",
  GosNic: "Pilate's trial, then the Harrowing of Hell: Satan and Hell argue as the gates break.",
  ApPaul: "Paul's third heaven, and the hell that Dante knew of.",
};

export function CabinetView() {
  const place = useStudy((s) => s.cabinet);
  const openCabinet = useStudy((s) => s.openCabinet);
  const [library, setLibrary] = useState<LibraryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadLibrary().then(setLibrary, (e: Error) => setError(e.message));
  }, []);
  if (error) return <DataMissing message={error} />;
  if (!library) return <div className="grid flex-1 place-items-center"><Spinner /></div>;
  const shelf = place.shelf ?? "library";
  // Every move keeps the shelf, so "back" lands where you were.
  const to = (p: Partial<CabinetPlace>) => openCabinet({ text: null, section: 0, shelf, curio: null, ...p });
  const entry = place.text ? library.find((t) => t.id === place.text) : undefined;
  if (entry) return <LibraryReader key={entry.id} entry={entry} section={Math.min(place.section, entry.sections.length - 1)} onPlace={(section) => to({ text: entry.id, section, curio: place.curio })} onClose={() => to({ curio: place.curio })} />;
  const open = place.curio ? curio(place.curio) : undefined;
  if (open) return <CurioView key={open.id} c={open} library={library} onClose={() => to({})} onRead={(text, section) => to({ text, section, curio: open.id })} />;
  return <Cabinet library={library} shelf={shelf} onShelf={(s) => to({ shelf: s })} onOpen={(text) => to({ text })} onCurio={(id) => to({ curio: id })} />;
}

function Cabinet({ library, shelf, onShelf, onOpen, onCurio }: { library: LibraryEntry[]; shelf: CabinetShelf; onShelf: (s: CabinetShelf) => void; onOpen: (id: string) => void; onCurio: (id: string) => void }) {
  const heroes = useHeroes();
  const hero = heroes.find((h) => h.id === "hero-callot-anthony");
  const plate = usePagePlate(PAGE_PLATES.cabinet);
  const read = useStudy((s) => s.read);
  const beside = BOOKS.filter((b) => b.shelf === "pseudepigrapha");
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <DitherHero hero={hero} height="clamp(10rem, 27vh, 15rem)" clearLeft fadeFrom={36} caption={false}>
        <div className="mx-auto flex w-full max-w-6xl flex-1 items-end gap-4 px-(--gutter) pb-4">
          <div>
            <h1 className="flex items-center gap-3 font-blackletter text-5xl"><PageMark page="cabinet" />Sub Rosa</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              The cabinet: what the curious have read beside the Bible. None of it is Scripture; all of it was written about Scripture, or in its name.
            </p>
          </div>
        </div>
      </DitherHero>
      <div className="mx-auto w-full max-w-6xl px-(--gutter) pt-2">
        <Sections
          label="Sub Rosa"
          value={shelf}
          onChange={onShelf}
          sections={[
            { id: "library", name: "Library", gist: `${library.length} books read beside the Bible`, mark: "quill" },
            { id: "dossiers", name: "Dossiers", gist: `${DOSSIERS.length} questions, sorted`, mark: "lamp" },
            { id: "symbols", name: "Symbols", gist: `${SYMBOLS.length} signs and their history`, mark: "eye" },
            { id: "beside", name: "Beyond the canon", gist: `${beside.length} books on the Pseudepigrapha shelf`, mark: "seraph" },
          ]}
        />
      </div>
      <div className="mx-auto w-full max-w-6xl px-(--gutter) pb-24 pt-6">
        {shelf === "dossiers" ? (
          <>
            <TagKey />
            <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-x-8 gap-y-7">
              {DOSSIERS.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => onCurio(d.id)} className="group block w-full text-left">
                    <span className="block font-garamond text-2xl leading-tight group-hover:underline">{d.title}</span>
                    <span className="mt-1.5 block font-garamond text-[15px] leading-snug text-foreground/85">{d.lede}</span>
                    <TagCounts c={d} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : shelf === "symbols" ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-x-6 gap-y-8">
            {SYMBOLS.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onCurio(c.id)} className="group block w-full text-left">
                  <span className="grid h-32 place-items-center">
                    <SymbolArt c={c} className="h-28" />
                  </span>
                  <span className="mt-2 block font-garamond text-xl leading-tight group-hover:underline">{c.title}</span>
                  <span className="mt-1 block font-garamond text-[14px] leading-snug text-muted-foreground">{c.lede}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : shelf === "library" ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-x-8 gap-y-7">
            {library.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => onOpen(t.id)} className="group block w-full text-left">
                  <span className="block font-garamond text-2xl leading-tight group-hover:underline">{t.title}</span>
                  {t.sub && <span className="block font-garamond text-sm italic text-muted-foreground">{t.sub}</span>}
                  <span className="mt-0.5 block text-xs text-muted-foreground">{byline(t)}</span>
                  <span className="mt-2 block font-garamond text-[15px] leading-snug text-foreground/85">{t.gist}</span>
                  <span className="mt-1.5 block text-[11px] text-muted-foreground">
                    {t.sections.length} sections{t.excerpt ? ", in part" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="mb-5 max-w-2xl font-garamond text-[15px] text-muted-foreground">
              These read in the Bible itself, on the Pseudepigrapha shelf, with a badge on every verse. Under the rose the shelf is on.
            </p>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-x-8 gap-y-6">
              {beside.map((b) => (
                <li key={b.osis}>
                  <button type="button" onClick={() => read({ book: b.osis, chapter: 1, verse: 0 })} className="group block w-full text-left">
                    <span className="block font-blackletter text-2xl leading-tight group-hover:underline">{bookName(b.osis)}</span>
                    <span className="mt-1 block font-garamond text-[15px] leading-snug text-foreground/85">{BESIDE[b.osis]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <CornerPlate plate={plate} />
    </div>
  );
}

/** What the four tags mean, set before the dossiers. */
function TagKey() {
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

function Tag({ tag }: { tag: ClaimTag }) {
  return (
    <Badge variant={TAG_VARIANT[tag]} className={cn("shrink-0", tag === "modern" && "border-dashed")}>
      {TAGS[tag].label}
    </Badge>
  );
}

/** How a dossier's claims divide among the tags, as a line of small counts. */
function TagCounts({ c }: { c: Curio }) {
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

/** A symbol drawn as an ornament, or its plate where it is a picture (Baphomet). */
function SymbolArt({ c, className }: { c: Curio; className?: string }) {
  const plates = usePlates();
  if (c.mark) return <Ornament name={c.mark} label={c.title} className={className} />;
  const plate = plates.find((p) => p.n === c.plates?.[0]);
  return plate ? <Engraving plate={plate} size="thumb" className={cn("w-auto object-contain", className)} /> : null;
}

/**
 * A dossier or a symbol: its claims in order, each under its tag with the
 * verses that bear it out quoted from your translation, then the art and
 * where to read on.
 */
function CurioView({ c, library, onClose, onRead }: { c: Curio; library: LibraryEntry[]; onClose: () => void; onRead: (text: string, section: number) => void }) {
  const translation = useStudy((s) => s.translation);
  const read = useStudy((s) => s.read);
  const openLook = useStudy((s) => s.openLook);
  const [t, setT] = useState<Translation | null>(null);
  const plates = usePlates();
  const paintings = usePaintings();
  useEffect(() => {
    let live = true;
    loadTranslation(translation).then((x) => live && setT(x), () => {});
    return () => {
      live = false;
    };
  }, [translation]);
  const art = [
    ...(c.plates ?? []).flatMap((n) => plates.filter((p) => p.n === n).map((p) => ({ key: p.id, kind: "plate" as const, id: p.id, title: p.title, by: plateCredit(p), plate: p }))),
    ...(c.paintings ?? []).flatMap((id) => paintings.filter((p) => p.id === id).map((p) => ({ key: p.id, kind: "painting" as const, id: p.id, title: p.title, by: paintingCredit(p), src: paintingUrl(p.thumb) }))),
  ];
  const back = c.kind === "symbol" ? "Symbols" : "Dossiers";
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <article className="mx-auto max-w-[44rem] px-(--gutter) pb-24 pt-(--page-top)">
        <Button variant="ghost" size="sm" onClick={onClose} className="mb-4">
          <Icon name="chevron-left" /> {back}
        </Button>
        <header className="mb-8 text-center">
          {c.kind === "symbol" && <SymbolArt c={c} className="mx-auto mb-4 h-36" />}
          {c.kind === "dossier" && c.mark && <Ornament name={c.mark} className="mx-auto mb-3 h-16 text-muted-foreground" />}
          <h1 className="font-blackletter text-5xl leading-tight">{c.title}</h1>
          <p className="mx-auto mt-3 max-w-xl font-garamond text-lg italic text-muted-foreground">{c.lede}</p>
        </header>
        <TagKey />
        <ol className="mt-6 space-y-6">
          {c.claims.map((x, i) => (
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
        {art.length > 0 && (
          <section className="mt-12">
            <h2 className="font-garamond text-xl">In the pictures</h2>
            <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-5">
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
          </section>
        )}
        {c.read && c.read.length > 0 && (
          <section className="mt-10">
            <h2 className="font-garamond text-xl">Read on</h2>
            <ul className="mt-2 space-y-1.5">
              {c.read.map((r, i) => (
                <li key={i}>
                  <ReadOnLink r={r} library={library} onRead={onRead} onPassage={(ref) => read(ref)} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <Fleuron />
        <p className="text-center text-xs text-muted-foreground">A study note, written by hand. The verses are quoted as your translation prints them.</p>
      </article>
    </div>
  );
}

function ReadOnLink({ r, library, onRead, onPassage }: { r: ReadOn; library: LibraryEntry[]; onRead: (text: string, section: number) => void; onPassage: (ref: Ref) => void }) {
  if ("passage" in r) {
    const ref = studyRef(r.passage);
    if (!ref) return null;
    return (
      <button type="button" onClick={() => onPassage(ref)} className="font-garamond text-[16px] text-brand hover:underline">
        {formatRef(ref)}
      </button>
    );
  }
  const text = library.find((x) => x.id === r.library);
  const section = text?.sections.findIndex((s) => s.title === r.section) ?? -1;
  if (!text || section < 0) return null;
  return (
    <button type="button" onClick={() => onRead(text.id, section)} className="font-garamond text-[16px] hover:underline">
      <span className="italic">{text.title}</span>, {r.section}
    </button>
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

/** One library text, a section at a time, with its contents beside it. */
function LibraryReader({ entry, section, onPlace, onClose }: { entry: LibraryEntry; section: number; onPlace: (n: number) => void; onClose: () => void }) {
  const [text, setText] = useState<LibraryText | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textSize = useStudy((s) => s.textSize);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadLibraryText(entry.id).then(setText, (e: Error) => setError(e.message));
  }, [entry.id]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [section]);
  const s = text?.sections[section];
  const go = (n: number) => n >= 0 && n < entry.sections.length && onPlace(n);
  const contents = useMemo(
    () =>
      entry.sections.map((x, i) => (
        <li key={i}>
          <button
            type="button"
            aria-current={i === section ? "page" : undefined}
            onClick={() => onPlace(i)}
            className={cn("w-full rounded-md px-2 py-1 text-left font-garamond text-[15px] leading-snug transition-colors hover:bg-muted/60", i === section ? "bg-muted/70 text-foreground" : "text-foreground/75")}
          >
            {x.title}
          </button>
        </li>
      )),
    [entry.sections, section, onPlace],
  );
  if (error) return <DataMissing message={error} />;
  return (
    <div className="flex min-h-0 flex-1">
      <nav aria-label={`${entry.title}, contents`} className="hidden w-64 shrink-0 overflow-y-auto border-r border-border px-3 pb-10 pt-4 lg:block">
        <Button variant="ghost" size="sm" onClick={onClose} className="mb-3">
          <Icon name="chevron-left" /> The cabinet
        </Button>
        <p className="px-2 font-blackletter text-xl leading-tight">{entry.title}</p>
        <ol className="mt-3 space-y-0.5">{contents}</ol>
      </nav>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto max-w-[42rem] px-(--gutter) pb-24 pt-(--page-top)" style={{ ["--scripture-size" as string]: `${textSize}px` }}>
          <Button variant="ghost" size="sm" onClick={onClose} className="mb-4 lg:hidden">
            <Icon name="chevron-left" /> The cabinet
          </Button>
          <header className="mb-8 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Not Scripture</p>
            <h1 className="mt-2 font-blackletter text-5xl leading-tight">{entry.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{byline(entry)}</p>
            <Ornament name="vine" className="mx-auto my-5 w-full max-w-[22rem]" />
            <h2 className="font-garamond text-2xl">{entry.sections[section].title}</h2>
            {entry.sections[section].sub && <p className="mt-1 font-garamond text-lg italic text-muted-foreground">{entry.sections[section].sub}</p>}
          </header>
          {!s ? (
            <div className="grid place-items-center py-16"><Spinner /></div>
          ) : (
            <div className={cn("scripture space-y-4", entry.verse && "space-y-5")}>
              {s.paras.map((p, i) => {
                const h = headingOf(p);
                if (h) return <h3 key={i} className="pt-2 text-center font-garamond text-lg italic text-muted-foreground">{h}</h3>;
                return <p key={i} className={cn(entry.verse && "whitespace-pre-line", i === 0 && !entry.verse && "first-letter:float-left first-letter:mr-2 first-letter:font-blackletter first-letter:text-[3.6em] first-letter:leading-[0.85] first-letter:text-brand")}>{p}</p>;
              })}
            </div>
          )}
          {section === entry.sections.length - 1 ? <Ornament name="urn" className="mx-auto my-10 h-20 text-muted-foreground" /> : <Fleuron />}
          <nav className="flex items-center justify-between gap-3 text-sm">
            <Button variant="ghost" size="sm" disabled={section === 0} onClick={() => go(section - 1)}>
              <Icon name="chevron-left" /> Previous
            </Button>
            <span className="truncate text-xs text-muted-foreground">{entry.sections[section].title}</span>
            <Button variant="ghost" size="sm" disabled={section === entry.sections.length - 1} onClick={() => go(section + 1)}>
              Next <Icon name="chevron-right" />
            </Button>
          </nav>
          <footer className="mt-10 space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
            {entry.excerpt && <p>{entry.excerpt}</p>}
            {entry.note && <p>{entry.note}</p>}
            <p>
              {entry.licence}.{" "}
              <a href={entry.source} target="_blank" rel="noreferrer" className="underline">
                The source
              </a>
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}

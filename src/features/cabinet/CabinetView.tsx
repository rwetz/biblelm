// Sub Rosa, the cabinet: shown only under the rose. Its shelves hold the
// library (the Goetia, Dionysius, Dante, Milton and the Masons: books read
// beside the Bible, never as it) and the books of the Pseudepigrapha shelf,
// which open in the reader. A library text reads here, section by section,
// in its own pages, so nothing of it is ever set as Scripture. See
// docs/SUBROSA.md.

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, cn, Icon, Spinner } from "@nexis/design";
import { CornerPlate, DitherHero, Fleuron, Ornament, useHeroes, usePagePlate } from "@/art/Art";
import { PageMark } from "@/art/SidebarArt";
import { Sections } from "@/app/Sections";
import { PAGE_PLATES } from "@/lib/art";
import { BOOKS, bookName } from "@/lib/canon";
import { byline, headingOf, loadLibrary, loadLibraryText, type LibraryEntry, type LibraryText } from "@/lib/library";
import { useStudy } from "@/store/study";
import { DataMissing } from "@/features/read/ReadView";

type Shelf = "library" | "beside";

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
  const entry = place.text ? library.find((t) => t.id === place.text) : undefined;
  if (entry) return <LibraryReader key={entry.id} entry={entry} section={Math.min(place.section, entry.sections.length - 1)} onPlace={(section) => openCabinet({ text: entry.id, section })} onClose={() => openCabinet({ text: null, section: 0 })} />;
  return <Cabinet library={library} onOpen={(text) => openCabinet({ text, section: 0 })} />;
}

function Cabinet({ library, onOpen }: { library: LibraryEntry[]; onOpen: (id: string) => void }) {
  const [shelf, setShelf] = useState<Shelf>("library");
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
          onChange={setShelf}
          sections={[
            { id: "library", name: "Library", gist: `${library.length} books read beside the Bible`, mark: "quill" },
            { id: "beside", name: "Beyond the canon", gist: `${beside.length} books on the Pseudepigrapha shelf`, mark: "seraph" },
          ]}
        />
      </div>
      <div className="mx-auto w-full max-w-6xl px-(--gutter) pb-24 pt-6">
        {shelf === "library" ? (
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

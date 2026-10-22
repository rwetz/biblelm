import { useMemo, useState } from "react";
import { Button, Icon, Input } from "@nexis/design";
import { TrinityMark } from "@/art/TrinityMark";
import { DitherHero, Engraving, Fleuron, useHeroes, usePaintings, usePlates } from "@/art/Art";
import { paintingCredit, paintingForDay, paintingUrl, seasonalHero } from "@/lib/art";
import { useScheme } from "@/app/scheme";
import { wholeSentence } from "@/lib/bible";
import { formatRef, parseOsis, type Ref } from "@/lib/canon";
import { useCatalog, useTranslation } from "@/lib/hooks";
import { useNotebooks } from "@/store/notebooks";
import { useStudy } from "@/store/study";
import { VerseText } from "@/features/read/ReadView";
import { QueryReading } from "@/features/search/JevReading";

// A year of well-loved verses, one a day (the list is references only; the
// words come from whichever translation you read).
const DAILY = [
  "Gen.1.1", "Ps.23.1", "Ps.46.10", "Ps.119.105", "Ps.139.14", "Prov.3.5", "Isa.40.31", "Isa.41.10", "Isa.53.5",
  "Jer.29.11", "Lam.3.22", "Mic.6.8", "Matt.5.9", "Matt.6.33", "Matt.11.28", "Matt.28.20", "Mark.10.27", "Luke.1.37",
  "John.1.1", "John.1.5", "John.3.16", "John.8.12", "John.11.25", "John.14.6", "John.14.27", "John.15.13", "Rom.5.8",
  "Rom.8.28", "Rom.8.38", "Rom.12.2", "Rom.12.12", "1Cor.13.4", "1Cor.13.13", "1Cor.16.14", "2Cor.5.17", "2Cor.12.9",
  "Gal.2.20", "Gal.5.22", "Eph.2.8", "Eph.4.32", "Phil.4.6", "Phil.4.13", "Col.3.23", "1Thess.5.16", "2Tim.1.7",
  "Heb.11.1", "Heb.12.1", "Heb.13.8", "Jas.1.5", "1Pet.5.7", "1John.1.9", "1John.4.18", "1John.4.19", "Rev.21.4",
  "Deut.31.6", "Josh.1.9", "Ps.27.1", "Ps.34.18", "Ps.51.10", "Ps.90.12", "Ps.121.1", "Eccl.3.1", "Isa.9.6", "Zeph.3.17",
];

export function verseOfTheDay(date = new Date()): Ref {
  const day = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000);
  return parseOsis(DAILY[day % DAILY.length])!;
}

export function HomeView() {
  const heroes = useHeroes();
  const devHero = useStudy((s) => (s.devMode ? s.devHero : null));
  const paintings = usePaintings();
  const [scheme] = useScheme();
  const today = useMemo(() => paintingForDay(paintings), [paintings]);
  // Tenebrae is the paintings' scheme: its Home opens on the day's painting in
  // colour (an etching's paper would sit under the search box).
  const band = useMemo(() => (today?.colour ? today : paintingForDay(paintings.filter((p) => p.colour))), [today, paintings]);
  const hero = useMemo(
    () => heroes.find((h) => h.id === devHero) ?? (scheme === "tenebrae" && band ? band : seasonalHero(heroes)),
    [heroes, devHero, scheme, band],
  );
  const openLook = useStudy((s) => s.openLook);
  const { translation, history, read, searchFor, go } = useStudy();
  const [t] = useTranslation(translation);
  const [catalog] = useCatalog();
  const [q, setQ] = useState("");
  const passage = t ? wholeSentence((r) => t.verse(r), verseOfTheDay()) : undefined;
  const { notebooks, setActive } = useNotebooks();
  const plates = usePlates();
  const abbr = catalog?.find((c) => c.id === translation)?.abbr;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* The first screen is the picture, the search box and the verse of the
          day, filling the window exactly; your reading and notebooks wait below. */}
      <div className="flex min-h-full shrink-0 flex-col">
      <DitherHero hero={hero} height="auto" width="84rem" fadeFrom={64} focusY={30} className="min-h-[22rem] flex-1">
        <div className="mt-auto flex flex-col items-center px-6 pb-10">
          <form
            className="w-full max-w-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) searchFor(q.trim());
            }}
          >
            <div className="rounded-2xl bg-card/90 p-2 shadow-sm ring-1 ring-foreground/8 backdrop-blur-[2px]">
              <div className="relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search the Scriptures, or type a reference"
                  className="h-12 border-none bg-transparent pl-9 text-base shadow-none focus-visible:ring-0"
                />
              </div>
              <QueryReading query={q} className="px-2" />
              <div className="flex items-center gap-2 px-2 pb-1 pt-1 text-xs text-muted-foreground">
                <button type="button" onClick={() => go("settings")} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted">
                  <Icon name="document" size="xs" /> {abbr ?? "…"}
                </button>
                {history[0] && (
                  <button type="button" onClick={() => read(history[0])} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted">
                    <Icon name="bookmark-add" size="xs" /> Continue {formatRef(history[0])}
                  </button>
                )}
                <span className="flex-1" />
                <Button type="submit" variant="brand" size="icon-sm" aria-label="Search" disabled={!q.trim()}>
                  <Icon name="arrow-right" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DitherHero>

        <section className="mx-auto w-full max-w-3xl shrink-0 px-8 pb-8 text-center">
          <TrinityMark className="mx-auto mb-3 size-14" />
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Verse of the day</p>
          {passage?.verses.length ? (
            <blockquote className="mt-4">
              <p className="font-garamond text-[2rem] leading-snug text-foreground md:text-[2.4rem]">
                {passage.verses.map((v, i) => (
                  <span key={v.n}>
                    {i > 0 && <sup className="mr-1 font-sans text-[0.4em] font-semibold text-brand">{v.n}</sup>}
                    <VerseText raw={v.raw} />{" "}
                  </span>
                ))}
              </p>
              <footer className="mt-4">
                <button type="button" onClick={() => read(passage.ref, { select: true })} className="font-garamond text-lg text-brand hover:underline">
                  {formatRef(passage.ref)}
                </button>
              </footer>
            </blockquote>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          )}
          <Fleuron />
        </section>
      </div>

      <div className="mx-auto w-full max-w-3xl px-8 pb-20 pt-10">
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="font-garamond text-2xl">Continue reading</h2>
            <div className="mt-3 space-y-1">
              {history.length === 0 && (
                <Button variant="ghost" className="-ml-3" onClick={() => read({ book: "Gen", chapter: 1, verse: 0 })}>
                  Begin at Genesis 1
                </Button>
              )}
              {history.slice(0, 5).map((h) => (
                <button key={`${h.book}.${h.chapter}`} type="button" onClick={() => read(h)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                  <Icon name="document" size="xs" className="text-muted-foreground" />
                  {formatRef(h)}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2 className="font-garamond text-2xl">Notebooks</h2>
            <div className="mt-3 space-y-1">
              {notebooks.length === 0 && (
                <Button variant="ghost" className="-ml-3" onClick={() => go("notebooks")}>
                  Start your first study
                </Button>
              )}
              {notebooks.slice(0, 5).map((b) => {
                const cover = plates.find((p) => p.id === b.plate);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setActive(b.id);
                      go("notebooks");
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    {cover ? <Engraving plate={cover} size="thumb" className="h-9 w-7 object-cover" /> : <Icon name="note" size="xs" className="text-muted-foreground" />}
                    {b.title}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
        {today && (
          <section className="mt-10 flex items-center gap-5 rounded-xl p-2">
            <button type="button" onClick={() => openLook({ kind: "painting", id: today.id })} className="shrink-0">
              <img src={paintingUrl(today.thumb)} alt={`${today.title}, ${paintingCredit(today)}`} className="h-28 w-24 rounded-sm object-cover" style={{ objectPosition: `${today.focusX}% ${today.focusY}%` }} />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">To look at today</p>
              <button type="button" onClick={() => openLook({ kind: "painting", id: today.id })} className="mt-1 block text-left font-garamond text-2xl hover:underline">
                {today.title}
              </button>
              <p className="text-sm text-muted-foreground">{paintingCredit(today)}</p>
              <Button variant="ghost" size="sm" className="-ml-3 mt-1" onClick={() => go("daily")}>
                <Icon name="calendar" /> Today's readings and plans
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

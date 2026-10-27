// Under the rose, Home's verse of the day gives way to the day's omen
// (src/lib/omen.ts): a verse of signs and endings, or a spirit of the Goetia
// with its seal and the book's own words.

import { useEffect, useMemo, useState } from "react";
import type { Translation } from "@/lib/bible";
import { wholeSentence } from "@/lib/bible";
import { loadBestiary, loadSeals, rankLine, type Seal, type Spirit } from "@/lib/bestiary";
import { formatRef } from "@/lib/canon";
import { loadLibraryText } from "@/lib/library";
import { omenOfTheDay } from "@/lib/omen";
import { useStudy } from "@/store/study";
import { VerseText } from "@/features/read/ReadView";
import { ordinal, SealMark } from "@/features/cabinet/Bestiary";

export function Omen({ t }: { t: Translation | null }) {
  const omen = useMemo(() => omenOfTheDay(), []);
  const read = useStudy((s) => s.read);
  if (omen.kind === "spirit") return <SpiritOfTheDay n={omen.n} />;
  const passage = t ? wholeSentence((r) => t.verse(r), omen.ref) : undefined;
  return (
    <>
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Omen of the day</p>
      {passage?.verses.length ? (
        <blockquote className="mt-4">
          <p className="font-garamond text-[2rem] leading-snug text-foreground md:text-[clamp(2rem,3.6vh,2.4rem)]">
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
    </>
  );
}

function SpiritOfTheDay({ n }: { n: number }) {
  const [spirit, setSpirit] = useState<Spirit | null>(null);
  const [seal, setSeal] = useState<Seal | undefined>();
  const [words, setWords] = useState<string | null>(null);
  const openCabinet = useStudy((s) => s.openCabinet);
  useEffect(() => {
    let live = true;
    loadBestiary().then((all) => {
      const s = all.find((x) => x.n === n) ?? null;
      if (!live || !s) return;
      setSpirit(s);
      loadLibraryText("goetia").then((g) => live && setWords(g.sections.find((x) => x.title === s.section)?.paras[0] ?? null), () => {});
    }, () => {});
    loadSeals().then((all) => live && setSeal(all.find((x) => x.n === n)), () => {});
    return () => {
      live = false;
    };
  }, [n]);
  if (!spirit) return <p className="text-sm text-muted-foreground">Loading…</p>;
  // The first sentence or two: the spirit's rank and how it appears.
  const lede = words?.split(/(?<=\.)\s+/).slice(0, 2).join(" ");
  return (
    <>
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Spirit of the day</p>
      <button type="button" onClick={() => openCabinet({ text: null, section: 0, shelf: "bestiary", spirit: n })} className="group mt-4 block w-full">
        <SealMark seal={seal} label={`The seal of ${spirit.name}`} className="mx-auto size-24" />
        <span className="mt-3 block text-[11px] uppercase tracking-widest text-muted-foreground">The {ordinal(n)} spirit</span>
        <span className="block font-blackletter text-4xl group-hover:underline">{spirit.name}</span>
        <span className="block text-xs text-muted-foreground">{rankLine(spirit)}, {spirit.legions} legions</span>
      </button>
      {lede && <p className="mx-auto mt-4 max-w-xl font-garamond text-lg leading-snug text-foreground/85">{lede}</p>}
      <p className="mt-2 text-[11px] text-muted-foreground">The Goetia, 1904</p>
    </>
  );
}

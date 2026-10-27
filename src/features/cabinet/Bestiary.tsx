// The cabinet's bestiary (src/lib/bestiary.ts): the Goetia's seventy-two
// spirits by seal, rank and legions, and the Testament of Solomon's demons
// that came before them. A spirit opens on its seal and the Goetia's own words
// for it, headed "Not Scripture"; a demon of the Testament opens in the reader,
// where it stands on the Pseudepigrapha shelf.

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, cn, Icon, Spinner } from "@nexis/design";
import { Fleuron } from "@/art/Art";
import { formatRef } from "@/lib/canon";
import { loadBestiary, loadSeals, rankLine, RANKS, sealUrl, SOLOMON_DEMONS, solomonDemonFor, type Rank, type Seal, type Spirit } from "@/lib/bestiary";
import { loadLibraryText, type LibraryText } from "@/lib/library";
import { studyRef } from "@/lib/studies";
import { useStudy } from "@/store/study";
import { DataMissing } from "@/features/read/ReadView";

function useBestiary() {
  const [spirits, setSpirits] = useState<Spirit[] | null>(null);
  const [seals, setSeals] = useState<Seal[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadBestiary().then(setSpirits, (e: Error) => setError(e.message));
    // The seals are art: the bestiary reads without them.
    loadSeals().then(setSeals, () => {});
  }, []);
  return { spirits, seals, error };
}

/** A seal drawn in the page's ink: the PNG is a mask, so it follows the theme and never takes the accent. */
export function SealMark({ seal, k = 0, label, className }: { seal?: Seal; k?: number; label: string; className?: string }) {
  if (!seal) return <span aria-hidden className={cn("block rounded-full border border-dashed border-border", className)} />;
  const url = `url("${sealUrl(seal, k)}")`;
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("block bg-foreground/85", className)}
      style={{ maskImage: url, WebkitMaskImage: url, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" }}
    />
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("rounded-full px-2.5 py-1 text-xs transition-colors", on ? "bg-foreground text-background" : "bg-muted/70 text-muted-foreground hover:bg-foreground/10 hover:text-foreground")}
    >
      {children}
    </button>
  );
}

/** The shelf: the seventy-two, filtered by rank, then the Testament's demons. */
export function BestiaryShelf({ onSpirit }: { onSpirit: (n: number) => void }) {
  const { spirits, seals, error } = useBestiary();
  const [rank, setRank] = useState<Rank | null>(null);
  const read = useStudy((s) => s.read);
  if (error) return <DataMissing message={error} />;
  if (!spirits) return <div className="grid place-items-center py-16"><Spinner /></div>;
  const shown = rank ? spirits.filter((s) => s.ranks.includes(rank)) : spirits;
  return (
    <>
      <p className="max-w-2xl font-garamond text-[15px] text-muted-foreground">
        The seventy-two spirits of the Goetia, each with the seal the book draws for it, its rank and its legions, as the book gives them. A catalogue, not a
        ceremony: the book's rite is left in the book.
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Chip on={!rank} onClick={() => setRank(null)}>All {spirits.length}</Chip>
        {RANKS.map(({ rank: r, plural }) => {
          const n = spirits.filter((s) => s.ranks.includes(r)).length;
          return (
            <Chip key={r} on={rank === r} onClick={() => setRank(rank === r ? null : r)}>
              {plural} {n}
            </Chip>
          );
        })}
      </div>
      <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-6">
        {shown.map((s) => (
          <li key={s.n}>
            <button type="button" onClick={() => onSpirit(s.n)} className="group block w-full text-center">
              <SealMark seal={seals.find((x) => x.n === s.n)} label={`The seal of ${s.name}`} className="mx-auto size-20 transition-opacity group-hover:opacity-70" />
              <span className="mt-2 block text-[11px] tabular-nums text-muted-foreground">{s.n}</span>
              <span className="block font-garamond text-lg leading-tight group-hover:underline">{s.name}</span>
              <span className="block text-[11px] text-muted-foreground">{rankLine(s)}, {s.legions} legions</span>
            </button>
          </li>
        ))}
      </ul>
      <section className="mt-16">
        <h2 className="font-blackletter text-3xl">Before the Goetia</h2>
        <p className="mt-2 max-w-2xl font-garamond text-[15px] text-muted-foreground">
          The Testament of Solomon, a Greek book of the early centuries after Christ, has Solomon build the Temple with demons, each questioned for its name, its
          work and the angel that frustrates it. The Goetia's catalogue grew out of books like it. Each opens in the reader, on the Pseudepigrapha shelf.
        </p>
        <ul className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-x-8 gap-y-5">
          {SOLOMON_DEMONS.map((d) => {
            const ref = studyRef(d.ref);
            const later = d.goetia ? spirits.find((s) => s.n === d.goetia) : undefined;
            return (
              <li key={d.id}>
                <button type="button" onClick={() => ref && read(ref, { select: true })} className="group block w-full text-left">
                  <span className="block font-garamond text-xl leading-tight group-hover:underline">{d.name}</span>
                  <span className="mt-1 block font-garamond text-[15px] leading-snug text-foreground/85">{d.gist}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {ref && formatRef(ref)}
                    {later && `, the Goetia's ${later.name} (${later.n})`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

/** One spirit: its seal, its rank, and the Goetia's words for it, with the Testament's demon beside it where there is one. */
export function SpiritView({ n, onSpirit, onClose, onRead }: { n: number; onSpirit: (n: number) => void; onClose: () => void; onRead: (text: string, section: number) => void }) {
  const { spirits, seals, error } = useBestiary();
  const [goetia, setGoetia] = useState<LibraryText | null>(null);
  const read = useStudy((s) => s.read);
  useEffect(() => {
    loadLibraryText("goetia").then(setGoetia, () => {});
  }, []);
  const s = spirits?.find((x) => x.n === n);
  const section = useMemo(() => (goetia && s ? goetia.sections.findIndex((x) => x.title === s.section) : -1), [goetia, s]);
  if (error) return <DataMissing message={error} />;
  if (!spirits || !s) return <div className="grid flex-1 place-items-center"><Spinner /></div>;
  const seal = seals.find((x) => x.n === n);
  const demon = solomonDemonFor(n);
  const demonRef = demon && studyRef(demon.ref);
  const paras = section >= 0 ? goetia!.sections[section].paras : null;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <article className="mx-auto max-w-[44rem] px-(--gutter) pb-24 pt-(--page-top)">
        <Button variant="ghost" size="sm" onClick={onClose} className="mb-4">
          <Icon name="chevron-left" /> Bestiary
        </Button>
        <header className="mb-8 text-center">
          <div className="flex justify-center gap-6">
            {(seal?.files ?? [""]).map((_, k) => (
              <SealMark key={k} seal={seal} k={k} label={`The seal of ${s.name}${seal && seal.files.length > 1 ? `, ${k + 1} of ${seal.files.length}` : ""}`} className="size-40" />
            ))}
          </div>
          <p className="mt-5 text-xs uppercase tracking-widest text-muted-foreground">The {ordinal(n)} spirit</p>
          <h1 className="mt-1 font-blackletter text-5xl leading-tight">{s.name}</h1>
          {s.aka && <p className="mt-1 font-garamond italic text-muted-foreground">or {s.aka.join(", or ")}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {s.ranks.map((r) => (
              <Badge key={r} variant="secondary">{r}</Badge>
            ))}
            <Badge variant="outline">{s.legions} legions</Badge>
            <Badge variant="outline">Seal in {s.metals.join(", or ").toLowerCase()}</Badge>
          </div>
        </header>
        <section>
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">Not Scripture: the Goetia, 1904</p>
          {!paras ? (
            <div className="grid place-items-center py-10"><Spinner /></div>
          ) : (
            <div className="scripture mt-4 space-y-4">
              {paras.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
          {section >= 0 && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => onRead("goetia", section)}>
              Read it in the Goetia <Icon name="chevron-right" />
            </Button>
          )}
        </section>
        {demon && demonRef && (
          <section className="mt-10 border-t border-border pt-6">
            <h2 className="font-garamond text-xl">Before the Goetia: {demon.name}</h2>
            <p className="mt-2 font-garamond text-[16px] leading-relaxed">{demon.gist}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 text-sm">
              <button type="button" onClick={() => read(demonRef, { select: true })} className="text-brand hover:underline">
                {formatRef(demonRef)}
              </button>
              {demon.scripture && studyRef(demon.scripture) && (
                <button type="button" onClick={() => read(studyRef(demon.scripture!)!, { select: true })} className="text-brand hover:underline">
                  In Scripture, {formatRef(studyRef(demon.scripture)!)}
                </button>
              )}
            </div>
          </section>
        )}
        <Fleuron />
        <nav className="flex items-center justify-between gap-3 text-sm">
          <Button variant="ghost" size="sm" disabled={n === 1} onClick={() => onSpirit(n - 1)}>
            <Icon name="chevron-left" /> {spirits[n - 2]?.name ?? "Previous"}
          </Button>
          <Button variant="ghost" size="sm" disabled={n === spirits.length} onClick={() => onSpirit(n + 1)}>
            {spirits[n]?.name ?? "Next"} <Icon name="chevron-right" />
          </Button>
        </nav>
      </article>
    </div>
  );
}

const ORD = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"];
const TENS = ["", "", "twentieth", "thirtieth", "fortieth", "fiftieth", "sixtieth", "seventieth"];
const TENS_ON = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy"];
const TEENS = ["tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth"];

/** 1 to 72 as the book writes them: "first", "thirty-second". */
export function ordinal(n: number): string {
  if (n < 10) return ORD[n];
  if (n < 20) return TEENS[n - 10];
  const t = Math.floor(n / 10), u = n % 10;
  return u ? `${TENS_ON[t]}-${ORD[u]}` : TENS[t];
}

// Daily: the habits of a reading life in one place. The Daily Office for
// today (1979 Book of Common Prayer), a painting to look at, the plans you
// follow, and the verses you are learning by heart (FSRS).

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Icon, SectionLabel, Spinner, cn } from "@nexis/design";
import { DitherHero, usePaintings } from "@/art/Art";
import { paintingCredit, paintingForDay, paintingUrl } from "@/lib/art";
import type { Translation } from "@/lib/bible";
import { formatRef, parseOsis, type Ref } from "@/lib/canon";
import { isDue, preview, type Card, type Grade } from "@/lib/fsrs";
import { lessonRef, loadLectionary, officeFor, psalmRef, type Lectionary } from "@/lib/lectionary";
import { PLANS, planDay, planDays, portionLabel, todayISO } from "@/lib/plans";
import { useTranslation } from "@/lib/hooks";
import { useNotebooks } from "@/store/notebooks";
import { useStudy } from "@/store/study";
import { VerseText } from "@/features/read/ReadView";

export function DailyView() {
  const translation = useStudy((s) => s.translation);
  const [t] = useTranslation(translation);
  const paintings = usePaintings();
  const painting = useMemo(() => paintingForDay(paintings), [paintings]);
  // The band behind the title is always a painting in colour: an etching's
  // bright paper would sit under the words.
  const band = useMemo(() => (painting?.colour ? painting : paintingForDay(paintings.filter((p) => p.colour))), [painting, paintings]);
  const [lect, setLect] = useState<Lectionary | null | undefined>(undefined);
  useEffect(() => {
    loadLectionary().then(setLect, () => setLect(null));
  }, []);
  const office = lect ? officeFor(lect) : null;
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <DitherHero hero={band} height="17rem" clearLeft fadeFrom={42} caption={false}>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-end px-8 pb-5">
          <h1 className="font-blackletter text-5xl">Daily</h1>
          <p className="mt-1 font-garamond text-lg italic text-muted-foreground">
            {date}
            {office?.label ? ` · ${office.label}` : ""}
          </p>
        </div>
      </DitherHero>
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-8 pb-20 pt-6 md:grid-cols-[1fr_18rem]">
        <div className="space-y-10">
          <Office lect={lect} />
          <Plans t={t} />
          <ByHeart t={t} />
        </div>
        <aside>
          {painting && <TodaysPainting id={painting.id} />}
        </aside>
      </div>
    </div>
  );
}

function RefButton({ label, r }: { label: string; r: Ref | null }) {
  const read = useStudy((s) => s.read);
  return (
    <button type="button" disabled={!r} onClick={() => r && read(r, { select: !!r.verse })} className="rounded-md px-1.5 py-0.5 text-left font-garamond text-[17px] hover:bg-muted disabled:opacity-60">
      {label}
    </button>
  );
}

function Office({ lect }: { lect: Lectionary | null | undefined }) {
  if (lect === undefined) return <Spinner />;
  if (lect === null) return <p className="text-sm text-muted-foreground">The lectionary is not built yet: run <code>node scripts/data/daily.mjs</code>.</p>;
  const { year, day, holy } = officeFor(lect);
  const e = holy ?? day;
  if (!e) return null;
  const NAMES: Record<string, string> = { first: "First lesson", second: "Second lesson", gospel: "Gospel" };
  return (
    <section>
      <div className="flex items-baseline gap-3">
        <h2 className="font-garamond text-3xl">The Daily Office</h2>
        <span className="text-xs text-muted-foreground">Year {year === 1 ? "One" : "Two"}</span>
      </div>
      {e.title && <p className="mt-1 font-garamond text-lg italic">{e.title}</p>}
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <SectionLabel>Morning psalms</SectionLabel>
          <div className="mt-1 flex flex-wrap gap-1">{e.psalms.morning.map((p) => <RefButton key={p} label={`Psalm ${p}`} r={psalmRef(p)} />)}</div>
          <SectionLabel className="mt-4">Evening psalms</SectionLabel>
          <div className="mt-1 flex flex-wrap gap-1">{e.psalms.evening.map((p) => <RefButton key={p} label={`Psalm ${p}`} r={psalmRef(p)} />)}</div>
        </div>
        <div>
          <SectionLabel>Lessons</SectionLabel>
          <div className="mt-1 space-y-1">
            {Object.entries(e.lessons).map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-2">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{NAMES[k] ?? k}</span>
                <RefButton label={v} r={lessonRef(v)} />
              </div>
            ))}
            {e.evening &&
              Object.entries(e.evening).map(([k, v]) => (
                <div key={`e${k}`} className="flex items-baseline gap-2">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">Evening</span>
                  <RefButton label={v} r={lessonRef(v)} />
                </div>
              ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">From the Daily Office Lectionary of the 1979 Book of Common Prayer.</p>
    </section>
  );
}

function TodaysPainting({ id }: { id: string }) {
  const p = usePaintings().find((x) => x.id === id);
  const openLook = useStudy((s) => s.openLook);
  if (!p) return null;
  return (
    <section>
      <SectionLabel>To look at today</SectionLabel>
      <button type="button" onClick={() => openLook({ kind: "painting", id })} className="group mt-2 block text-left">
        <img src={paintingUrl(p.thumb)} alt={`${p.title}, ${paintingCredit(p)}`} className={cn("w-full rounded-sm", !p.colour && "engraving")} />
        <p className="mt-2 font-garamond text-lg leading-snug group-hover:underline">{p.title}</p>
        <p className="text-xs text-muted-foreground">
          {paintingCredit(p)}
          {p.ref && <> · {formatRef(p.ref)}</>}
        </p>
      </button>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => openLook({ kind: "painting", id })}>
        <Icon name="expand" /> Look
      </Button>
    </section>
  );
}

function Plans({ t }: { t: Translation | null }) {
  const { startPlan, stopPlan, markPlanDay } = useNotebooks();
  const plans = useNotebooks((s) => s.plans) ?? [];
  const read = useStudy((s) => s.read);
  if (!t) return null;
  const active = new Set(plans.map((p) => p.plan));
  return (
    <section>
      <h2 className="font-garamond text-3xl">Reading plans</h2>
      <div className="mt-3 space-y-4">
        {plans.map((pp) => {
          const plan = PLANS.find((x) => x.id === pp.plan);
          if (!plan) return null;
          const days = planDays(plan.id, t);
          const today = Math.min(plan.days, Math.max(1, planDay(pp.started)));
          const behind = Array.from({ length: today - 1 }, (_, i) => i + 1).filter((d) => !pp.done.includes(d)).length;
          const portion = days[today - 1] ?? [];
          return (
            <div key={pp.id} className="rounded-lg border border-border/60 p-4">
              <div className="flex items-baseline gap-2">
                <p className="font-garamond text-xl">{plan.name}</p>
                <span className="text-xs text-muted-foreground">
                  Day {today} of {plan.days}
                  {behind > 0 && ` · ${behind} to catch up`}
                </span>
                <span className="flex-1" />
                <Button variant="ghost" size="xs" onClick={() => stopPlan(pp.id)}>Stop</Button>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-foreground/60" style={{ width: `${(pp.done.length / plan.days) * 100}%` }} />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Checkbox checked={pp.done.includes(today)} onCheckedChange={(on) => markPlanDay(pp.id, today, !!on)} aria-label="Read today" />
                <button type="button" className="font-garamond text-lg hover:underline" onClick={() => portion[0] && read(portion[0])}>
                  {portionLabel(portion)}
                </button>
              </div>
            </div>
          );
        })}
        <div className="grid gap-2 sm:grid-cols-2">
          {PLANS.filter((p) => !active.has(p.id)).map((p) => (
            <button key={p.id} type="button" onClick={() => startPlan(p.id, todayISO())} className="rounded-lg border border-dashed border-border p-3 text-left hover:border-foreground/40">
              <span className="flex items-center gap-1.5 font-garamond text-lg"><Icon name="add" size="xs" /> {p.name}</span>
              <span className="text-xs text-muted-foreground">{p.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** First letters of each word: the classic memory prompt. */
const initials = (text: string) => text.replace(/([A-Za-z])[A-Za-z']*/g, "$1");

function ByHeart({ t }: { t: Translation | null }) {
  const memory = useNotebooks((s) => s.memory) ?? [];
  const reviewCard = useNotebooks((s) => s.reviewCard);
  const toggleMemory = useNotebooks((s) => s.toggleMemory);
  const [shown, setShown] = useState(false);
  const due = memory.filter((c) => isDue(c)).sort((a, b) => a.due - b.due);
  const card: Card | undefined = due[0];
  useEffect(() => setShown(false), [card?.id, card?.reps]);
  if (!t) return null;
  const refOf = (c: Card) => {
    const r = parseOsis(c.ref);
    const e = c.end ? parseOsis(c.end) : undefined;
    return r ? { ...r, ...(e ? { verseEnd: e.verse } : {}) } : null;
  };
  const r = card ? refOf(card) : null;
  const verses = r ? t.range(r) : [];
  const text = verses.map((v) => v.text).join(" ");
  const next = card ? preview(card) : null;
  const when = (d: number) => (d <= 0 ? "soon" : d === 1 ? "tomorrow" : d < 30 ? `in ${d} days` : `in ${Math.round(d / 30)} months`);
  const GRADES: [Grade, string][] = [[1, "Again"], [2, "Hard"], [3, "Good"], [4, "Easy"]];

  return (
    <section>
      <div className="flex items-baseline gap-3">
        <h2 className="font-garamond text-3xl">By heart</h2>
        <span className="text-xs text-muted-foreground">
          {memory.length} verse{memory.length === 1 ? "" : "s"}
          {due.length > 0 && ` · ${due.length} to say today`}
        </span>
      </div>
      {!memory.length && (
        <p className="mt-2 text-sm text-muted-foreground">
          Choose "Learn by heart" in a verse's panel. Each verse comes back just before you would forget it, sooner when it is hard and later when it is easy.
        </p>
      )}
      {card && r && (
        <div className="mt-3 rounded-lg border border-border/60 p-5">
          <p className="text-xs font-semibold text-brand">{formatRef(r)}</p>
          <div className="scripture mt-2 !text-[1.15rem] !leading-8">
            {shown ? (
              verses.map((v) => (
                <span key={v.verse}>
                  <VerseText raw={v.raw} />{" "}
                </span>
              ))
            ) : (
              <span className="tracking-wider text-muted-foreground">{initials(text)}</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!shown ? (
              <Button variant="brand" size="sm" onClick={() => setShown(true)}>Show the verse</Button>
            ) : (
              GRADES.map(([g, label]) => (
                <Button key={g} variant={g === 3 ? "brand" : "outline"} size="sm" onClick={() => reviewCard(card.id, g)}>
                  {label} <span className="text-[11px] opacity-70">{when(next![g])}</span>
                </Button>
              ))
            )}
            <span className="flex-1" />
            <Button variant="ghost" size="xs" onClick={() => toggleMemory(card.ref, card.end)}>Stop learning</Button>
          </div>
        </div>
      )}
      {memory.length > 0 && !card && <p className="mt-2 text-sm text-muted-foreground">Nothing to say today. The next verse comes back {when(Math.ceil((Math.min(...memory.map((c) => c.due)) - Date.now()) / 86_400_000))}.</p>}
    </section>
  );
}

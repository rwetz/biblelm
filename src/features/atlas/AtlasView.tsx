// The Atlas: where things happened, who they happened to, and when.
//   Places    an engraved map of the lands of the Bible, every geocoded place
//             (OpenBible.info) sized by how often Scripture names it.
//   People    every named person (STEPBible TIPNR) with their family.
//   Timeline  the eras, with conventional dates (approximate, and said so).

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, SectionLabel, Segmented, Spinner, cn } from "@nexis/design";
import { ERAS, loadLand, personName, project, yearLabel, type Land, type Person, type Place } from "@/lib/atlas";
import type { Translation, VerseIndex } from "@/lib/bible";
import { BOOKS, formatRef } from "@/lib/canon";
import { useIndex, useTranslation } from "@/lib/hooks";
import { useStudy } from "@/store/study";
import { DataMissing } from "@/features/read/ReadView";
import { useAtlas } from "./VerseAtlas";

type Tab = "places" | "people" | "timeline";

export function AtlasView() {
  const atlas = useStudy((s) => s.atlas);
  const translation = useStudy((s) => s.translation);
  const [tab, setTab] = useState<Tab>(atlas?.kind === "person" ? "people" : "places");
  const [t, error] = useTranslation(translation);
  const [index] = useIndex();
  const { places, people } = useAtlas();
  useEffect(() => {
    if (atlas) setTab(atlas.kind === "person" ? "people" : "places");
  }, [atlas]);

  if (error) return <DataMissing message={error} />;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-6xl items-end gap-4 px-8 pb-3 pt-8">
          <div>
            <h1 className="font-blackletter text-4xl">Atlas</h1>
            <p className="mt-1 text-sm text-muted-foreground">The places Scripture names, the people in it, and the ages they lived in.</p>
          </div>
          <span className="flex-1" />
          <Segmented
            label="View"
            value={tab}
            onChange={setTab}
            segments={[
              { id: "places", label: "Places", icon: "map" },
              { id: "people", label: "People", icon: "users" },
              { id: "timeline", label: "Timeline", icon: "clock" },
            ]}
          />
        </div>
      </div>
      {!t || !index || !places || !people ? (
        <div className="grid flex-1 place-items-center"><Spinner /></div>
      ) : !places.length && !people.length ? (
        <DataMissing message="places.json and people.json are missing: run node scripts/data/atlas.mjs" />
      ) : tab === "places" ? (
        <Places t={t} index={index} places={places} initial={atlas?.kind === "place" ? atlas.id : null} />
      ) : tab === "people" ? (
        <People t={t} index={index} people={people} initial={atlas?.kind === "person" ? atlas.id : null} />
      ) : (
        <Timeline people={people} onPerson={(id) => { useStudy.getState().openAtlas("person", id); setTab("people"); }} />
      )}
    </div>
  );
}

/** A verse list: reference and text, each opening the reader. */
function Verses({ t, index, verses, limit = 60 }: { t: Translation; index: VerseIndex; verses: number[]; limit?: number }) {
  const read = useStudy((s) => s.read);
  const [n, setN] = useState(limit);
  useEffect(() => setN(limit), [verses, limit]);
  return (
    <div className="space-y-1">
      {verses.slice(0, n).map((i) => {
        const r = index.ref(i);
        const v = t.verse(r);
        return (
          <button key={i} type="button" onClick={() => read(r, { select: true })} className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-muted/60">
            <span className="text-xs font-semibold text-brand">{formatRef(r)}</span>
            <span className="mt-0.5 line-clamp-2 block font-garamond text-[15px] leading-6">{v?.text ?? ""}</span>
          </button>
        );
      })}
      {verses.length > n && (
        <Button variant="ghost" size="sm" onClick={() => setN(n + 100)}>
          {verses.length - n} more
        </Button>
      )}
    </div>
  );
}

// ── places ──────────────────────────────────────────────────────────────────

/** OpenBible numbers places that share a name ("Babylon 1"); the map and lists don't need to. */
const placeName = (p: Place) => p.name.replace(/\s+\d+$/, "");

function Places({ t, index, places, initial }: { t: Translation; index: VerseIndex; places: Place[]; initial: string | null }) {
  const [land, setLand] = useState<Land | null>(null);
  const [sel, setSel] = useState<string | null>(initial);
  const [q, setQ] = useState("");
  const [bookFilter, setBookFilter] = useState("");
  useEffect(() => setSel(initial), [initial]);
  useEffect(() => {
    loadLand().then(setLand, () => setLand(null));
  }, []);
  const shown = useMemo(() => {
    let list = places;
    if (bookFilter) list = list.filter((p) => p.verses.some((v) => index.ref(v).book === bookFilter));
    if (q.trim()) list = list.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
    return list;
  }, [places, q, bookFilter, index]);
  const place = places.find((p) => p.id === sel);
  const books = useMemo(() => BOOKS.filter((b) => b.shelf === "protestant"), []);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="relative min-w-0 flex-1">
        {land ? <EngravedMap land={land} places={shown} selected={place} onSelect={(p) => setSel(p.id)} /> : <div className="grid h-full place-items-center"><Spinner /></div>}
        <div className="absolute left-4 top-4 flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a place" className="h-8 w-48 bg-card/90" />
          <select
            value={bookFilter}
            onChange={(e) => setBookFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-card/90 px-2 text-sm"
            aria-label="Places named in a book"
          >
            <option value="">Every book</option>
            {books.map((b) => (
              <option key={b.osis} value={b.osis}>{b.name}</option>
            ))}
          </select>
        </div>
        <p className="pointer-events-none absolute bottom-3 left-4 text-[11px] text-muted-foreground">
          Locations from OpenBible.info; many ancient sites are uncertain. Coastlines from Natural Earth.
        </p>
      </div>
      <aside className="flex w-[24rem] shrink-0 flex-col border-l border-border/60 bg-card/50">
        {place ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <h2 className="font-garamond text-3xl">{placeName(place)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {place.type}{place.modern && place.modern !== place.name ? ` · today ${place.modern}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {place.sure >= 0.8 ? "Location well established" : place.sure >= 0.5 ? "Location likely" : "Location uncertain"} · named in {place.verses.length} verse{place.verses.length === 1 ? "" : "s"}
            </p>
            <div className="mt-4">
              <Verses t={t} index={index} verses={place.verses} />
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <SectionLabel>Most named</SectionLabel>
            <div className="mt-2 space-y-0.5">
              {shown.slice(0, 40).map((p) => (
                <button key={p.id} type="button" onClick={() => setSel(p.id)} className="flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted/60">
                  <span className="font-garamond text-base">{placeName(p)}</span>
                  <span className="text-xs text-muted-foreground">{p.verses.length}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/**
 * The map as an engraver would cut it: land in a light tint, the sea ruled
 * with fine horizontal lines, rivers in ink, places as dots. Drag to pan,
 * wheel to zoom.
 */
function EngravedMap({ land, places, selected, onSelect }: { land: Land; places: Place[]; selected?: Place; onSelect: (p: Place) => void }) {
  const W = 1000, H = 640;
  const at = useMemo(() => project(land, W, H), [land]);
  // Open on the Holy Land; zoom out for Egypt, Mesopotamia and Paul's journeys.
  const [view, setView] = useState(() => {
    const [cx, cy] = at(35.6, 32);
    const w = 230;
    return { x: cx - w / 2, y: cy - (w * H) / W / 2, w, h: (w * H) / W };
  });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!selected) return;
    const [x, y] = at(selected.lon, selected.lat);
    setView((v) => ({ ...v, x: x - v.w / 2, y: y - v.h / 2 }));
  }, [selected, at]);
  const path = (ring: [number, number][]) => ring.map(([lon, lat], i) => `${i ? "L" : "M"}${at(lon, lat).map((n) => n.toFixed(1)).join(",")}`).join("") + "Z";
  const line = (pts: [number, number][]) => pts.map(([lon, lat], i) => `${i ? "L" : "M"}${at(lon, lat).map((n) => n.toFixed(1)).join(",")}`).join("");
  const zoom = view.w / W;
  const max = places.reduce((m, p) => Math.max(m, p.verses.length), 1);
  // Label the most named places first, skipping any label that would overlap one already placed.
  const labelled = useMemo(() => {
    const boxes: [number, number, number, number][] = [];
    const out = new Set<string>();
    for (const p of places) {
      if (out.size > 60) break;
      const [x, y] = at(p.lon, p.lat);
      if (x < view.x || y < view.y || x > view.x + view.w || y > view.y + view.h) continue;
      const b: [number, number, number, number] = [x, y - 10 * zoom, x + placeName(p).length * 6 * zoom + 8 * zoom, y + 3 * zoom];
      if (boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) continue;
      boxes.push(b);
      out.add(p.id);
    }
    return out;
  }, [places, at, view, zoom]);

  const onWheel = (e: React.WheelEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    const k = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    setView((v) => {
      const w = Math.min(W, Math.max(60, v.w * k)), h = (w * H) / W;
      return { x: v.x + (v.w - w) * fx, y: v.y + (v.h - h) * fy, w, h };
    });
  };
  return (
    <svg
      ref={svg}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
      onWheel={onWheel}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
        (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const r = svg.current!.getBoundingClientRect();
        setView((v) => ({ ...v, x: d.vx - ((e.clientX - d.x) / r.width) * v.w, y: d.vy - ((e.clientY - d.y) / r.height) * v.h }));
      }}
      onPointerUp={() => (drag.current = null)}
      role="img"
      aria-label="Map of the lands of the Bible"
    >
      <defs>
        <pattern id="sea-rule" width="4" height={2.4 * zoom + 0.6} patternUnits="userSpaceOnUse">
          <line x1="0" y1="0.3" x2="4" y2="0.3" stroke="var(--muted-foreground)" strokeWidth={0.22 * zoom + 0.05} opacity="0.45" />
        </pattern>
      </defs>
      <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="url(#sea-rule)" />
      {land.land.map((r, i) => (
        <path key={i} d={path(r)} fill="var(--background)" stroke="var(--foreground)" strokeWidth={0.9 * zoom} strokeOpacity="0.7" />
      ))}
      {land.lakes.map((r, i) => (
        <path key={i} d={path(r)} fill="url(#sea-rule)" stroke="var(--foreground)" strokeWidth={0.6 * zoom} strokeOpacity="0.6" />
      ))}
      {land.rivers.map((r, i) => (
        <path key={i} d={line(r.line)} fill="none" stroke="var(--foreground)" strokeWidth={0.8 * zoom} strokeOpacity="0.55" />
      ))}
      {places.map((p) => {
        const [x, y] = at(p.lon, p.lat);
        const s = (0.9 + 3.2 * Math.sqrt(p.verses.length / max)) * zoom;
        const on = selected?.id === p.id;
        return (
          <g key={p.id} onClick={(e) => { e.stopPropagation(); onSelect(p); }} className="cursor-pointer">
            <circle cx={x} cy={y} r={on ? s * 1.6 : s} fill={on ? "var(--brand)" : "var(--foreground)"} fillOpacity={p.sure >= 0.5 ? 0.85 : 0.4} />
            {(labelled.has(p.id) || on) && (
              <text x={x + s * 1.6} y={y + s * 0.6} fontSize={11 * zoom} className="font-garamond" fill={on ? "var(--brand)" : "var(--foreground)"} style={{ fontStyle: "italic" }}>
                {placeName(p)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── people ──────────────────────────────────────────────────────────────────

function People({ t, index, people, initial }: { t: Translation; index: VerseIndex; people: Person[]; initial: string | null }) {
  const [sel, setSel] = useState<string | null>(initial);
  const [q, setQ] = useState("");
  useEffect(() => setSel(initial), [initial]);
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? people.filter((p) => p.name.toLowerCase().startsWith(s)).concat(people.filter((p) => !p.name.toLowerCase().startsWith(s) && p.name.toLowerCase().includes(s))) : people;
  }, [people, q]);
  const person = sel ? byId.get(sel) : undefined;

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border/60">
        <div className="p-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Find among ${people.length} people`} className="h-8" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {shown.slice(0, 200).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSel(p.id)}
              className={cn("block w-full rounded-md px-2 py-1.5 text-left hover:bg-muted/60", p.id === sel && "bg-muted")}
            >
              <span className="font-garamond text-base">{personName(p)}</span>
              <span className="block truncate text-xs text-muted-foreground">{p.brief || p.era}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto">
        {person ? (
          <div className="mx-auto max-w-4xl px-8 py-8">
            <h2 className="font-garamond text-4xl">{personName(person)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {[person.era, person.tribe].filter(Boolean).join(" · ")} · named in {person.verses.length} verse{person.verses.length === 1 ? "" : "s"}
            </p>
            {person.brief && <p className="mt-3 font-garamond text-lg leading-8">{person.brief}</p>}
            <FamilyTree person={person} byId={byId} onSelect={setSel} />
            <SectionLabel className="mt-8">Where Scripture names {person.sex === "f" ? "her" : person.sex === "m" ? "him" : "them"}</SectionLabel>
            <div className="mt-2">
              <Verses t={t} index={index} verses={person.verses} />
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center px-8 text-center">
            <div className="max-w-sm">
              <p className="font-garamond text-2xl">Choose a person</p>
              <p className="mt-2 text-sm text-muted-foreground">Their family, their age and every verse that names them. Names come from STEPBible's register of every individual in Scripture.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Parents above, the person with partners and siblings, children below; up to four generations of fathers and mothers. */
function FamilyTree({ person, byId, onSelect }: { person: Person; byId: Map<string, Person>; onSelect: (id: string) => void }) {
  const chip = (id: string, k?: string) => {
    const p = byId.get(id);
    if (!p) return null;
    return (
      <button key={(k ?? "") + id} type="button" title={p.brief} onClick={() => onSelect(id)} className="rounded-md border border-border bg-card px-2.5 py-1 font-garamond text-[15px] hover:border-foreground/40">
        {personName(p)}
      </button>
    );
  };
  // The line of descent upward, following the first parent named.
  const line: Person[] = [];
  let cur: Person | undefined = byId.get(person.parents[0] ?? "");
  while (cur && line.length < 4) {
    line.unshift(cur);
    cur = byId.get(cur.parents[0] ?? "");
  }
  const row = (label: string, ids: string[]) =>
    ids.length ? (
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="w-full text-center text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        {ids.map((id) => chip(id, label))}
      </div>
    ) : null;
  return (
    <section className="mt-6 rounded-lg border border-border/60 p-5">
      {line.length > 1 && (
        <p className="mb-4 text-center font-garamond text-sm italic text-muted-foreground">
          {line.slice(0, -1).map(personName).join(" → ")} →
        </p>
      )}
      <div className="space-y-4">
        {row("Parents", person.parents)}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {person.siblings.length > 0 && <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Siblings</span>}
          {person.siblings.map((id) => chip(id, "s"))}
          <span className="mx-2 rounded-md bg-foreground px-3 py-1 font-garamond text-base text-background">{personName(person)}</span>
          {person.partners.map((id) => chip(id, "p"))}
          {person.partners.length > 0 && <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{person.sex === "f" ? "Husband" : "Wives"}</span>}
        </div>
        {row("Children", person.children)}
      </div>
    </section>
  );
}

// ── timeline ────────────────────────────────────────────────────────────────

function Timeline({ people, onPerson }: { people: Person[]; onPerson: (id: string) => void }) {
  const dated = ERAS.filter((e) => !Number.isNaN(e.from));
  const start = -2100, end = 120;
  const pct = (y: number) => ((y - start) / (end - start)) * 100;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-8">
        <div className="relative h-16">
          <div className="absolute inset-x-0 top-8 h-px bg-border" />
          {dated.map((e, i) => (
            <div
              key={e.name}
              className={cn("absolute top-5 h-6 rounded-sm border border-foreground/20", i % 2 ? "bg-muted" : "bg-muted/50")}
              style={{ left: `${pct(e.from)}%`, width: `${pct(e.to) - pct(e.from)}%` }}
              title={`${e.name}: ${yearLabel(e.from)} to ${yearLabel(e.to)}`}
            />
          ))}
          {[-2000, -1500, -1000, -500, 1].map((y) => (
            <span key={y} className="absolute top-12 -translate-x-1/2 text-[10px] text-muted-foreground" style={{ left: `${pct(y)}%` }}>
              {yearLabel(y === 1 ? 1 : y)}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Conventional dates, as most study Bibles print them. They are approximate, and for the early periods scholars differ widely.
        </p>
        <div className="mt-6 space-y-6">
          {ERAS.map((e) => {
            const here = people.filter((p) => p.era === e.name).slice(0, 16);
            return (
              <section key={e.name} className="grid grid-cols-[12rem_1fr] gap-6 border-t border-border/60 pt-4">
                <div>
                  <h3 className="font-garamond text-xl">{e.name}</h3>
                  <p className="text-xs text-muted-foreground">{Number.isNaN(e.from) ? "Undated" : `c. ${yearLabel(e.from)} to ${yearLabel(e.to)}`}</p>
                </div>
                <div>
                  <p className="text-sm">{e.blurb}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{e.books}</p>
                  {here.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {here.map((p) => (
                        <button key={p.id} type="button" title={p.brief} onClick={() => onPerson(p.id)} className="rounded-full bg-muted/70 px-2.5 py-0.5 text-xs hover:bg-foreground/10">
                          {personName(p)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}


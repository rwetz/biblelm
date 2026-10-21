// The verse panel's people and places: who and where this verse names, each
// opening in the Atlas.

import { useEffect, useState } from "react";
import { SectionLabel } from "@nexis/design";
import { loadPeople, loadPlaces, peopleAt, personName, placesAt, type Person, type Place } from "@/lib/atlas";
import { useIndex } from "@/lib/hooks";
import { useStudy } from "@/store/study";

export function useAtlas(): { places: Place[] | null; people: Person[] | null } {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [people, setPeople] = useState<Person[] | null>(null);
  useEffect(() => {
    let live = true;
    loadPlaces().then((p) => live && setPlaces(p), () => live && setPlaces([]));
    loadPeople().then((p) => live && setPeople(p), () => live && setPeople([]));
    return () => {
      live = false;
    };
  }, []);
  return { places, people };
}

export function PlacesAndPeople({ osis }: { osis: string }) {
  const [index] = useIndex();
  const { places, people } = useAtlas();
  const openAtlas = useStudy((s) => s.openAtlas);
  const vi = index?.of(osis);
  if (vi === undefined || !places || !people) return null;
  const pl = placesAt(places, vi);
  const pe = peopleAt(people, vi);
  if (!pl.length && !pe.length) return null;
  return (
    <section>
      <SectionLabel>People and places</SectionLabel>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {pe.filter((p) => !p.name.includes("_")).map((p) => (
          <button key={p.id} type="button" title={p.brief} onClick={() => openAtlas("person", p.id)} className="rounded-full bg-muted/70 px-2.5 py-1 text-xs hover:bg-foreground/10">
            {personName(p)}
          </button>
        ))}
        {pl.map((p) => (
          <button key={p.id} type="button" title={p.modern} onClick={() => openAtlas("place", p.id)} className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-foreground/10">
            {p.name.replace(/\s+\d+$/, "")}
          </button>
        ))}
      </div>
    </section>
  );
}

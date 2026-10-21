// How a query reads while you type, and what kind of passage a verse is.
// Jev answers in about a tenth of a second, but the app never names it or
// shows numbers: each reading is drawn as a dithered sigil that forms as far
// as the reading is sure. Nothing here changes results (the machine finds,
// Scripture speaks).

import { useEffect, useState } from "react";
import { cn } from "@nexis/design";
import { Sigil, type SigilName } from "@/art/Sigil";
import { jevAvailable, readQuery, readVerse, type Reading } from "@/lib/jev";

export const INTENTS: [string, string, SigilName][] = [
  ["words", "Exact words", "book"],
  ["theme", "A theme", "lamp"],
  ["story", "A story or person", "crook"],
  ["question", "A question", "key"],
];

const KINDS: Record<string, string> = {
  narrative: "Narrative",
  law: "Law",
  praise: "Praise",
  lament: "Lament",
  prophecy: "Prophecy",
  teaching: "Teaching",
  prayer: "Prayer",
  list: "A list",
};

function useJev() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    jevAvailable().then(setOn);
  }, []);
  return on;
}

export type QueryState = { on: boolean; reading: Reading | null; pending: boolean; query: string };

/** Jev's reading of a query being typed: asked 120 ms after the last keystroke, once per query. */
export function useQueryReading(query: string): QueryState {
  const on = useJev();
  const [reading, setReading] = useState<Reading | null>(null);
  const [pending, setPending] = useState(false);
  const q = query.trim();

  useEffect(() => {
    if (!on || q.length < 3) {
      setPending(false);
      return;
    }
    let live = true;
    setPending(true);
    const timer = window.setTimeout(() => {
      readQuery(q).then((r) => {
        if (!live) return;
        setPending(false);
        if (r) setReading(r);
      });
    }, 120);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [on, q]);
  return { on, reading: q.length >= 3 ? reading : null, pending, query: q };
}

/** Under a search box: four sigils, the one the query reads as most clearly formed. */
export function QueryReading({ query, state, className }: { query?: string; state?: QueryState; className?: string }) {
  const own = useQueryReading(state ? "" : query ?? "");
  const { on, reading: shown, pending } = state ?? own;
  if (!on) return null;
  return (
    <div className={cn("flex items-center gap-5 text-xs transition-opacity", pending && shown && "opacity-60", className)} aria-live="polite">
      {INTENTS.map(([id, label, sigil]) => {
        const p = shown?.probabilities[id] ?? 0;
        const top = shown?.choice === id;
        return (
          <span key={id} className={cn("flex items-center gap-1.5 transition-colors duration-300", top ? "text-foreground" : "text-muted-foreground")}>
            <Sigil name={sigil} size={20} level={shown ? Math.max(0.1, p) : 0.18} className={top ? "text-foreground" : "text-muted-foreground"} />
            <span className={cn(top && "font-medium")}>{label}</span>
          </span>
        );
      })}
    </div>
  );
}

/** In the verse panel: what kind of passage this verse is. */
export function VerseReading({ reference, text, translation }: { reference: string; text: string; translation: string }) {
  const on = useJev();
  const [reading, setReading] = useState<Reading | null>(null);
  useEffect(() => {
    if (!on || !text) return;
    let live = true;
    setReading(null);
    readVerse(reference, text, translation).then((r) => live && setReading(r));
    return () => {
      live = false;
    };
  }, [on, reference, text, translation]);
  if (!on || !reading) return null;
  const sure = reading.probabilities[reading.choice] ?? reading.confidence;
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="font-garamond text-sm italic text-foreground">{KINDS[reading.choice] ?? reading.choice}</span>
      <span className="h-px flex-1 bg-foreground/10" />
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={cn("size-1 rounded-full", i < Math.round(sure * 5) ? "bg-foreground/60" : "bg-foreground/12")} />
        ))}
      </span>
    </p>
  );
}

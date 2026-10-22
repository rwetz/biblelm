import { useEffect, useState } from "react";
import { Button, Icon, Input, Panel, SectionLabel, Segmented, Spinner, cn } from "@nexis/design";
import { ArtSpot, CrossLoader, usePagePlate } from "@/art/Art";
import { invoke } from "@/lib/backend";
import { parseRef } from "@/lib/canon";
import { useStudy } from "@/store/study";
import { LabSection } from "../LabSection";

interface Lens {
  chars: string[];
  attention: number[][][][];
  lens: [string, number][][][];
  loss: (number | null)[];
  layers: number;
  heads: number;
}
interface Surprise {
  mean: number;
  count: number;
  predictable: { ref: string; text: string; loss: number }[];
  surprising: { ref: string; text: string; loss: number }[];
}

const show = (c: string) => (c === "\n" ? "⏎" : c === " " ? "·" : c);

/** Interpretability for the Lab's GPT: attention heads, the logit lens, surprise. */
export function InsideView() {
  const [mode, setMode] = useState<"lens" | "surprise">("lens");
  return (
    <LabSection
      title="Looking inside"
      lede="What the trained model is doing, letter by letter: where its attention goes, how its guess forms through the layers, and which verses it finds easy or strange."
      actions={
        <Segmented
          label="Inspect"
          value={mode}
          onChange={setMode}
          segments={[
            { id: "lens", label: "Attention and the logit lens", icon: "grid" },
            { id: "surprise", label: "Surprise", icon: "chart-bar" },
          ]}
        />
      }
    >
      {mode === "lens" ? <LensPanel /> : <SurprisePanel />}
    </LabSection>
  );
}

function LensPanel() {
  const [text, setText] = useState("In the beginning God created the heaven");
  const [data, setData] = useState<Lens | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [layer, setLayer] = useState(0);
  const [head, setHead] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const d = await invoke<Lens>("lab_inspect", { mode: "lens", text });
      setData(d);
      setFocus(d.chars.length - 1);
      setLayer(Math.min(layer, d.layers - 1));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const q = focus ?? (data ? data.chars.length - 1 : 0);
  const att = data?.attention[layer]?.[head]?.[q];
  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Type a phrase and look at how the model reads it. Pick a character: the highlight shows which earlier characters one attention head looked at
        to predict what comes next, and the table shows the model's guess after each layer, its thinking taking shape layer by layer.
      </p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} className="font-mono" />
        <Button type="submit" variant="brand" disabled={busy || text.length < 2}>{busy ? <Spinner /> : "Inspect"}</Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {data && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented label="Layer" size="sm" value={String(layer)} onChange={(v) => setLayer(+v)} segments={data.attention.map((_, i) => ({ id: String(i), label: `Layer ${i + 1}` }))} />
            <Segmented label="Head" size="sm" value={String(head)} onChange={(v) => setHead(+v)} segments={Array.from({ length: data.heads }, (_, i) => ({ id: String(i), label: `Head ${i + 1}` }))} />
          </div>
          <div className="rounded-xl bg-card p-4 font-mono text-lg leading-9 ring-1 ring-foreground/6">
            {data.chars.map((c, i) => {
              const w = i <= q ? att?.[i] ?? 0 : 0;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFocus(i)}
                  title={data.loss[i] != null ? `surprise ${data.loss[i]!.toFixed(2)}` : undefined}
                  className={cn("rounded-sm px-[1px]", i === q && "ring-2 ring-brand")}
                  style={{ background: `color-mix(in oklab, var(--brand) ${Math.round(Math.sqrt(w) * 85)}%, transparent)` }}
                >
                  {show(c)}
                </button>
              );
            })}
          </div>
          <section>
            <SectionLabel>After “{data.chars.slice(Math.max(0, q - 12), q + 1).join("")}”, the model expects</SectionLabel>
            <table className="mt-2 w-full max-w-xl text-sm">
              <tbody>
                {data.lens.map((row, l) => (
                  <tr key={l} className="border-b border-border/40">
                    <td className="py-1.5 pr-4 text-xs text-muted-foreground">after layer {l + 1}</td>
                    {row[q].map(([c, p], k) => (
                      <td key={k} className="py-1.5 pr-4 font-mono">
                        <span className="rounded bg-muted px-1.5">{show(c)}</span> <span className="text-xs text-muted-foreground">{Math.round(p * 100)}%</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {q + 1 < data.chars.length && (
              <p className="mt-2 text-xs text-muted-foreground">
                The text actually continues with <span className="rounded bg-muted px-1 font-mono">{show(data.chars[q + 1])}</span>.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** The loss is nats per letter; e^-loss is the model's average chance of the right next letter. */
const chance = (loss: number) => Math.exp(-loss);
const pct = (p: number) => `${Math.round(p * 100)}%`;

type Scored = Surprise["predictable"][number];

/** Identical verses (a refrain repeated through Ezekiel) shown once, with where else they occur. */
function grouped(list: Scored[]): { text: string; loss: number; refs: string[] }[] {
  const out = new Map<string, { text: string; loss: number; refs: string[] }>();
  for (const v of list) {
    const g = out.get(v.text);
    if (g) g.refs.push(v.ref);
    else out.set(v.text, { text: v.text, loss: v.loss, refs: [v.ref] });
  }
  return [...out.values()];
}

function SurprisePanel() {
  const [data, setData] = useState<Surprise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const read = useStudy((s) => s.read);
  const ezra = usePagePlate(1016); // Merian's wheel within a wheel, its rims full of eyes
  const openRef = (r: string) => {
    const ref = parseRef(r);
    if (ref) read(ref, { select: true });
  };
  const score = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await invoke<Surprise>("lab_inspect", { mode: "surprise" }));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Every real verse is read through the model once, and at each letter it is asked: what comes next? When it guesses well, the verse is{" "}
            <span className="text-foreground">predictable</span>: it sounds like a great deal else the model has read. When it keeps guessing wrong, the verse is{" "}
            <span className="text-foreground">surprising</span>.
          </p>
          <p>
            This is a statistic about a small model's habits, not a judgement of the verses. Formulas repeated hundreds of times come out easy; lists of names come out
            hard, because nothing earlier in the verse helps guess the next name.
          </p>
        </div>
        <Panel title="How to read the numbers">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Each score is the model's <em>loss</em>: its surprise per letter, in nats. Lower is easier. The percentage beside it is the same thing said plainly: the average
            chance the model gave to the letter that really came next.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <span className="font-mono tabular-nums text-foreground">0.33</span> <span className="text-muted-foreground">means about</span>{" "}
              <span className="font-medium text-foreground">{pct(chance(0.33))}</span>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <span className="font-mono tabular-nums text-foreground">3.0</span> <span className="text-muted-foreground">means about</span>{" "}
              <span className="font-medium text-foreground">{pct(chance(3))}</span>
            </div>
          </div>
        </Panel>
      </div>

      {busy ? (
        <Scoring />
      ) : (
        <div className="flex items-center gap-3">
          <Button variant={data ? "secondary" : "brand"} onClick={score}>
            <Icon name="chart-bar" /> {data ? "Score again" : "Score all 31,102 verses"}
          </Button>
          {!data && <span className="text-xs text-muted-foreground">About a minute on a GPU, longer on a CPU.</span>}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!data && !busy && (
        <ArtSpot plate={ezra} title="Nothing scored yet" className="pt-6">
          The two lists, the easiest and the strangest verses for this model, appear here.
        </ArtSpot>
      )}

      {data && !busy && (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{data.count.toLocaleString()}</span> verses scored. On an average verse the model gives the letter that really comes next about a{" "}
            <span className="font-medium text-foreground">{pct(chance(data.mean))}</span> chance (mean loss{" "}
            <span className="font-mono tabular-nums">{data.mean}</span>).
          </p>
          <div className="grid gap-8 lg:grid-cols-2">
            <SurpriseList
              title="Most predictable"
              why="Formulas it has read hundreds of times. After the first few letters it can finish them."
              items={grouped(data.predictable)}
              onOpen={openRef}
            />
            <SurpriseList
              title="Most surprising"
              why="Names, rare words and lists. Little in the verse so far helps it guess the next letter."
              items={grouped(data.surprising)}
              onOpen={openRef}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SurpriseList({ title, why, items, onOpen }: { title: string; why: string; items: ReturnType<typeof grouped>; onOpen: (ref: string) => void }) {
  return (
    <section>
      <SectionLabel>{title}</SectionLabel>
      <p className="mt-1 text-xs text-muted-foreground">{why}</p>
      <ol className="mt-3">
        {items.map((v) => (
          <li key={v.refs[0]} className="border-b border-border/40 py-3">
            <div className="flex items-baseline gap-3">
              <button type="button" onClick={() => onOpen(v.refs[0])} className="text-sm font-medium text-brand hover:underline">
                {v.refs[0]}
              </button>
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{pct(chance(v.loss))}</span> sure of each letter
              </span>
              <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">loss {v.loss.toFixed(2)}</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground/35" style={{ width: pct(chance(v.loss)) }} />
            </div>
            <p className="mt-2 font-garamond text-[15px] leading-6">{v.text}</p>
            {v.refs.length > 1 && (
              <p className="mt-1 text-xs text-muted-foreground">
                The same words in{" "}
                {v.refs.slice(1).map((r, i) => (
                  <span key={r}>
                    {i > 0 && ", "}
                    <button type="button" onClick={() => onOpen(r)} className="hover:text-foreground hover:underline">
                      {r}
                    </button>
                  </span>
                ))}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** While the whole Bible is read: the cross loader, what is happening, how long so far. */
function Scoring() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-5 rounded-2xl bg-card px-6 py-5 ring-1 ring-foreground/6 dark:ring-foreground/10">
      <CrossLoader size={56} label="Scoring every verse" />
      <div className="min-w-0">
        <p className="font-garamond text-xl text-foreground">Reading every verse</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          31,102 verses, one letter at a time, keeping the model's surprise at each. <span className="font-mono tabular-nums">{secs}s</span>
        </p>
      </div>
    </div>
  );
}

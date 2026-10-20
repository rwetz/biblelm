import { useState } from "react";
import { Button, Input, SectionLabel, Segmented, Spinner, cn } from "@nexis/design";
import { invoke } from "@/lib/backend";

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
    <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
      <Segmented
        label="Inspect"
        value={mode}
        onChange={setMode}
        segments={[
          { id: "lens", label: "Attention and the logit lens", icon: "grid" },
          { id: "surprise", label: "Surprise", icon: "chart-bar" },
        ]}
      />
      <div className="mt-5">{mode === "lens" ? <LensPanel /> : <SurprisePanel />}</div>
    </div>
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
    <div className="max-w-5xl space-y-5">
      <p className="text-sm text-muted-foreground">
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

function SurprisePanel() {
  const [data, setData] = useState<Surprise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="max-w-5xl space-y-5">
      <p className="text-sm text-muted-foreground">
        How surprised is the model by each real verse? Low loss means the verse sounds like everything else it read (formulaic genealogies, repeated
        refrains); high loss means unusual words, names or rhythm. This is a statistic about a small model's habits, not a judgement of the verses.
      </p>
      <Button
        variant="brand"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            setData(await invoke<Surprise>("lab_inspect", { mode: "surprise" }));
          } catch (e) {
            setError(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <><Spinner /> Scoring 31,102 verses</> : "Score every verse"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {data && (
        <div className="grid gap-8 lg:grid-cols-2">
          {(["predictable", "surprising"] as const).map((k) => (
            <section key={k}>
              <SectionLabel>{k === "predictable" ? "Most predictable" : "Most surprising"} (mean loss {data.mean})</SectionLabel>
              {data[k].map((v) => (
                <div key={v.ref} className="border-b border-border/40 py-2">
                  <span className="text-xs font-semibold text-brand">{v.ref}</span>
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">{v.loss}</span>
                  <p className="font-garamond text-[15px] leading-6">{v.text}</p>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

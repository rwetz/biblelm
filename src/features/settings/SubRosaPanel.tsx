// Settings, Sub Rosa: the switch and the rite that guards it. Three steps, in
// the order a book once went through to be printed: the censor's Nihil obstat,
// the bishop's Imprimatur (a seal pressed and held while the cross turns), and
// a last word typed out. Coming back out is one click. See docs/SUBROSA.md.

import { useEffect, useRef, useState } from "react";
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogTitle, Field, Input, Panel, Switch, toast } from "@nexis/design";
import { CrossLoader } from "@/art/Art";
import { useSubRosa } from "@/app/subrosa";

const ATTESTATIONS = [
  "I have consulted my pastor, my mother and at least one Jesuit.",
  "I understand that a picture of a demon is not a demon.",
  "I will not try to summon anything. Not even as a joke.",
  "I accept that curiosity killed the cat, and that nobody asked the cat.",
];

const WORDS = "Retro me, Satana";
/** The words typed, without case or punctuation. */
export const saidTheWords = (typed: string) => typed.toLowerCase().replace(/[^a-z]/g, "") === WORDS.toLowerCase().replace(/[^a-z]/g, "");

const HOLD_MS = 2400;

export function SubRosaPanel() {
  const [on, setOn] = useSubRosa();
  const [rite, setRite] = useState(false);
  const leave = () => {
    setOn(false);
    toast("Welcome back", { description: "Nobody saw anything." });
  };
  return (
    <Panel title="Sub Rosa" meta="under the rose">
      <Field
        label="Sub Rosa"
        hint={
          on
            ? "You are under the rose. What is read here stays here."
            : "A cabinet of curiosities: angels as Scripture draws them, hell and those who mapped it, the Lesser Key of Solomon, the Temple and the Masons, and the symbols people argue about. For curiosity, not counsel."
        }
        inline
      >
        <Switch checked={on} onCheckedChange={(next) => (next ? setRite(true) : leave())} />
      </Field>
      <Rite open={rite} onOpenChange={setRite} onDone={() => { setRite(false); setOn(true); }} />
    </Panel>
  );
}

const STEPS = ["I", "II", "III"];

function Rite({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [sworn, setSworn] = useState<boolean[]>(() => ATTESTATIONS.map(() => false));
  const [typed, setTyped] = useState("");
  // Each opening starts the rite over.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSworn(ATTESTATIONS.map(() => false));
    setTyped("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md">
        <p className="text-xs tracking-widest text-muted-foreground">{STEPS.map((n, i) => <span key={n} className={i === step ? "text-brand" : undefined}>{n}{i < 2 ? " · " : ""}</span>)}</p>
        {step === 0 && (
          <>
            <DialogTitle className="font-blackletter text-3xl font-normal">Nihil obstat</DialogTitle>
            <DialogDescription>Nothing stands in the way, said the censor, once he had read it. Swear to each.</DialogDescription>
            <div className="space-y-3 py-2">
              {ATTESTATIONS.map((a, i) => (
                <div key={a} className="flex items-start gap-3 text-sm">
                  <Checkbox id={`oath-${i}`} className="mt-0.5" checked={sworn[i]} onCheckedChange={(c) => setSworn((s) => s.map((x, j) => (j === i ? c === true : x)))} />
                  <label htmlFor={`oath-${i}`}>{a}</label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Think better of it</Button>
              <Button variant="brand" disabled={!sworn.every(Boolean)} onClick={() => setStep(1)}>Sworn</Button>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <DialogTitle className="font-blackletter text-3xl font-normal">Imprimatur</DialogTitle>
            <DialogDescription>Let it be printed, said the bishop, and pressed his seal. Press and hold yours.</DialogDescription>
            <Seal onSealed={() => setStep(2)} />
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Think better of it</Button>
            </div>
          </>
        )}
        {step === 2 && (
          <form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              if (saidTheWords(typed)) onDone();
            }}
          >
            <DialogTitle className="font-blackletter text-3xl font-normal">{WORDS}</DialogTitle>
            <DialogDescription>Get behind me, Satan: Mark 8:33, in the Latin of the Vulgate. Type it, so it is on record that you were warned.</DialogDescription>
            <Input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={WORDS} aria-label="The words" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Think better of it</Button>
              <Button type="submit" variant="brand" disabled={!saidTheWords(typed)}>Go under the rose</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Press and hold (pointer, Space or Enter): the cross turns over as it seals; letting go too soon lets it fall back. */
function Seal({ onSealed }: { onSealed: () => void }) {
  const [held, setHeld] = useState(0);
  const start = useRef<number | null>(null);
  const raf = useRef(0);
  const press = () => {
    if (start.current !== null) return;
    start.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start.current!) / HOLD_MS);
      setHeld(p);
      if (p >= 1) {
        start.current = null;
        return onSealed();
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const release = () => {
    cancelAnimationFrame(raf.current);
    start.current = null;
    setHeld(0);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const key = (e: React.KeyboardEvent) => e.key === " " || e.key === "Enter";
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <button
        type="button"
        aria-label="Press and hold the seal"
        className="grid size-28 select-none place-items-center rounded-full border border-border bg-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onKeyDown={(e) => key(e) && (e.preventDefault(), press())}
        onKeyUp={(e) => key(e) && release()}
      >
        <span style={{ transform: `rotate(${held * 180}deg)`, transition: held ? "none" : "transform 300ms" }}>
          <CrossLoader size={64} label="The seal" />
        </span>
      </button>
      <p className="text-xs text-muted-foreground">{held ? "Hold" : "Press and hold"}</p>
    </div>
  );
}

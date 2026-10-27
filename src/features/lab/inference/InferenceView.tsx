import { GOETIA_CORPUS, invoke, listen } from "@/lib/backend";
import { useEffect, useRef, useState } from "react";
import { InfoTip } from "@/features/lab/InfoTip";
import { useAppStore } from "@/store/appStore";
import { Blink, Button, Icon, Slider, Spinner, StatusDot, Textarea } from "@nexis/design";
import { ArtSpot, usePagePlate } from "@/art/Art";
import { LabSection } from "@/features/lab/LabSection";
import { judgeGenerated, type Judgment } from "@/lib/jev";

const PLACEHOLDER =
  "In the beginning was the Word, and";

const EXAMPLE_PROMPTS = [
  "And it came to pass in those days,",
  "And God said unto Moses,",
  "Thus saith the LORD of hosts;",
  "Blessed are the pure in heart:",
];

// Trained on the Goetia's catalogue (Sub Rosa), it invents spirits the book never had.
const SPIRIT_PROMPTS = ["The Seventy-third Spirit is", "The Seventy-fourth Spirit is called", "The Eightieth Spirit is a Great Duke,", "The Hundredth Spirit is"];

export function InferenceView() {
  const spirits = useAppStore((s) => s.activeCorpus === GOETIA_CORPUS);
  const [prompt, setPrompt] = useState(spirits ? SPIRIT_PROMPTS[0] : PLACEHOLDER);
  const prompts = spirits ? SPIRIT_PROMPTS : EXAMPLE_PROMPTS;
  const config = useAppStore((s) => s.inferenceConfig);
  const output = useAppStore((s) => s.inferenceOutput);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const updateConfig = useAppStore((s) => s.updateInferenceConfig);
  const resetConfig = useAppStore((s) => s.resetInferenceConfig);
  const appendOutput = useAppStore((s) => s.appendInferenceOutput);
  const clearOutput = useAppStore((s) => s.clearInferenceOutput);
  const setGenerating = useAppStore((s) => s.setIsGenerating);

  const outputRef = useRef<HTMLDivElement>(null);
  const wall = usePagePlate(132); // Daniel Interpreting the Writing on the Wall

  useEffect(() => {
    const token = listen<{ token: string }>("inference:token", (e) =>
      appendOutput(e.payload.token),
    );
    const done = listen("inference:complete", () => setGenerating(false));
    return () => {
      token.then((un) => un());
      done.then((un) => un());
    };
  }, [appendOutput, setGenerating]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleGenerate = async () => {
    clearOutput();
    setGenerating(true);
    try {
      await invoke("inference_generate", {
        prompt,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topK: config.topK,
      });
    } catch (err) {
      appendOutput(`\n\n[Error: ${err}]`);
      setGenerating(false);
    }
  };

  return (
    <LabSection
      title="Let it write"
      lede={
        spirits
          ? "Trained on the Goetia's seventy-two spirits, the model invents more, one letter at a time: a seventy-third, a hundredth. Every one is made up on the spot, imitation of a catalogue, and neither the Goetia nor Scripture."
          : "Give the trained model a beginning and it continues, one letter at a time. It has learned how the King James Version sounds, not what it means: what it writes is imitation, never Scripture."
      }
    >
      <div className="flex flex-col gap-4">
        {/* Prompt area */}
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/6 dark:ring-foreground/10">
          <div className="border-b border-border/60 px-4 py-2 flex items-center justify-between">
            <span className="font-heading text-[13px] font-medium">Beginning</span>
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
              <span className="shrink-0 pr-1 text-xs text-muted-foreground">Try</span>
              {prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrompt(p)}
                  className="shrink-0 rounded-md px-2 py-0.5 font-garamond text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={PLACEHOLDER}
            className="rounded-none border-0 bg-transparent min-h-[80px] px-4 py-3 font-garamond text-lg leading-relaxed focus-visible:ring-0 focus-visible:border-0 resize-none"
            disabled={isGenerating}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-card px-5 py-3 ring-1 ring-foreground/6 dark:ring-foreground/10">
          <SliderControl
            label="Temperature"
            value={config.temperature}
            min={0.1}
            max={2.0}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => updateConfig({ temperature: v })}
            disabled={isGenerating}
            help="How adventurous the model is. Low (~0.2) gives safe, repetitive text; high (~1.2) gives creative but riskier, sometimes nonsensical output. 0.4 scored best for sounding like the KJV and making sense, before it starts to repeat itself."
          />
          <SliderControl
            label="Max tokens"
            value={config.maxTokens}
            min={32}
            max={1024}
            step={32}
            format={(v) => v.toString()}
            onChange={(v) => updateConfig({ maxTokens: v })}
            disabled={isGenerating}
            help="How many characters to generate before stopping."
          />
          <SliderControl
            label="Top-k"
            value={config.topK}
            min={1}
            max={100}
            step={1}
            format={(v) => v.toString()}
            onChange={(v) => updateConfig({ topK: v })}
            disabled={isGenerating}
            help="At each step, only consider the K most likely next characters and ignore the rest. Lower is more focused and coherent; higher adds variety."
          />

          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={resetConfig}
              disabled={isGenerating}
              title="Reset temperature, max tokens, and top-k to recommended values"
              className="gap-1.5 rounded-md text-muted-foreground"
            >
              <Icon name="refresh" size="sm" />
              Defaults
            </Button>
            {output && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { clearOutput(); }}
                disabled={isGenerating}
                className="rounded-md text-muted-foreground"
              >
                <Icon name="delete" size="sm" />
                Clear
              </Button>
            )}
            <Button
              size="sm"
              variant="brand"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="gap-1.5 rounded-md min-w-28"
            >
              {isGenerating ? (
                <>
                  <Spinner />
                  Generating…
                </>
              ) : (
                <>
                  <Icon name="play" size="sm" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Output */}
        <div className="flex h-[26rem] flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/6 dark:ring-foreground/10">
          <div className="border-b border-border/60 px-4 py-2 flex items-center justify-between shrink-0">
            <span className="flex items-baseline gap-2">
              <span className="font-heading text-[13px] font-medium">What it wrote</span>
              <span className="text-xs text-muted-foreground">{spirits ? "Generated by BibleLM's model. Not the Goetia." : "Generated by BibleLM's 3-million-parameter model. Not Scripture."}</span>
            </span>
            {isGenerating && (
              <span className="flex items-center gap-1.5 text-xs text-brand">
                <StatusDot tone="brand" live />
                Generating
              </span>
            )}
            {!isGenerating && output && !spirits && <JudgeLine text={output} />}
          </div>
          <div
            ref={outputRef}
            className="flex-1 overflow-auto px-5 py-4 nexis-scrollbar"
          >
            {output || isGenerating ? (
              <p className="font-garamond text-[17px] leading-8 text-foreground whitespace-pre-wrap">
                <span className="text-muted-foreground">{prompt}</span>
                {output}
                {isGenerating && (
                  <Blink />
                )}
              </p>
            ) : (
              <div className="flex h-full items-center justify-center">
                <ArtSpot plate={wall} title="Nothing written yet">
                  Choose a beginning and press Generate. The words appear here as the model chooses them, letter by letter.
                </ArtSpot>
              </div>
            )}
          </div>
        </div>
      </div>
    </LabSection>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  disabled,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  disabled?: boolean;
  help?: string;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="shrink-0">
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          {help && <InfoTip>{help}</InfoTip>}
        </div>
        <p className="text-xs font-mono font-semibold text-foreground tabular-nums">
          {format(value)}
        </p>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([v]) => onChange(v)}
        className="w-24"
      />
    </div>
  );
}

/** Jev's two scores for a finished generation: the machine judging the machine. */
function JudgeLine({ text }: { text: string }) {
  const [j, setJ] = useState<Judgment | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setJ(undefined);
    judgeGenerated(text).then((r) => live && setJ(r));
    return () => {
      live = false;
    };
  }, [text]);
  if (j === null) return null;
  const meter = (label: string, v: number) => (
    <span className="flex items-center gap-1.5">
      {label}
      <span className="h-1 w-12 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-foreground/50" style={{ width: `${(v / 3) * 100}%` }} />
      </span>
    </span>
  );
  return (
    <span className="flex items-center gap-3 text-xs text-muted-foreground">
      {j !== undefined && (
        <>
          {meter("Sounds like the KJV", j.style)}
          {meter("Makes sense", j.sense)}
        </>
      )}
    </span>
  );
}

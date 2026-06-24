import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlayIcon,
  Delete01Icon,
  ArrowReloadHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { InfoTip } from "@/components/InfoTip";
import { useAppStore } from "@/store/appStore";

const PLACEHOLDER =
  "In the beginning was the Word, and";

const EXAMPLE_PROMPTS = [
  "And it came to pass in those days,",
  "And God said unto Moses,",
  "Thus saith the LORD of hosts;",
  "Blessed are the pure in heart:",
];

export function InferenceView() {
  const [prompt, setPrompt] = useState(PLACEHOLDER);
  const config = useAppStore((s) => s.inferenceConfig);
  const output = useAppStore((s) => s.inferenceOutput);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const updateConfig = useAppStore((s) => s.updateInferenceConfig);
  const resetConfig = useAppStore((s) => s.resetInferenceConfig);
  const appendOutput = useAppStore((s) => s.appendInferenceOutput);
  const clearOutput = useAppStore((s) => s.clearInferenceOutput);
  const setGenerating = useAppStore((s) => s.setIsGenerating);

  const outputRef = useRef<HTMLDivElement>(null);

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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-foreground">Inference</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prompt the trained model — it speaks in KJV
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-6 gap-4">
        {/* Prompt area */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border/60 px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Prompt
            </span>
            <div className="flex items-center gap-1">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrompt(p)}
                  className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors truncate max-w-40"
                >
                  {p.slice(0, 20)}…
                </button>
              ))}
            </div>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={PLACEHOLDER}
            className="rounded-none border-0 bg-transparent min-h-[80px] px-4 py-3 text-sm font-serif leading-relaxed focus-visible:ring-0 focus-visible:border-0 resize-none"
            disabled={isGenerating}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 rounded-xl border border-border bg-card px-5 py-3">
          <SliderControl
            label="Temperature"
            value={config.temperature}
            min={0.1}
            max={2.0}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => updateConfig({ temperature: v })}
            disabled={isGenerating}
            help="How adventurous the model is. Low (~0.2) gives safe, repetitive text; high (~1.2) gives creative but riskier, sometimes nonsensical output. 0.8 is a good middle."
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
              <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={14} strokeWidth={1.75} />
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
                <HugeiconsIcon icon={Delete01Icon} size={14} strokeWidth={1.75} />
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
                  <span className="size-3 rounded-full border-2 border-brand-foreground/30 border-t-brand-foreground animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={PlayIcon} size={13} strokeWidth={2} />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Output */}
        <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden flex flex-col min-h-0">
          <div className="border-b border-border/60 px-4 py-2 flex items-center justify-between shrink-0">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Completion
            </span>
            {isGenerating && (
              <span className="flex items-center gap-1.5 text-xs text-brand">
                <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                Generating
              </span>
            )}
          </div>
          <div
            ref={outputRef}
            className="flex-1 overflow-auto px-5 py-4 nexis-scrollbar"
          >
            {output || isGenerating ? (
              <p className="font-serif text-sm leading-8 text-foreground whitespace-pre-wrap">
                <span className="text-muted-foreground">{prompt}</span>
                {output}
                {isGenerating && (
                  <span className="inline-block h-4 w-0.5 bg-brand ml-0.5 animate-pulse" />
                )}
              </p>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground/40">
                <p className="text-sm italic font-serif">
                  And the LORD said, Ask what I shall give thee.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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

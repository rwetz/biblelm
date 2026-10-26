import { invoke, listen } from "@/lib/backend";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InfoTip } from "@/features/lab/InfoTip";
import { LossChart } from "@/features/lab/training/LossChart";
import {
  useAppStore,
  type GpuInfo,
  type TrainConfig,
  type TrainMetric,
} from "@/store/appStore";
import { refreshGpuInfo } from "@/lib/gpu";
import { cn } from "@/lib/utils";
import { Button, Icon, Progress, Segmented } from "@nexis/design";
import { CrossLoader } from "@/art/Art";
import { LabSection } from "@/features/lab/LabSection";

export function TrainingView() {
  const config = useAppStore((s) => s.trainConfig);
  const status = useAppStore((s) => s.trainStatus);
  const metrics = useAppStore((s) => s.trainMetrics);
  const updateConfig = useAppStore((s) => s.updateTrainConfig);
  const resetConfig = useAppStore((s) => s.resetTrainConfig);
  const setStatus = useAppStore((s) => s.setTrainStatus);
  const addMetric = useAppStore((s) => s.addTrainMetric);
  const clearMetrics = useAppStore((s) => s.clearTrainMetrics);
  const activeCorpus = useAppStore((s) => s.activeCorpus);
  const trainDevice = useAppStore((s) => s.trainDevice);
  const setTrainDevice = useAppStore((s) => s.setTrainDevice);
  // Axon (the Rust engine) trains the same model with no PyTorch, when it is installed.
  const [axon, setAxon] = useState(false);
  const [engine, setEngine] = useState<"python" | "axon">("python");
  useEffect(() => {
    invoke<{ axon: string | null; axonText: boolean }>("lab_engines").then((e) => setAxon(e.axonText), () => setAxon(false));
  }, []);
  const gpuInfo = useAppStore((s) => s.gpuInfo);
  const gpuError = useAppStore((s) => s.gpuError);
  const corpus = useAppStore((s) => s.corpus);
  const vocabSize = corpus?.vocabSize ?? 75;
  const estimatedVramMb = estimateVramMb(config, vocabSize);
  const willOOM = !!(gpuInfo?.available && estimatedVramMb > gpuInfo.totalMb * 0.9);

  useEffect(() => {
    const metric = listen<TrainMetric>("train:metric", (e) =>
      addMetric(e.payload),
    );
    const complete = listen("train:complete", () => setStatus("completed"));
    const failed = listen<{ message: string }>("train:error", (e) => {
      setStatus("error");
      toast.error("Training failed", { description: e.payload.message });
    });
    const statusEvt = listen<{ phase: string; device?: string }>(
      "train:status",
      (e) => {
        if (e.payload.phase === "start" && e.payload.device) {
          setTrainDevice(e.payload.device);
        }
      },
    );
    return () => {
      metric.then((un) => un());
      complete.then((un) => un());
      failed.then((un) => un());
      statusEvt.then((un) => un());
    };
  }, [addMetric, setStatus, setTrainDevice]);

  const handleStart = async () => {
    clearMetrics();
    setTrainDevice(null);
    setStatus("running");
    try {
      await invoke("train_start", {
        version: activeCorpus,
        config: {
          d_model: config.dModel,
          n_layers: config.nLayers,
          n_heads: config.nHeads,
          context_len: config.contextLen,
          batch_size: config.batchSize,
          learning_rate: config.learningRate,
          epochs: config.epochs,
          eval_interval: config.evalInterval,
          tokenizer_type: config.tokenizerType,
          engine: axon ? engine : "python",
        },
      });
    } catch (err) {
      console.error("Train failed:", err);
      setStatus("error");
    }
  };

  const handleStop = async () => {
    await invoke("train_stop").catch(console.error);
    setStatus("idle");
  };

  const currentMetric = metrics.at(-1);
  // Val loss is only computed at eval intervals, so surface the most recent
  // one rather than letting the card flicker to "—" between evals.
  const lastVal = metrics.reduce<number | null>(
    (acc, m) => (m.valLoss != null ? m.valLoss : acc),
    null,
  );
  const progress =
    currentMetric && config.epochs > 0
      ? Math.min(100, (currentMetric.epoch / config.epochs) * 100)
      : 0;

  const trainLoss = metrics.map((m) => m.trainLoss);
  const valLoss = metrics.map((m) => m.valLoss);

  return (
    <LabSection
      title="Teaching it to write"
      lede={
        <>
          A small GPT, from nothing, on <span className="font-mono text-foreground">{activeCorpus}</span>. Each step it reads a few thousand letters,
          guesses every next one, and nudges its weights toward the letter that really came. The curve is how wrong it still is.
        </>
      }
      actions={
        <>
          {axon && (
            <Segmented
              label="Engine"
              size="sm"
              value={engine}
              onChange={setEngine}
              segments={[
                { id: "python", label: "PyTorch", title: "python/biblelm: the reference trainer" },
                { id: "axon", label: "Axon", title: "Axon, in Rust: the same model with no Python. One reported epoch is one eval interval of steps." },
              ]}
            />
          )}
          <StatusBadge status={status} />
          {status === "running" ? (
            <Button size="sm" variant="destructive" onClick={handleStop} className="gap-1.5">
              <Icon name="stop" size="sm" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant={willOOM ? "destructive" : "brand"}
              onClick={willOOM ? undefined : handleStart}
              disabled={willOOM}
              title={willOOM ? "Estimated VRAM exceeds GPU capacity, reduce parameters in the config panel" : undefined}
              className="gap-1.5"
            >
              <Icon name="play" size="sm" />
              {willOOM ? "Over VRAM limit" : status === "completed" ? "Train again" : "Start training"}
            </Button>
          )}
        </>
      }
    >
      <div className="grid items-start gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* Config panel */}
        <div className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/6 dark:ring-foreground/10">
          <div className="flex h-10 items-center justify-between border-b border-border/60 px-4">
            <p className="font-heading text-[13px] font-medium">Settings</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetConfig}
              disabled={status === "running"}
              title="Reset all settings to recommended defaults"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground rounded"
            >
              <Icon name="refresh" size="xs" />
              Defaults
            </Button>
          </div>
          <div>
            <div className="px-4 py-4 space-y-5">
              <ConfigSection title="Architecture">
                <ConfigRow
                  label="d_model"
                  hint="Embed dim"
                  help="The model's 'width', how many numbers describe each character internally. Wider captures richer patterns, but trains slower and uses more memory."
                >
                  <NumInput
                    value={config.dModel}
                    min={64}
                    max={1024}
                    step={64}
                    onChange={(v) => updateConfig({ dModel: v })}
                    disabled={status === "running"}
                  />
                </ConfigRow>
                <ConfigRow
                  label="n_layers"
                  hint="Transformer blocks"
                  help="How many stacked processing blocks the text passes through. More layers means deeper reasoning, but slower and trickier to train."
                >
                  <NumInput
                    value={config.nLayers}
                    min={1}
                    max={12}
                    step={1}
                    onChange={(v) => updateConfig({ nLayers: v })}
                    disabled={status === "running"}
                  />
                </ConfigRow>
                <ConfigRow
                  label="n_heads"
                  hint="Attention heads"
                  help="Within each layer, how many things the model attends to at once. More heads let it track several relationships between characters in parallel. Must divide d_model evenly."
                >
                  <NumInput
                    value={config.nHeads}
                    min={1}
                    max={16}
                    step={1}
                    onChange={(v) => updateConfig({ nHeads: v })}
                    disabled={status === "running"}
                  />
                </ConfigRow>
                <ConfigRow
                  label="ctx_len"
                  hint="Context window"
                  help="How many characters of history the model sees when predicting the next one, its short-term memory. Longer means more context but more compute."
                >
                  <NumInput
                    value={config.contextLen}
                    min={64}
                    max={1024}
                    step={64}
                    onChange={(v) => updateConfig({ contextLen: v })}
                    disabled={status === "running"}
                  />
                </ConfigRow>
              </ConfigSection>

              <ConfigSection title="Training">
                <ConfigRow
                  label="batch_size"
                  help="How many text snippets are studied together before each learning update. Larger batches give steadier, faster training, if the GPU has the memory."
                >
                  <NumInput
                    value={config.batchSize}
                    min={4}
                    max={256}
                    step={4}
                    onChange={(v) => updateConfig({ batchSize: v })}
                    disabled={status === "running"}
                  />
                </ConfigRow>
                <ConfigRow
                  label="lr"
                  hint="Learning rate"
                  help="How big a correction the model makes each time it's wrong. Too high and it overshoots and never settles; too low and it crawls. ~0.0003 is a safe default."
                >
                  <NumInput
                    value={config.learningRate}
                    step={0.0001}
                    min={0.0001}
                    max={0.01}
                    width="w-16"
                    disabled={status === "running"}
                    onChange={(v) => updateConfig({ learningRate: v })}
                  />
                </ConfigRow>
                <ConfigRow
                  label="epochs"
                  help="How many full passes over the entire Bible to train for. More passes learn more, until the model starts memorizing instead of generalizing."
                >
                  <NumInput
                    value={config.epochs}
                    min={1}
                    max={100}
                    step={1}
                    onChange={(v) => updateConfig({ epochs: v })}
                    disabled={status === "running"}
                  />
                </ConfigRow>
                <ConfigRow
                  label="eval_every"
                  hint="Steps"
                  help="How often (in training steps) to pause and test the model on held-out text it isn't training on, so you can tell real learning from memorization."
                >
                  <NumInput
                    value={config.evalInterval}
                    min={50}
                    max={1000}
                    step={50}
                    onChange={(v) => updateConfig({ evalInterval: v })}
                    disabled={status === "running"}
                  />
                </ConfigRow>
              </ConfigSection>

              <ConfigSection title="Tokenizer">
                <div className="space-y-1">
                  {(["char", "bpe"] as const).map((t) => {
                    // BPE is stubbed in tokenizer.py and raises. Leaving the
                    // radio live meant you could pick it, hit Start Training,
                    // and watch the run die immediately — so it stays visible
                    // (it's on the roadmap) but can't be selected.
                    const unavailable = t === "bpe";
                    const locked = unavailable || status === "running";
                    return (
                      <div
                        key={t}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors",
                          locked ? "opacity-50" : "hover:bg-accent",
                        )}
                      >
                        <label
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-2.5",
                            locked ? "cursor-not-allowed" : "cursor-pointer",
                          )}
                        >
                          <input
                            type="radio"
                            name="tokenizer"
                            value={t}
                            checked={config.tokenizerType === t}
                            disabled={locked}
                            onChange={() => updateConfig({ tokenizerType: t })}
                            className="accent-brand"
                          />
                          <span className="text-xs font-medium">
                            {t === "char" ? "Character-level" : "BPE"}
                          </span>
                          {unavailable && <span className="text-[11px] text-muted-foreground">coming later</span>}
                        </label>
                        <InfoTip side="right">
                          {t === "char"
                            ? "The model reads one character at a time. The vocabulary is just the distinct characters in your corpus, tiny, dead simple, and surprisingly good at this scale. The default here."
                            : "Groups frequent character sequences into single tokens (closer to words). More efficient for big models, but more complex. Not implemented yet, so it can't be selected."}
                        </InfoTip>
                      </div>
                    );
                  })}
                </div>
              </ConfigSection>

              {/* Param count estimate */}
              <div className="rounded-lg bg-brand/6 border border-brand/15 px-3 py-2.5">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Est. parameters</p>
                  <InfoTip side="right">
                    The total count of adjustable values (weights) the model
                    learns. More parameters means more learning capacity, and
                    more to train. 10.8M is tiny by modern standards (GPT-3 has
                    175 billion).
                  </InfoTip>
                </div>
                <p className="mt-0.5 font-mono text-sm font-semibold text-brand">
                  {estimateParams(config)}
                </p>
              </div>

              {/* VRAM estimate */}
              <VramMeter estimatedMb={estimatedVramMb} gpuInfo={gpuInfo} gpuError={gpuError} />
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="relative flex h-[24rem] rounded-2xl bg-card p-4 ring-1 ring-foreground/6 dark:ring-foreground/10">
            <LossChart trainLoss={trainLoss} valLoss={valLoss} />
            {status === "running" && metrics.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card">
                <CrossLoader size={56} label="Starting the training run" />
                <p className="font-garamond text-lg text-foreground">Waking the model</p>
                <p className="text-sm text-muted-foreground">Starting Python and reading the first batch.</p>
              </div>
            )}
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Step"
              value={currentMetric?.step.toLocaleString() ?? "–"}
            />
            <MetricCard
              label="Epoch"
              value={
                currentMetric
                  ? `${currentMetric.epoch}/${config.epochs}`
                  : "–"
              }
            />
            <MetricCard
              label="Train loss"
              value={currentMetric?.trainLoss.toFixed(4) ?? "–"}
              highlight
            />
            <MetricCard
              label="Val loss"
              value={lastVal?.toFixed(4) ?? "–"}
            />
            <MetricCard
              label="Tokens/sec"
              value={
                currentMetric
                  ? Math.round(currentMetric.tokensPerSec).toLocaleString()
                  : "–"
              }
            />
            <MetricCard
              label="Device"
              value={
                trainDevice
                  ? trainDevice === "cuda"
                    ? "CUDA (GPU)"
                    : trainDevice.toUpperCase()
                  : status === "running"
                  ? "detecting…"
                  : "–"
              }
              highlight={trainDevice === "cuda"}
            />
          </div>

          {/* Progress bar + tokens/sec */}
          <div className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/6 dark:ring-foreground/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {status === "running" && metrics.length === 0
                  ? "Starting Python process, first batch may take a moment…"
                  : status === "running"
                  ? `Training, epoch ${currentMetric?.epoch ?? 0}/${config.epochs}`
                  : status === "completed"
                  ? "Training complete"
                  : status === "error"
                  ? "Training failed: see the error message"
                  : "Not started"}
              </span>
              {currentMetric && (
                <span className="font-mono text-muted-foreground tabular-nums">
                  {currentMetric.tokensPerSec.toLocaleString()} tok/s
                </span>
              )}
            </div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground/50">
              {progress.toFixed(1)}% complete
            </p>
          </div>
        </div>
      </div>
    </LabSection>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function estimateParams(config: TrainConfig): string {
  const vocab = config.tokenizerType === "char" ? 100 : 10000;
  const embed = config.dModel * vocab;
  const attn = config.nLayers * (4 * config.dModel * config.dModel);
  const ff = config.nLayers * (8 * config.dModel * config.dModel);
  const total = embed + attn + ff;
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`;
  return `${(total / 1000).toFixed(0)}K`;
}

// Conservative VRAM estimate in MB for training (fp32, Adam optimizer).
// Deliberately over-estimates to ensure we catch OOM before the run starts.
function estimateVramMb(config: TrainConfig, vocabSize: number): number {
  const { dModel, nLayers, nHeads, contextLen, batchSize } = config;

  // Parameter count (embeddings + transformer blocks)
  const nParams =
    vocabSize * dModel +                              // token embedding (= LM head, tied weights)
    contextLen * dModel +                             // position embedding
    nLayers * (12 * dModel * dModel + 13 * dModel) + // attention + FFN + layernorms per block
    2 * dModel;                                       // final layernorm

  // Parameters + gradients + Adam m/v (×4 total)
  const modelBytes = nParams * 4 * 4;

  // Attention activation map stored for backprop: [B, H, T, T] per layer
  const attnBytes = nLayers * batchSize * nHeads * contextLen * contextLen * 4;

  // Residual stream + FFN intermediates: [B, T, D] × several copies per layer
  const actBytes = nLayers * batchSize * contextLen * dModel * 8 * 4;

  // CUDA runtime / allocator overhead (~400 MB on typical NVIDIA drivers)
  const overheadBytes = 400 * 1024 * 1024;

  return ((modelBytes + attnBytes + actBytes + overheadBytes) / (1024 * 1024)) * 1.15;
}

function VramMeter({
  estimatedMb,
  gpuInfo,
  gpuError,
}: {
  estimatedMb: number;
  gpuInfo: GpuInfo | null;
  gpuError: string | null;
}) {
  // The probe runs Python + torch, so it fails for ordinary setup reasons. Say
  // which one, and offer a retry — this used to sit on "querying GPU…" forever.
  if (!gpuInfo && gpuError) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground">Couldn't query the GPU</p>
          <button
            type="button"
            onClick={() => refreshGpuInfo()}
            className="shrink-0 text-xs text-brand hover:underline"
          >
            Retry
          </button>
        </div>
        <p className="mt-0.5 break-words text-xs text-muted-foreground/50">{gpuError}</p>
        <p className="mt-1 text-xs text-muted-foreground/50">
          Training can still run; the VRAM guard is just unavailable.
        </p>
      </div>
    );
  }
  if (!gpuInfo) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
        <p className="text-xs text-muted-foreground/60">VRAM: querying GPU…</p>
      </div>
    );
  }
  if (!gpuInfo.available) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
        <p className="text-xs text-muted-foreground">No GPU detected, training on CPU</p>
        <p className="mt-0.5 text-xs text-muted-foreground/50">Expect significantly slower throughput</p>
      </div>
    );
  }

  const pct = Math.min(100, (estimatedMb / gpuInfo.totalMb) * 100);
  const isOOM = pct >= 90;
  const isWarn = pct >= 65 && !isOOM;
  const fmtMb = (mb: number) =>
    mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;

  return (
    <div className={cn(
      "rounded-lg border px-3 py-2.5",
      isOOM ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-muted/30",
    )}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground">{gpuInfo.unified ? "Est. memory" : "Est. VRAM"}</p>
          <InfoTip side="right">
            Conservative estimate of GPU memory needed for training at this
            config. Includes model weights, gradients, Adam optimizer states,
            and activations. Over 90% is likely to crash with out-of-memory.
            Reduce batch_size or d_model first, they have the biggest impact.
          </InfoTip>
        </div>
        <p className={cn(
          "text-xs font-mono font-semibold tabular-nums",
          isOOM ? "text-destructive" : isWarn ? "text-warning" : "text-foreground/70",
        )}>
          {fmtMb(estimatedMb)} / {fmtMb(gpuInfo.totalMb)}
        </p>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isOOM ? "bg-destructive" : isWarn ? "bg-warning" : "bg-brand",
          )}
          style={{ width: `${pct.toFixed(1)}%` }}
        />
      </div>

      <p className="mt-1 text-xs text-muted-foreground/50">{gpuInfo.name}</p>
      {gpuInfo.unified && (
        <p className="mt-0.5 text-xs text-muted-foreground/50">Shared with the rest of the computer: close other apps before a large run.</p>
      )}

      {isOOM && (
        <p className="mt-1.5 text-xs font-medium text-destructive">
          Will OOM, reduce batch_size, d_model, or context length
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const words: Record<string, string> = { idle: "Not started", running: "Training", paused: "Paused", completed: "Finished", error: "Failed" };
  const tone: Record<string, string> = { running: "text-brand", completed: "text-success", error: "text-destructive", paused: "text-warning" };
  return <span className={cn("text-xs", tone[status] ?? "text-muted-foreground")}>{words[status] ?? status}</span>;
}

function ConfigSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
        {title}
      </p>
      <div className="divide-y divide-border/50 rounded-lg border border-border overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ConfigRow({
  label,
  hint,
  help,
  children,
}: {
  label: string;
  hint?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 bg-card px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-xs font-mono font-medium text-foreground">{label}</p>
          {help && <InfoTip side="right">{help}</InfoTip>}
        </div>
        {hint && <p className="text-xs text-muted-foreground/60">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/**
 * A number with a minus and a plus beside it, in place of the browser's
 * spinner. Steps snap to `step` and stay within min and max; typing still works.
 */
function NumInput({
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  width = "w-14",
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  width?: string;
}) {
  const decimals = (String(step).split(".")[1] ?? "").length;
  const nudge = (d: number) => onChange(Number(Math.min(max, Math.max(min, value + d * step)).toFixed(decimals)));
  const button = "grid h-full w-6 place-items-center text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground disabled:pointer-events-none disabled:opacity-30";
  return (
    <span className={cn("inline-flex h-7 items-stretch overflow-hidden rounded-md bg-input/40 ring-1 ring-border focus-within:ring-2 focus-within:ring-ring/30", disabled && "opacity-50")}>
      <button type="button" tabIndex={-1} aria-label="Less" disabled={disabled || value <= min} onClick={() => nudge(-1)} className={button}>
        <Icon name="minus" size="xs" />
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn(width, "bg-transparent text-center font-mono text-xs tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none")}
      />
      <button type="button" tabIndex={-1} aria-label="More" disabled={disabled || value >= max} onClick={() => nudge(1)} className={button}>
        <Icon name="add" size="xs" />
      </button>
    </span>
  );
}

function MetricCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/6 dark:ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular-nums",
          highlight ? "text-brand" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

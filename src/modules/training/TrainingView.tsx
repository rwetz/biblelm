import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon, StopIcon, ArrowReloadHorizontalIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfoTip } from "@/components/InfoTip";
import { LossChart } from "@/components/LossChart";
import {
  useAppStore,
  type GpuInfo,
  type TrainConfig,
  type TrainMetric,
} from "@/store/appStore";
import { cn } from "@/lib/utils";

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
  const gpuInfo = useAppStore((s) => s.gpuInfo);
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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-foreground">Training</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            GPT-mini, from scratch · corpus:{" "}
            <span className="font-mono text-foreground/70">{activeCorpus}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {status === "running" ? (
            <Button size="sm" variant="destructive" onClick={handleStop} className="gap-1.5 rounded-md">
              <HugeiconsIcon icon={StopIcon} size={13} strokeWidth={2} />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant={willOOM ? "destructive" : "brand"}
              onClick={willOOM ? undefined : handleStart}
              disabled={willOOM}
              title={willOOM ? "Estimated VRAM exceeds GPU capacity — reduce parameters in the config panel" : undefined}
              className="gap-1.5 rounded-md"
            >
              <HugeiconsIcon icon={PlayIcon} size={13} strokeWidth={2} />
              {willOOM ? "Over VRAM limit" : status === "completed" ? "Retrain" : "Start Training"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Config panel */}
        <div className="flex w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              Config
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetConfig}
              disabled={status === "running"}
              title="Reset all settings to recommended defaults"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground rounded"
            >
              <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={11} strokeWidth={1.75} />
              Defaults
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-4 py-4 space-y-5">
              <ConfigSection title="Architecture">
                <ConfigRow
                  label="d_model"
                  hint="Embed dim"
                  help="The model's 'width' — how many numbers describe each character internally. Wider captures richer patterns, but trains slower and uses more memory."
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
                  help="How many characters of history the model sees when predicting the next one — its short-term memory. Longer means more context but more compute."
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
                  help="How many text snippets are studied together before each learning update. Larger batches give steadier, faster training — if the GPU has the memory."
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
                  <input
                    type="number"
                    value={config.learningRate}
                    step={0.0001}
                    min={0.00001}
                    max={0.01}
                    disabled={status === "running"}
                    onChange={(e) =>
                      updateConfig({ learningRate: parseFloat(e.target.value) })
                    }
                    className="h-7 w-24 rounded-md border border-border bg-input/40 px-2 text-right text-xs font-mono tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
                  />
                </ConfigRow>
                <ConfigRow
                  label="epochs"
                  help="How many full passes over the entire Bible to train for. More passes learn more — until the model starts memorizing instead of generalizing."
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
                  help="How often (in training steps) to pause and test the model on held-out text it isn't training on — so you can tell real learning from memorization."
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
                  {(["char", "bpe"] as const).map((t) => (
                    <div
                      key={t}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors",
                        status === "running"
                          ? "opacity-50"
                          : "hover:bg-accent",
                      )}
                    >
                      <label
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2.5",
                          status === "running"
                            ? "cursor-not-allowed"
                            : "cursor-pointer",
                        )}
                      >
                        <input
                          type="radio"
                          name="tokenizer"
                          value={t}
                          checked={config.tokenizerType === t}
                          disabled={status === "running"}
                          onChange={() => updateConfig({ tokenizerType: t })}
                          className="accent-brand"
                        />
                        <span className="text-xs font-medium">
                          {t === "char" ? "Character-level" : "BPE"}
                        </span>
                      </label>
                      <InfoTip side="right">
                        {t === "char"
                          ? "The model reads one character at a time. Tiny vocabulary (~75 symbols), dead simple, and surprisingly good at this scale — the default here."
                          : "Groups frequent character sequences into single tokens (closer to words). More efficient for big models, but more complex — not implemented yet."}
                      </InfoTip>
                    </div>
                  ))}
                </div>
              </ConfigSection>

              {/* Param count estimate */}
              <div className="rounded-lg bg-brand/6 border border-brand/15 px-3 py-2.5">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Est. parameters</p>
                  <InfoTip side="right">
                    The total count of adjustable values (weights) the model
                    learns. More parameters means more learning capacity — and
                    more to train. 3.2M is tiny by modern standards (GPT-3 has
                    175 billion).
                  </InfoTip>
                </div>
                <p className="mt-0.5 font-mono text-sm font-semibold text-brand">
                  {estimateParams(config)}
                </p>
              </div>

              {/* VRAM estimate */}
              <VramMeter estimatedMb={estimatedVramMb} gpuInfo={gpuInfo} />
            </div>
          </ScrollArea>
        </div>

        {/* Metrics panel */}
        <div className="flex min-w-0 flex-1 flex-col p-5 gap-4">
          {/* Loss chart — grows to fill the available height */}
          <div className="relative flex min-h-[200px] flex-1 rounded-xl border border-border bg-card p-4">
            <LossChart trainLoss={trainLoss} valLoss={valLoss} />
            {status === "running" && metrics.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-3 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                  Waiting for first metric…
                </div>
              </div>
            )}
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Step"
              value={currentMetric?.step.toLocaleString() ?? "—"}
            />
            <MetricCard
              label="Epoch"
              value={
                currentMetric
                  ? `${currentMetric.epoch}/${config.epochs}`
                  : "—"
              }
            />
            <MetricCard
              label="Train loss"
              value={currentMetric?.trainLoss.toFixed(4) ?? "—"}
              highlight
            />
            <MetricCard
              label="Val loss"
              value={lastVal?.toFixed(4) ?? "—"}
            />
            <MetricCard
              label="Tokens/sec"
              value={
                currentMetric
                  ? Math.round(currentMetric.tokensPerSec).toLocaleString()
                  : "—"
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
                  : "—"
              }
              highlight={trainDevice === "cuda"}
            />
          </div>

          {/* Progress bar + tokens/sec */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {status === "running" && metrics.length === 0
                  ? "Starting Python process — first batch may take a moment…"
                  : status === "running"
                  ? `Training — epoch ${currentMetric?.epoch ?? 0}/${config.epochs}`
                  : status === "completed"
                  ? "Training complete"
                  : status === "error"
                  ? "Training failed — check the error toast"
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
    </div>
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

function VramMeter({ estimatedMb, gpuInfo }: { estimatedMb: number; gpuInfo: GpuInfo | null }) {
  if (!gpuInfo) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
        <p className="text-xs text-muted-foreground/60">VRAM — querying GPU…</p>
      </div>
    );
  }
  if (!gpuInfo.available) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
        <p className="text-xs text-muted-foreground">No GPU detected — training on CPU</p>
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
          <p className="text-xs text-muted-foreground">Est. VRAM</p>
          <InfoTip side="right">
            Conservative estimate of GPU memory needed for training at this
            config. Includes model weights, gradients, Adam optimizer states,
            and activations. Over 90% is likely to crash with out-of-memory.
            Reduce batch_size or d_model first — they have the biggest impact.
          </InfoTip>
        </div>
        <p className={cn(
          "text-xs font-mono font-semibold tabular-nums",
          isOOM ? "text-destructive" : isWarn ? "text-yellow-500" : "text-foreground/70",
        )}>
          {fmtMb(estimatedMb)} / {fmtMb(gpuInfo.totalMb)}
        </p>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isOOM ? "bg-destructive" : isWarn ? "bg-yellow-500" : "bg-brand",
          )}
          style={{ width: `${pct.toFixed(1)}%` }}
        />
      </div>

      <p className="mt-1 text-xs text-muted-foreground/50">{gpuInfo.name}</p>

      {isOOM && (
        <p className="mt-1.5 text-xs font-medium text-destructive">
          Will OOM — reduce batch_size, d_model, or context length
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "outline" | "success" | "warning" | "destructive" | "brand"> = {
    idle: "outline",
    running: "brand",
    paused: "warning",
    completed: "success",
    error: "destructive",
  };
  return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
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

function NumInput({
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="h-7 w-20 rounded-md border border-border bg-input/40 px-2 text-right text-xs font-mono tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
    />
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
    <div className="rounded-lg border border-border bg-card p-3">
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

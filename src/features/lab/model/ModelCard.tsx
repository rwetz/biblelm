import { invoke, onFileDrop } from "@/lib/backend";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { InfoTip } from "@/features/lab/InfoTip";
import { useAppStore, type ModelInfo } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { Button, Icon, IN_TAURI, Input, Spinner } from "@nexis/design";

/** Extensions `biblelm.model_io` knows how to validate and install. */
const ACCEPTED = [".pt", ".pth", ".ckpt", ".onnx", ".json"];

interface ImportedFile {
  file: string;
  kind: "checkpoint" | "onnx" | "tokenizer";
  sizeBytes: number;
  params?: number;
  vocabSize?: number;
  opset?: number;
  validated?: boolean;
  note?: string;
  tokenizer?: "embedded" | "existing" | "missing";
  warning?: string;
}

interface ImportResult extends ModelInfo {
  imported: ImportedFile[];
}

const mb = (bytes?: number) => `${((bytes ?? 0) / 1_048_576).toFixed(1)} MB`;

function isAccepted(path: string) {
  const lower = path.toLowerCase();
  return ACCEPTED.some((ext) => lower.endsWith(ext));
}

/**
 * Drop-in model loader.
 *
 * Downloading the released model from GitHub and dropping `ckpt.pt` (and
 * optionally `model.onnx`) onto this card is the no-training path into the app.
 * Every file is validated by the Python side before it replaces anything, so a
 * wrong file fails here with a real message instead of at generation time.
 */
export function ModelCard() {
  const modelInfo = useAppStore((s) => s.modelInfo);
  const setModelInfo = useAppStore((s) => s.setModelInfo);

  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [manualPath, setManualPath] = useState("");
  const [lastImport, setLastImport] = useState<ImportedFile[] | null>(null);
  // Drag state lives in a ref too: the Tauri drag listener is registered once
  // and would otherwise close over a stale `importing`.
  const importingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setModelInfo(await invoke<ModelInfo>("model_status"));
    } catch (err) {
      if (IN_TAURI) console.error("model_status failed:", err);
    }
  }, [setModelInfo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const importPaths = useCallback(
    async (paths: string[]) => {
      const usable = paths.filter(isAccepted);
      const skipped = paths.length - usable.length;
      if (usable.length === 0) {
        toast.error("Nothing to import", {
          description: `Drop a .pt checkpoint, a .onnx graph, or a tokenizer.json.`,
        });
        return;
      }
      setImporting(true);
      importingRef.current = true;
      try {
        const res = await invoke<ImportResult>("model_import", { paths: usable });
        setLastImport(res.imported);
        setModelInfo(res);
        const warned = res.imported.find((f) => f.warning);
        if (warned) {
          toast.warning("Imported with a caveat", { description: warned.warning });
        } else {
          toast.success(
            `Imported ${res.imported.length} file${res.imported.length > 1 ? "s" : ""}`,
            skipped > 0
              ? { description: `${skipped} unsupported file(s) skipped.` }
              : undefined,
          );
        }
      } catch (err) {
        toast.error("Import failed", { description: String(err) });
      } finally {
        setImporting(false);
        importingRef.current = false;
      }
    },
    [setModelInfo],
  );

  // Tauri delivers OS drag-and-drop as webview events; the browser's own
  // dragover/drop never fires with real filesystem paths.
  useEffect(() => {
    const un = onFileDrop((e) => {
      if (e.type === "over") {
        setDragging(true);
      } else if (e.type === "drop") {
        setDragging(false);
        if (!importingRef.current) importPaths(e.paths ?? []);
      } else {
        setDragging(false);
      }
    });
    return () => {
      un.then((f) => f());
    };
  }, [importPaths]);

  const ready = Boolean(modelInfo?.hasCheckpoint && modelInfo?.hasTokenizer);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Model
          <InfoTip>
            Inference runs from{" "}
            <code className="font-mono">runs/current/ckpt.pt</code> plus its{" "}
            <code className="font-mono">tokenizer.json</code>. Training writes
            them, or drop in a model you downloaded instead. A checkpoint
            trained by this app carries its own vocabulary, so the single{" "}
            <code className="font-mono">.pt</code> is enough.
          </InfoTip>
        </span>
        {modelInfo && (
          <span className={cn("text-xs", ready ? "text-success" : "text-muted-foreground")}>{ready ? "Loaded" : "No model yet"}</span>
        )}
      </div>

      {/* Installed model summary */}
      {modelInfo?.hasCheckpoint && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 px-4 py-3 text-xs sm:grid-cols-4">
          <Fact label="Checkpoint" value={mb(modelInfo.checkpointBytes)} />
          <Fact
            label="Parameters"
            value={
              modelInfo.params
                ? `${(modelInfo.params / 1_000_000).toFixed(1)}M`
                : "–"
            }
          />
          <Fact label="Vocab" value={modelInfo.vocabSize?.toString() ?? "–"} />
          <Fact
            label="Val loss"
            value={modelInfo.valLoss != null ? modelInfo.valLoss.toFixed(3) : "–"}
          />
          {modelInfo.config && (
            <Fact
              label="Architecture"
              value={`${modelInfo.config.n_layers}L · ${modelInfo.config.d_model}d · ctx ${modelInfo.config.context_len}`}
              wide
            />
          )}
          {modelInfo.hasOnnx && (
            <Fact label="ONNX" value={mb(modelInfo.onnxBytes)} />
          )}
        </div>
      )}

      {modelInfo?.checkpointError && (
        <p className="flex items-start gap-2 border-t border-border/60 bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
          <Icon name="alert-circle" size="sm" className="mt-px shrink-0" />
          {modelInfo.checkpointError}
        </p>
      )}

      {modelInfo?.hasCheckpoint && !modelInfo.hasTokenizer && (
        <p className="border-t border-border/60 bg-warning/5 px-4 py-2.5 text-xs text-warning dark:text-warning">
          A checkpoint is installed but there's no tokenizer.json beside it, so
          generation can't decode. Drop the tokenizer.json that came with the
          model.
        </p>
      )}

      {/* Drop zone */}
      <div className="border-t border-border/60 p-4">
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragging
              ? "border-brand bg-brand/[0.06]"
              : "border-border bg-muted/20",
          )}
        >
          {importing ? <Spinner /> : <Icon name="upload" size="lg" className={cn("text-muted-foreground", dragging && "text-brand")} />}
          <p className="text-sm font-medium text-foreground">
            {importing
              ? "Validating and installing…"
              : dragging
                ? "Release to import"
                : "Drop a model file here"}
          </p>
          <p className="text-xs text-muted-foreground">
            <code className="rounded bg-muted px-1 font-mono">.pt</code> checkpoint
            · <code className="rounded bg-muted px-1 font-mono">.onnx</code> graph ·{" "}
            <code className="rounded bg-muted px-1 font-mono">tokenizer.json</code>
            {", or several at once"}
          </p>
        </div>

        {/* Path fallback, for when dragging isn't practical. */}
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manualPath.trim() && !importing) {
                importPaths([manualPath.trim()]);
                setManualPath("");
              }
            }}
            placeholder="…or paste a full path to a .pt / .onnx file"
            className="h-8 font-mono text-xs"
            disabled={importing}
          />
          <Button
            size="sm"
            variant="brand"
            className="h-8 shrink-0"
            disabled={importing || manualPath.trim().length === 0}
            onClick={() => {
              importPaths([manualPath.trim()]);
              setManualPath("");
            }}
          >
            Import
          </Button>
        </div>
      </div>

      {/* Last import report */}
      {lastImport && lastImport.length > 0 && (
        <div className="divide-y divide-border/50 border-t border-border/60">
          {lastImport.map((f) => (
            <div key={f.file} className="flex items-center gap-3 px-4 py-2.5">
              <Icon name={f.warning ? "alert-circle" : "success"} size="sm" className={cn(
                  "shrink-0",
                  f.warning ? "text-warning" : "text-success",
                )} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs text-foreground">{f.file}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {describeImport(f)}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{f.kind}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function describeImport(f: ImportedFile): string {
  const size = mb(f.sizeBytes);
  if (f.kind === "checkpoint") {
    const params = f.params ? `${(f.params / 1_000_000).toFixed(1)}M params` : null;
    const tok = {
      embedded: "vocabulary unpacked from the checkpoint",
      existing: "using the tokenizer.json already here",
      missing: "no tokenizer: drop tokenizer.json too",
    }[f.tokenizer ?? "existing"];
    return [size, params, tok].filter(Boolean).join(" · ");
  }
  if (f.kind === "onnx") {
    return [
      size,
      f.validated ? `graph valid, opset ${f.opset}` : f.note,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return [size, f.vocabSize ? `vocab ${f.vocabSize}` : null]
    .filter(Boolean)
    .join(" · ");
}

function Fact({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={cn(wide && "col-span-2")}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-mono text-xs tabular-nums text-foreground">{value}</p>
    </div>
  );
}

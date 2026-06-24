import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Package01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  Loading01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";

interface ExportResult {
  path: string;
  size_bytes: number;
}

type StepStatus = "pending" | "running" | "done" | "error";

interface Step {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  detail?: string;
}

export function ExportView() {
  const exportStatus = useAppStore((s) => s.exportStatus);
  const exportPath = useAppStore((s) => s.exportPath);
  const setExportStatus = useAppStore((s) => s.setExportStatus);
  const setExportPath = useAppStore((s) => s.setExportPath);

  const [steps, setSteps] = useState<Step[]>([
    {
      id: "checkpoint",
      label: "Locate checkpoint",
      description: "Find the latest .pt checkpoint in the training output",
      status: "pending",
    },
    {
      id: "convert",
      label: "Export to ONNX",
      description: "Trace the trained model into a portable ONNX graph via torch.onnx.export()",
      status: "pending",
    },
    {
      id: "validate",
      label: "Validate ONNX",
      description: "Run onnx.checker to confirm the exported graph is well-formed",
      status: "pending",
    },
  ]);

  const updateStep = (id: string, updates: Partial<Step>) =>
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );

  const handleExport = async () => {
    setExportStatus("running");
    setSteps((prev) => prev.map((s) => ({ ...s, status: "pending", detail: undefined })));

    // Step 1 — checkpoint
    updateStep("checkpoint", { status: "running" });
    try {
      const result = await invoke<ExportResult>("export_onnx");
      updateStep("checkpoint", { status: "done", detail: "checkpoint.pt found" });
      updateStep("convert", { status: "done", detail: "model.onnx written" });
      updateStep("validate", {
        status: "done",
        detail: `${(result.size_bytes / 1_048_576).toFixed(1)} MB`,
      });
      setExportPath(result.path);
      setExportStatus("completed");
    } catch (err) {
      updateStep("checkpoint", {
        status: "error",
        detail: String(err),
      });
      setExportStatus("error");
    }
  };

  const resetExport = () => {
    setSteps((prev) => prev.map((s) => ({ ...s, status: "pending", detail: undefined })));
    setExportStatus("idle");
    setExportPath(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-foreground">Export</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Convert the trained checkpoint to ONNX for Rust inference
          </p>
        </div>
        <div className="flex items-center gap-2">
          {exportStatus !== "idle" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetExport}
              disabled={exportStatus === "running"}
              className="rounded-md text-muted-foreground"
            >
              Reset
            </Button>
          )}
          <Button
            size="sm"
            variant="brand"
            onClick={handleExport}
            disabled={exportStatus === "running"}
            className="gap-1.5 rounded-md"
          >
            {exportStatus === "running" ? (
              <>
                <HugeiconsIcon icon={Loading01Icon} size={13} strokeWidth={2} className="animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Package01Icon} size={13} strokeWidth={2} />
                {exportStatus === "completed" ? "Re-export" : "Export to ONNX"}
              </>
            )}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4 max-w-2xl">
          {/* Pipeline steps */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border/60 px-4 py-2.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Export pipeline
              </p>
            </div>
            <div className="divide-y divide-border/50">
              {steps.map((step, i) => (
                <ExportStep key={step.id} step={step} index={i + 1} />
              ))}
            </div>
          </div>

          {/* Output path */}
          {exportPath && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={16}
                  strokeWidth={1.75}
                  className="text-emerald-500 shrink-0"
                />
                <p className="text-sm font-medium text-foreground">Export successful</p>
              </div>
              <p className="text-xs text-muted-foreground">Output path</p>
              <p className="font-mono text-xs bg-muted rounded-md px-3 py-2 text-foreground break-all">
                {exportPath}
              </p>
            </div>
          )}

          {/* What is ONNX */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">What is ONNX?</h3>
            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>
                <span className="font-medium text-foreground">ONNX</span> (Open
                Neural Network Exchange) is a portable, framework-neutral file
                format for neural networks. Exporting freezes the trained model —
                its layers and learned weights — into a single{" "}
                <code className="font-mono bg-muted px-1 rounded">.onnx</code> file.
              </p>
              <p>
                That one file then runs in many places{" "}
                <span className="font-medium text-foreground">
                  without PyTorch or Python
                </span>
                : ONNX Runtime (C++/C#/Java), the browser via{" "}
                <code className="font-mono bg-muted px-1 rounded">onnxruntime-web</code>,
                mobile, and more. It's how you take a model trained here and run
                it somewhere else.
              </p>
            </div>
          </div>

          {/* The pipeline */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">The pipeline</h3>
            <ol className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
              <PipeStep n={1} title="Train (PyTorch)">
                Training saves the model's weights to{" "}
                <code className="font-mono bg-muted px-1 rounded">runs/current/ckpt.pt</code>.
              </PipeStep>
              <PipeStep n={2} title="Export">
                <code className="font-mono bg-muted px-1 rounded">torch.onnx.export</code>{" "}
                traces the model into{" "}
                <code className="font-mono bg-muted px-1 rounded">model.onnx</code>{" "}
                (opset 17), with dynamic batch/sequence axes.
              </PipeStep>
              <PipeStep n={3} title="Validate">
                <code className="font-mono bg-muted px-1 rounded">onnx.checker</code>{" "}
                confirms the exported graph is structurally valid.
              </PipeStep>
              <PipeStep n={4} title="Run anywhere">
                Load{" "}
                <code className="font-mono bg-muted px-1 rounded">model.onnx</code>{" "}
                in any ONNX runtime to generate text — no training framework needed.
              </PipeStep>
            </ol>
          </div>

          {/* Note */}
          <div className="rounded-xl border border-brand/20 bg-brand/5 p-5 space-y-2">
            <p className="text-xs font-semibold text-brand uppercase tracking-wider">
              Good to know
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              BibleLM's own{" "}
              <span className="font-medium text-foreground">Inference</span> tab runs
              the PyTorch model directly, so you don't need to export to use the model
              here. ONNX export is about{" "}
              <span className="font-medium text-foreground">portability</span> — turning
              your trained model into a standalone artifact you can ship and run
              outside this app.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function PipeStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
        {n}
      </span>
      <span>
        <span className="font-medium text-foreground">{title}</span> — {children}
      </span>
    </li>
  );
}

function ExportStep({ step, index }: { step: Step; index: number }) {
  const icon = {
    pending: null,
    running: Loading01Icon,
    done: CheckmarkCircle01Icon,
    error: AlertCircleIcon,
  }[step.status];

  const stepClass = {
    pending: "border border-border text-muted-foreground/40",
    running: "bg-brand/10 text-brand",
    done: "bg-emerald-500/10 text-emerald-500",
    error: "bg-destructive/10 text-destructive",
  }[step.status];

  const textColor = {
    pending: "text-muted-foreground/40",
    running: "text-brand",
    done: "text-emerald-500",
    error: "text-destructive",
  }[step.status];

  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          stepClass,
        )}
      >
        {icon ? (
          <HugeiconsIcon
            icon={icon}
            size={14}
            strokeWidth={2}
            className={cn(step.status === "running" && "animate-spin")}
          />
        ) : (
          <span>{index}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{step.label}</p>
        <p className="text-xs text-muted-foreground">{step.description}</p>
        {step.detail && (
          <p className={cn("text-xs font-mono mt-0.5", textColor)}>{step.detail}</p>
        )}
      </div>

      <Badge
        variant={
          step.status === "done"
            ? "success"
            : step.status === "error"
            ? "destructive"
            : step.status === "running"
            ? "brand"
            : "outline"
        }
      >
        {step.status}
      </Badge>
    </div>
  );
}

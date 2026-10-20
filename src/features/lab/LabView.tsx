import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle, Icon, IN_TAURI, Segmented } from "@nexis/design";
import { CornerPlate, DitherHero, useHeroes, usePagePlate } from "@/art/Art";
import { PAGE_PLATES } from "@/lib/art";
import { LAB_NEEDS_DESKTOP } from "@/lib/backend";
import { CorpusView } from "./corpus/CorpusView";
import { TrainingView } from "./training/TrainingView";
import { InferenceView } from "./inference/InferenceView";
import { ModelView } from "./model/ModelView";
import { InsideView } from "./inside/InsideView";

type Tab = "corpus" | "train" | "generate" | "model" | "inside";

export function LabView() {
  const [tab, setTab] = useState<Tab>("corpus");
  const heroes = useHeroes();
  const babel = useMemo(() => heroes.find((h) => h.plate === "dore-010"), [heroes]);
  const plate = usePagePlate(tab === "train" ? PAGE_PLATES.training : tab === "model" ? PAGE_PLATES.model : undefined);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DitherHero hero={babel} height="11rem" className="shrink-0">
        <div className="mt-auto flex items-end gap-4 px-8 pb-4">
          <div>
            <h1 className="font-blackletter text-4xl">The Lab</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              A small language model trained from scratch on Scripture, and the tools to watch it learn. A study of the machine, not a voice for the text.
            </p>
          </div>
          <span className="flex-1" />
          <Segmented
            label="Lab"
            value={tab}
            onChange={setTab}
            segments={[
              { id: "corpus", label: "Corpus", icon: "document" },
              { id: "train", label: "Training", icon: "cpu" },
              { id: "generate", label: "Generate", icon: "chat" },
              { id: "model", label: "Model", icon: "archive" },
              { id: "inside", label: "Inside", icon: "brain" },
            ]}
          />
        </div>
      </DitherHero>
      {!IN_TAURI && (
        <Alert className="mx-8 mb-3 w-auto">
          <Icon name="info" />
          <AlertTitle>Desktop only</AlertTitle>
          <AlertDescription>{LAB_NEEDS_DESKTOP}</AlertDescription>
        </Alert>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col border-t border-border/60">
        <CornerPlate plate={plate} corner="br" />
        {tab === "corpus" && <CorpusView />}
        {tab === "train" && <TrainingView />}
        {tab === "generate" && (
          <>
            <p className="border-b border-border/60 bg-muted/40 px-8 py-2 text-xs text-muted-foreground">
              Generated text comes from BibleLM's own 3-million-parameter model. It imitates the sound of the King James Version and is not Scripture.
            </p>
            <InferenceView />
          </>
        )}
        {tab === "model" && <ModelView />}
        {tab === "inside" && <InsideView />}
      </div>
    </div>
  );
}

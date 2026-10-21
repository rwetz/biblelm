import { useState } from "react";
import { Alert, AlertDescription, AlertTitle, cn, Icon, IN_TAURI, Segmented } from "@nexis/design";
import { Dither, DitherHero, useRotatingHero } from "@/art/Art";
import { heroUrl, type Hero } from "@/lib/art";
import { useStudy } from "@/store/study";
import { LAB_NEEDS_DESKTOP } from "@/lib/backend";
import { LAB_COLUMN } from "./LabSection";
import { CorpusView } from "./corpus/CorpusView";
import { TrainingView } from "./training/TrainingView";
import { InferenceView } from "./inference/InferenceView";
import { ModelView } from "./model/ModelView";
import { InsideView } from "./inside/InsideView";

type Tab = "corpus" | "train" | "generate" | "model" | "inside";

const LEDE = "A small language model trained from scratch on Scripture, and the tools to watch it learn. A study of the machine, not a voice for the text.";

/**
 * The Lab's front page: the whole plate, never cropped, as tall as the window
 * allows beside the title, so the tabs sit at the foot of the first screen.
 */
function Frontispiece({ hero }: { hero?: Hero }) {
  const mode = useStudy((s) => s.illustrations);
  const show = hero && mode === "full";
  return (
    <div className={cn(LAB_COLUMN, "grid shrink-0 items-end gap-x-10 gap-y-6 pt-6 md:grid-cols-[minmax(20rem,1fr)_minmax(0,auto)]")}>
      <div className="pb-8">
        <h1 className="whitespace-nowrap font-blackletter text-7xl leading-none">The Lab</h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">{LEDE}</p>
        {show && (
          <p className="mt-6 font-garamond text-sm italic text-muted-foreground/80">
            {hero.title}
            {hero.work ? `, from ${hero.work}` : ""}, after Gustave Doré
          </p>
        )}
      </div>
      {show && (
        // Window height less the title bar, tabs and status bar.
        <div className="relative max-w-full justify-self-end" style={{ height: "min(calc(100vh - 9.5rem), 72rem)", aspectRatio: `${hero.width} / ${hero.height}` }}>
          <Dither
            key={hero.id}
            src={heroUrl(hero)}
            algo={hero.algo === "bayer" ? "bayer" : "atkinson"}
            label={`${hero.title}, after Gustave Doré`}
            edges={{ top: 0.04, right: 0.04, bottom: 0.14, left: 0.1 }}
            className="absolute inset-0 text-foreground opacity-90 dark:opacity-85"
          />
        </div>
      )}
    </div>
  );
}

export function LabView() {
  const [tab, setTab] = useState<Tab>("corpus");
  // Doré's Milton and Coleridge, turning every half minute. The Corpus tab is
  // the Lab's front page and shows the picture whole; the working tabs keep a
  // band of it so the tools have the room. Switching swaps one for the other
  // and the new one gathers dot by dot, rather than animating a height.
  const hero = useRotatingHero(30_000);
  const home = tab === "corpus";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {home ? (
        <Frontispiece hero={hero} />
      ) : (
        <DitherHero hero={hero} height="10.5rem" focusY={hero?.focusY ?? 40} clearLeft fadeFrom={50}>
          <div className={cn(LAB_COLUMN, "mt-auto pb-5")}>
            <h1 className="font-blackletter text-5xl leading-none">The Lab</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{LEDE}</p>
          </div>
        </DitherHero>
      )}
      {/* The picture scrolls away; the tabs stay. */}
      <div className="sticky top-0 z-30 shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className={cn(LAB_COLUMN, "py-2")}>
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
      </div>
      <div className="flex flex-1 flex-col">
        {!IN_TAURI && (
          <div className={cn(LAB_COLUMN, "pt-6")}>
            <Alert>
              <Icon name="info" />
              <AlertTitle>Desktop only</AlertTitle>
              <AlertDescription>{LAB_NEEDS_DESKTOP}</AlertDescription>
            </Alert>
          </div>
        )}
        {tab === "corpus" && <CorpusView />}
        {tab === "train" && <TrainingView />}
        {tab === "generate" && <InferenceView />}
        {tab === "model" && <ModelView />}
        {tab === "inside" && <InsideView />}
      </div>
    </div>
  );
}

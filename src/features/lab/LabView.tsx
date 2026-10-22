import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle, cn, Icon, IN_TAURI } from "@nexis/design";
import { Dither, DitherHero, useRotatingHero } from "@/art/Art";
import { RoseMark } from "@/art/RoseMark";
import { heroUrl, type Hero } from "@/lib/art";
import { useStudy } from "@/store/study";
import { LAB_NEEDS_DESKTOP } from "@/lib/backend";
import { LAB_COLUMN } from "./LabSection";
import { CorpusView } from "./corpus/CorpusView";
import { TrainingView } from "./training/TrainingView";
import { InferenceView } from "./inference/InferenceView";
import { ModelView } from "./model/ModelView";
import { InsideView } from "./inside/InsideView";
import { LessonsView } from "./lessons/LessonsView";
import { Sections, type Section } from "@/app/Sections";

type Tab = "corpus" | "train" | "generate" | "model" | "inside" | "lessons";

const LEDE = "A small language model trained from scratch on Scripture, and the tools to watch it learn. A study of the machine, not a voice for the text.";

/** The six rooms of the Lab, as a book's contents: numeral, name, what happens there. */
const ROOMS: Section<Tab>[] = [
  { id: "corpus", name: "Corpus", gist: "the text it reads", mark: "quill" },
  { id: "train", name: "Training", gist: "teaching it to write", mark: "ophan" },
  { id: "generate", name: "Generate", gist: "what it writes back", mark: "seraph" },
  { id: "model", name: "Model", gist: "the weights you carry", mark: "urn" },
  { id: "inside", name: "Inside", gist: "attention and surprise", mark: "winged-eye" },
  { id: "lessons", name: "Lessons", gist: "what it teaches", mark: "sun" },
];

/**
 * The Lab's front page: a large title and the dithered rose on a row of their
 * own, then the plate filling the wider column and, beside it, the corpus the
 * model is made of: the translations and the whole alphabet. The picture takes its width from its column
 * (never its own height), so the page cannot grow wider than the window.
 */
function Frontispiece({ hero }: { hero?: Hero }) {
  const mode = useStudy((s) => s.illustrations);
  const show = hero && mode === "full";
  return (
    <div className="mx-auto grid w-full max-w-[100rem] shrink-0 gap-x-14 gap-y-8 px-8 pb-10 pt-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      {/* The title has a row of its own, over both columns, so the picture never runs under it. */}
      <div className="col-span-full flex min-w-0 items-center gap-6 pt-2">
        <RoseMark label="BibleLM" dot={2} className="size-28 shrink-0 md:size-36" />
        <h1 className="min-w-0 font-blackletter text-[clamp(3.5rem,8vw,8.5rem)] leading-[1.05]">The Lab</h1>
      </div>
      <div className="flex min-w-0 flex-col gap-8">
        <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">{LEDE}</p>
        {/* What the model is made of: the translation it reads and its whole alphabet. */}
        <CorpusView front />
        {show && (
          <p className="font-garamond text-sm italic text-muted-foreground/80">
            {hero.title}
            {hero.work ? `, from ${hero.work}` : ""}, after Gustave Doré
          </p>
        )}
      </div>
      {show && (
        // As wide as its column; no taller than the window less the title bar, contents and status bar.
        <div className="relative w-full min-w-0" style={{ aspectRatio: `${hero.width} / ${hero.height}`, maxHeight: "max(28rem, calc(100vh - 12rem))" }}>
          <Dither
            key={hero.id}
            src={heroUrl(hero)}
            algo={hero.algo === "bayer" ? "bayer" : hero.algo === "blue" ? "blue" : "atkinson"}
            label={`${hero.title}, after Gustave Doré`}
            edges={{ top: 0.04, right: 0.04, bottom: 0.12, left: 0.08 }}
            className="absolute inset-0 text-foreground opacity-90 dark:opacity-85"
          />
        </div>
      )}
    </div>
  );
}

export function LabView() {
  const [tab, setTab] = useState<Tab>("corpus");
  // The command palette opens a room directly.
  useEffect(() => {
    const open = (e: Event) => setTab((e as CustomEvent<Tab>).detail);
    window.addEventListener("biblelm:lab-tab", open);
    return () => window.removeEventListener("biblelm:lab-tab", open);
  }, []);
  // Doré's Milton and Coleridge, turning every half minute. The Corpus tab is
  // the Lab's front page and shows the picture whole; the working tabs keep a
  // band of it so the tools have the room. Switching swaps one for the other
  // and the new one gathers dot by dot, rather than animating a height.
  const hero = useRotatingHero(30_000);
  const home = tab === "corpus";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
      {home ? (
        <Frontispiece hero={hero} />
      ) : (
        <DitherHero hero={hero} height="10.5rem" focusY={hero?.focusY ?? 40} clearLeft fadeFrom={50}>
          <div className={cn(LAB_COLUMN, "mt-auto pb-5")}>
            <h1 className="flex items-center gap-3 font-blackletter text-6xl leading-none"><RoseMark dot={2} className="size-14" />The Lab</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{LEDE}</p>
          </div>
        </DitherHero>
      )}
      {/* The picture scrolls away; the tabs stay. */}
      <div className="sticky top-0 z-30 shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className={cn(LAB_COLUMN, "py-2")}>
          <Sections label="Lab" sections={ROOMS} value={tab} onChange={setTab} />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        {!IN_TAURI && tab !== "lessons" && (
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
        {tab === "lessons" && <LessonsView />}
      </div>
    </div>
  );
}

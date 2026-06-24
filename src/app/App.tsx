import { ThemeProvider } from "@/modules/theme/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/modules/header/Header";
import { Nav } from "@/modules/nav/Nav";
import { CorpusView } from "@/modules/corpus/CorpusView";
import { TrainingView } from "@/modules/training/TrainingView";
import { InferenceView } from "@/modules/inference/InferenceView";
import { AskView } from "@/modules/ask/AskView";
import { ExportView } from "@/modules/export/ExportView";
import { useAppStore, type View } from "@/store/appStore";

const VIEWS: Record<View, React.ReactNode> = {
  corpus: <CorpusView />,
  train: <TrainingView />,
  inference: <InferenceView />,
  ask: <AskView />,
  export: <ExportView />,
};

function ActiveView() {
  const activeView = useAppStore((s) => s.activeView);
  return <>{VIEWS[activeView]}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-full flex-col">
          <Header />
          <div className="flex min-h-0 flex-1">
            <Nav />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
              <ActiveView />
            </main>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

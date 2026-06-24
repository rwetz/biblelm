import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { WindowControls } from "@/components/WindowControls";
import { IS_MAC, USE_CUSTOM_WINDOW_CONTROLS } from "@/lib/platform";
import { useTheme } from "@/modules/theme/ThemeProvider";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";

const VIEW_LABELS: Record<string, string> = {
  corpus: "Corpus",
  train: "Training",
  inference: "Inference",
  export: "Export",
};

export function Header() {
  const activeView = useAppStore((s) => s.activeView);
  const { resolvedMode, setMode, mode } = useTheme();

  const toggleTheme = () =>
    setMode(resolvedMode === "dark" ? "light" : "dark");

  return (
    <div
      data-tauri-drag-region
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 border-b border-border/60 bg-card select-none",
        IS_MAC ? "pl-20 pr-2" : "pl-3 pr-0",
      )}
    >
      {/* Logo + app name */}
      <div className="flex items-center gap-2 shrink-0">
        <HeptagramLogo className="size-5 text-brand" />
        <span className="text-sm font-semibold tracking-tight text-foreground">
          BibleLM
        </span>
      </div>

      {/* Drag spacer + view title */}
      <div
        data-tauri-drag-region
        className="flex min-w-0 flex-1 items-center gap-2 pl-3"
      >
        <span className="text-xs text-muted-foreground/60 font-medium">
          {VIEW_LABELS[activeView]}
        </span>
        <div data-tauri-drag-region className="h-full min-w-2 flex-1" />
      </div>

      {/* Right side controls */}
      <button
        type="button"
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={mode === "dark" ? "Light mode" : "Dark mode"}
        onClick={toggleTheme}
        className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <HugeiconsIcon
          icon={resolvedMode === "dark" ? Sun01Icon : Moon02Icon}
          size={14}
          strokeWidth={1.75}
        />
      </button>

      {USE_CUSTOM_WINDOW_CONTROLS && (
        <>
          <span className="ml-1 h-5 w-px shrink-0 bg-border" />
          <WindowControls />
        </>
      )}
    </div>
  );
}

function HeptagramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" />
      <polygon
        points="50,12 87.1,58.5 33.5,84.2 20.3,26.3 79.7,26.3 66.5,84.2 12.9,58.5"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

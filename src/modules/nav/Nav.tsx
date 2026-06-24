import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon,
  AiChipIcon,
  BubbleChatIcon,
  Package01Icon,
} from "@hugeicons/core-free-icons";
import type { ComponentProps } from "react";
import { useAppStore, type View } from "@/store/appStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type HugeIcon = ComponentProps<typeof HugeiconsIcon>["icon"];

interface NavItem {
  view: View;
  label: string;
  icon: HugeIcon;
}

const NAV_ITEMS: NavItem[] = [
  { view: "corpus", label: "Corpus", icon: BookOpen01Icon },
  { view: "train", label: "Training", icon: AiChipIcon },
  { view: "inference", label: "Inference", icon: BubbleChatIcon },
  { view: "export", label: "Export", icon: Package01Icon },
];

export function Nav() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <nav className="flex w-14 shrink-0 flex-col items-center border-r border-border/60 bg-sidebar py-3 gap-1">
      {NAV_ITEMS.map(({ view, label, icon }) => {
        const isActive = activeView === view;
        return (
          <Tooltip key={view}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setActiveView(view)}
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-md transition-colors",
                  isActive
                    ? "bg-brand/12 text-brand"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand" />
                )}
                <HugeiconsIcon icon={icon} size={18} strokeWidth={isActive ? 2 : 1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Side = "top" | "right" | "bottom" | "left";

/**
 * A small "ⓘ" hint icon with a plain-English explanation on hover — meant to
 * make the ML knobs legible to someone with zero background.
 */
export function InfoTip({
  children,
  side = "top",
}: {
  children: ReactNode;
  side?: Side;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          aria-label="What's this?"
          className="inline-flex shrink-0 text-muted-foreground/40 transition-colors hover:text-brand"
        >
          <HugeiconsIcon icon={InformationCircleIcon} size={13} strokeWidth={2} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-[260px] font-sans text-xs font-normal leading-relaxed"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

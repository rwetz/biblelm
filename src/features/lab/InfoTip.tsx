import type { ReactNode } from "react";
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from "@nexis/design";

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
          <Icon name="info" size="sm" />
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

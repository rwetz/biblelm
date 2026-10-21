// The frame every Lab tab shares: one centred column (so a maximised window
// does not stretch a form across 2,000 pixels) and a quiet section head in
// the reading face instead of a toolbar of small caps.

import { cn } from "@nexis/design";

/** The Lab's column: the same width as the hero's title row above it. */
export const LAB_COLUMN = "mx-auto w-full max-w-6xl px-8";

export function LabSection({
  title,
  lede,
  actions,
  className,
  children,
}: {
  title: string;
  lede: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(LAB_COLUMN, "pt-8 pb-12", className)}>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="max-w-2xl">
          <h2 className="font-garamond text-[1.75rem] leading-tight text-foreground">{title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{lede}</p>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

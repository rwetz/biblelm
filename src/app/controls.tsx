// The app's own small controls, so every search box and every dropdown looks
// and moves alike. A SearchField has no glow ring when focused: a line of ink
// dots under it drifts while you type (the same cue as the command palette,
// .search-field in styles.css). A Choice is a Radix select dressed to match,
// in place of the browser's native dropdown.

import type { ComponentProps, ReactNode, Ref } from "react";
import { Icon, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from "@nexis/design";

export function SearchField({
  className,
  inputClassName,
  ref,
  icon = true,
  size = "md",
  end,
  ...props
}: Omit<ComponentProps<"input">, "size"> & {
  /** On the wrapper: width and placement. */
  className?: string;
  inputClassName?: string;
  ref?: Ref<HTMLInputElement>;
  icon?: boolean;
  size?: "sm" | "md" | "lg";
  /** Something at the end of the box (a button, a count). */
  end?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "search-field relative flex items-center gap-2 rounded-xl bg-muted/55 px-3 transition-colors focus-within:bg-muted/80 hover:bg-muted/70",
        size === "sm" ? "h-8" : size === "lg" ? "h-12" : "h-10",
        className,
      )}
    >
      {icon && <Icon name="search" size={size === "lg" ? "md" : "sm"} className="shrink-0 text-muted-foreground" />}
      <input
        ref={ref}
        type="text"
        {...props}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/80",
          size === "sm" ? "text-[13px]" : size === "lg" ? "text-base" : "text-sm",
          inputClassName,
        )}
      />
      {end}
    </div>
  );
}

export type ChoiceOption = { value: string; label: string };

export function Choice({
  value,
  onChange,
  options,
  label,
  placeholder,
  className,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  options: ChoiceOption[];
  /** Accessible name. */
  label: string;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  // Radix reserves "" for "nothing chosen"; map it to a sentinel and back.
  const EMPTY = "__none__";
  return (
    <Select value={value || EMPTY} onValueChange={(v) => onChange(v === EMPTY ? "" : v)}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "rounded-xl border-none bg-muted/55 shadow-none transition-colors hover:bg-muted/70 focus-visible:ring-0 data-[state=open]:bg-muted/80",
          size === "sm" ? "h-8 text-[13px]" : "h-10 text-sm",
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-80 rounded-xl">
        {options.map((o) => (
          <SelectItem key={o.value || EMPTY} value={o.value || EMPTY} className="rounded-lg">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

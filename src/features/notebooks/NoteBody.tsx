// A note's body: its Markdown drawn as it reads, and the plain text to edit
// once you click it (or tab to it). Leaving the box draws it again.

import { useState } from "react";
import { Textarea, cn } from "@nexis/design";
import { Markdown } from "@/lib/markdown";
import type { Ref } from "@/lib/canon";

export function NoteBody({ value, onChange, onRef, className, editClassName }: { value: string; onChange: (v: string) => void; onRef?: (r: Ref) => void; className?: string; editClassName?: string }) {
  const [editing, setEditing] = useState(false);
  if (editing || !value.trim())
    return <Textarea autoFocus={editing} value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => setEditing(false)} className={editClassName} />;
  return (
    <div
      role="button"
      tabIndex={0}
      title="Click to edit"
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      className={cn("cursor-text rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40", className)}
    >
      <Markdown text={value} onRef={onRef} />
    </div>
  );
}

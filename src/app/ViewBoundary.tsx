// A page that throws while rendering shows what went wrong and a way back,
// instead of taking the whole window down with it.

import { Component, type ReactNode } from "react";
import { Button } from "@nexis/design";
import { ArtSpot, usePagePlate } from "@/art/Art";
import { PAGE_PLATES } from "@/lib/art";

/** The one place the demonic is playful: a small Dürer dragon (ART.md). */
function Dragon({ children }: { children: ReactNode }) {
  const plate = usePagePlate(PAGE_PLATES.error);
  return (
    <ArtSpot plate={plate} title={<span className="text-3xl">This page stumbled</span>}>
      {children}
    </ArtSpot>
  );
}

export class ViewBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("view crashed:", error);
  }

  componentDidUpdate(prev: { resetKey: string }) {
    // Moving to another page clears the error.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid flex-1 place-items-center p-8">
        <Dragon>
          <p className="mt-2 text-sm text-muted-foreground">Your notes are safe. Reloading usually fixes it.</p>
          <p className="mt-3 break-words font-mono text-xs text-muted-foreground/80">{this.state.error.message}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="brand" onClick={() => location.reload()}>Reload</Button>
            <Button variant="ghost" onClick={() => this.setState({ error: null })}>Try again</Button>
          </div>
        </Dragon>
      </div>
    );
  }
}

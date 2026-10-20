import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { domAnimation, LazyMotion } from "motion/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, TooltipProvider } from "@nexis/design";
import App from "@/app/App";
import { SCRIPTORIUM_ID, scriptorium } from "@/app/theme";

// The study pages fetch static data from /data; serve nothing so they take
// their "data not built" paths, which must render rather than crash.
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount() {
  return render(
    <LazyMotion features={domAnimation} strict>
      <ThemeProvider storageKey="biblelm-test" defaultThemeId={SCRIPTORIUM_ID} customThemes={[scriptorium]}>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </LazyMotion>,
  );
}

const PAGES = ["Home", "Read", "Search", "Topics", "Notebooks", "Lab", "Settings"];

describe("App", () => {
  it("renders the shell", async () => {
    await act(async () => {
      mount();
    });
    expect(screen.getByRole("navigation", { name: "BibleLM" })).toBeTruthy();
  });

  it.each(PAGES)("opens %s without crashing", async (label) => {
    await act(async () => {
      mount();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}`) }));
    });
    expect(screen.getByRole("navigation", { name: "BibleLM" })).toBeTruthy();
  });
});

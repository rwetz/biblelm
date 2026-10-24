// The end-to-end walk of docs/evals/e2e-2026-10-23.md, over the real built
// data: every page opens on its own content, a reference search finds its
// verse, and nothing logs an error on the way. Skipped until `pnpm data` has
// built public/data (CI builds the Bible data first).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { domAnimation, LazyMotion } from "motion/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, TooltipProvider } from "@nexis/design";
import App from "@/app/App";
import { SCRIPTORIUM_ID, scriptorium } from "@/app/theme";
import { useStudy } from "@/store/study";

const PUBLIC = join(process.cwd(), "public");
const HAVE = existsSync(join(PUBLIC, "data", "translations.json"));
const STUDY = { places: existsSync(join(PUBLIC, "data", "places.json")), lectionary: existsSync(join(PUBLIC, "data", "lectionary.json")) };

/**
 * What jsdom lacks and the pages use: a 2D context whose every call is a
 * no-op (so the dithered art runs), Path2D, and scrolling.
 */
function stubBrowser() {
  Element.prototype.scrollTo ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === "getImageData" || prop === "createImageData")
        return (_x: number, _y?: number, w = 1, h = 1) => ({ data: new Uint8ClampedArray(Math.max(1, w * h) * 4), width: w, height: h });
      if (prop === "measureText") return () => ({ width: 8 });
      if (prop === "createLinearGradient" || prop === "createRadialGradient" || prop === "createPattern") return () => ({ addColorStop() {} });
      return () => {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ctx as unknown as CanvasRenderingContext2D);
  vi.stubGlobal(
    "Path2D",
    class {
      addPath() {}
      moveTo() {}
      lineTo() {}
      arc() {}
      rect() {}
      closePath() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
    },
  );
}

let errors: string[] = [];
/** Errors other than the test setup's own "no backend in tests" for Tauri commands. */
const unexpected = () => errors.filter((e) => !e.includes("no backend in tests"));
beforeEach(() => {
  stubBrowser();
  // Serve /data and /art from disk, as Vite does in `pnpm dev`.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const path = decodeURIComponent(new URL(String(input), "http://localhost/").pathname);
      const file = join(PUBLIC, path);
      return existsSync(file) ? new Response(readFileSync(file)) : new Response("not found", { status: 404 });
    }),
  );
  errors = [];
  vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => void errors.push(a.map((x) => (x instanceof Error ? `${x.message} ${x.stack?.split("\n")[1] ?? ""}` : String(x))).join(" ")));
  useStudy.setState({ welcomed: true, page: "home", location: { book: "Gen", chapter: 1, verse: 0 }, selected: null, selection: [] });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

/** Click a page in the sidebar (Home has a Search button of its own). */
const go = (label: string) =>
  act(async () => void fireEvent.click(within(screen.getByRole("navigation", { name: "BibleLM" })).getByRole("button", { name: new RegExp(`^${label}`) })));
const WAIT = { timeout: 15_000 };
/** Text as read, across the spans a drop cap or red letter splits it into. */
const shows = (text: string) => waitFor(() => expect(document.querySelector("main")?.textContent).toContain(text), WAIT);

describe.skipIf(!HAVE)("the walk, over the built data", () => {
  it("opens every page on its own content", async () => {
    await act(async () => void mount());
    expect(await screen.findByText(/verse of the day/i, undefined, WAIT)).toBeTruthy();

    await go("Read");
    await shows("God created the heaven and the earth");

    await go("Topics");
    expect(await screen.findByPlaceholderText(/Search 6,712 topics/, undefined, WAIT)).toBeTruthy();

    // CI builds only the Bible data; the Atlas and the Office need `pnpm data:study`.
    await go("Atlas");
    if (STUDY.places) expect((await screen.findAllByText("Jerusalem", undefined, WAIT)).length).toBeGreaterThan(0);

    await go("Daily");
    if (STUDY.lectionary) expect(await screen.findByText(/The Daily Office/, undefined, WAIT)).toBeTruthy();

    await go("Lab");
    // The test setup plays a Tauri with no backend, so the Lab says where its translations live.
    await shows("The Lab's translations live in the desktop app.");

    await go("Settings");
    expect(await screen.findByText("Pseudepigrapha", undefined, WAIT)).toBeTruthy();

    expect(unexpected()).toEqual([]);
  }, 60_000);

  it("finds a verse by reference", async () => {
    await act(async () => void mount());
    await go("Search");
    const box = await screen.findByPlaceholderText(/John 3:16/, undefined, WAIT);
    await act(async () => {
      fireEvent.change(box, { target: { value: "jn 3:16" } });
      fireEvent.submit(box.closest("form")!);
    });
    await shows("For God so loved the world");
    expect(unexpected()).toEqual([]);
  }, 60_000);
});

// ╔══════════════════════════════════════╗
// ║  Ryan Wetzstein                      ║
// ║  Biblelm                             ║
// ║  2026                                ║
// ╚══════════════════════════════════════╝
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { loadTranslation, type Translation } from "./bible";
import { useTranslation } from "./hooks";

vi.mock("./bible", () => ({ loadTranslation: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it("hides old text immediately and ignores an older translation that finishes late", async () => {
  const pending = new Map<string, (t: Translation) => void>();
  vi.mocked(loadTranslation).mockImplementation((id) => new Promise((resolve) => { pending.set(id, resolve); }));
  const renders: (Translation | null)[] = [];
  const { result, rerender } = renderHook(({ id }) => {
    const state = useTranslation(id);
    renders.push(state[0]);
    return state;
  }, { initialProps: { id: "kjv" } });
  const kjv = { meta: { id: "kjv" } } as Translation;
  await act(async () => pending.get("kjv")!(kjv));
  expect(result.current[0]).toBe(kjv);
  renders.length = 0;
  rerender({ id: "web" });
  expect(renders.every((t) => t === null)).toBe(true);
  rerender({ id: "asv" });
  await act(async () => pending.get("web")!({ meta: { id: "web" } } as Translation));
  expect(result.current[0]).toBeNull();
  const asv = { meta: { id: "asv" } } as Translation;
  await act(async () => pending.get("asv")!(asv));
  await waitFor(() => expect(result.current[0]).toBe(asv));
});

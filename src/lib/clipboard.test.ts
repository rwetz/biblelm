// ╔══════════════════════════════════════╗
// ║  Ryan Wetzstein                      ║
// ║  Biblelm                             ║
// ║  2026                                ║
// ╚══════════════════════════════════════╝
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "@nexis/design";
import { copyText } from "./clipboard";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("copyText", () => {
  it("waits for the clipboard before announcing success", async () => {
    let finish!: () => void;
    const writeText = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const success = vi.spyOn(toast, "success").mockImplementation(() => "copied");
    const pending = copyText("John 3:16");
    expect(success).not.toHaveBeenCalled();
    finish();
    expect(await pending).toBe(true);
    expect(writeText).toHaveBeenCalledWith("John 3:16");
    expect(success).toHaveBeenCalledOnce();
  });

  it.each([undefined, { writeText: () => Promise.reject(new Error("denied")) }])("reports unavailable or denied clipboard access", async (clipboard) => {
    vi.stubGlobal("navigator", { clipboard });
    const success = vi.spyOn(toast, "success").mockImplementation(() => "copied");
    const error = vi.spyOn(toast, "error").mockImplementation(() => "failed");
    expect(await copyText("text")).toBe(false);
    expect(success).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledOnce();
  });
});

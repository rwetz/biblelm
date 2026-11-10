// ╔══════════════════════════════════════╗
// ║  Ryan Wetzstein                      ║
// ║  Biblelm                             ║
// ║  2026                                ║
// ╚══════════════════════════════════════╝
import { toast } from "@nexis/design";

/** Report success only after the browser has actually written the text. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
    return true;
  } catch {
    toast.error("Could not copy. Try selecting the text and copying it manually.");
    return false;
  }
}

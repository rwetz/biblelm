// Saving the battery: on battery power or in Low Power Mode (or always, in
// Settings) the art holds still as it does for reduced motion, and glass
// loses its blur (`data-saver` on <html>, styles.css). The power source is
// asked of the desktop app once a minute (backend.onBattery).

import { useSyncExternalStore } from "react";
import { useReducedMotion } from "@nexis/design";
import { backend } from "./backend";

export type SaverMode = "auto" | "on" | "off";

let mode: SaverMode = "auto";
let onBattery = false;
let saving = false;
const subscribers = new Set<() => void>();

function apply() {
  const next = mode === "on" || (mode === "auto" && onBattery);
  if (next === saving) return;
  saving = next;
  document.documentElement.toggleAttribute("data-saver", saving);
  subscribers.forEach((f) => f());
}

export function setSaverMode(m: SaverMode) {
  mode = m;
  apply();
}

let watching = false;
/** Start asking for the power source (once per app). */
export function watchPower() {
  if (watching) return;
  watching = true;
  const check = async () => {
    onBattery = (await backend.onBattery().catch(() => null)) ?? false;
    apply();
  };
  check();
  setInterval(check, 60_000);
}

function subscribe(f: () => void) {
  subscribers.add(f);
  return () => subscribers.delete(f);
}

export function useSaving(): boolean {
  return useSyncExternalStore(subscribe, () => saving, () => false);
}

/** Hold the art still: the system asks for reduced motion, or the battery is being saved. */
export function useStill(): boolean {
  const reduced = useReducedMotion();
  return !!reduced || useSaving();
}

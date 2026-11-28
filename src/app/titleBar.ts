// The macOS traffic lights, centred on BibleLM's title bar (a nexis-design
// finding from Nexis, APP-FINDINGS on docs/nexis-app-findings, #1 and #2).
//
// The window uses the overlay title bar, so macOS leaves the native buttons
// where a stock 28pt bar would have them, high on our taller one. Our bar is
// in rem and grows with the interface size, so its height is measured and
// the buttons are re-centred on it whenever it changes. In native fullscreen
// macOS hides the buttons, so the inset goes too, and a double-click on the
// bar leaves fullscreen (where it would otherwise do nothing).

import { useEffect, useState } from "react";
import { IN_TAURI, IS_MAC } from "@nexis/design";
import { leaveFullscreen, placeTrafficLights, watchFullscreen } from "@/lib/backend";

/** The close button's left edge, in points. */
export const TRAFFIC_LIGHT_X = 14;

/**
 * Room kept clear at the bar's left, in CSS px (points): the three buttons
 * end about 76pt in, plus a 12pt gap. In px, not rem: the native buttons do
 * not grow with the interface size. App.tsx spells it `pl-[88px]` for Tailwind.
 */
export const TRAFFIC_LIGHT_INSET = 88;

/** The buttons' vertical centre for a bar `height` points tall. */
export function trafficLightY(height: number): number {
  return Math.round(height / 2);
}

/**
 * Keeps the traffic lights centred on the title bar (found by its
 * `data-slot`) and says whether the bar must leave room for them.
 */
export function useTrafficLights(): boolean {
  const mac = IN_TAURI && IS_MAC;
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!mac) return;
    let live = true;
    let unlisten: (() => void) | undefined;
    watchFullscreen((fs) => live && setFullscreen(fs)).then((un) => (live ? (unlisten = un) : un()), () => {});
    return () => {
      live = false;
      unlisten?.();
    };
  }, [mac]);

  useEffect(() => {
    if (!mac) return;
    const bar = document.querySelector<HTMLElement>('[data-slot="title-bar"]');
    if (!bar) return;
    let last = 0;
    const centre = () => {
      const h = bar.offsetHeight;
      if (h && h !== last) {
        last = h;
        void placeTrafficLights(TRAFFIC_LIGHT_X, trafficLightY(h)).catch(() => {});
      }
    };
    centre();
    const ro = new ResizeObserver(centre);
    ro.observe(bar);
    // Only a double-click on the bar itself, not on a button inside it.
    const dbl = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.hasAttribute?.("data-tauri-drag-region")) void leaveFullscreen().catch(() => {});
    };
    bar.addEventListener("dblclick", dbl);
    return () => {
      ro.disconnect();
      bar.removeEventListener("dblclick", dbl);
    };
  }, [mac]);

  return mac && !fullscreen;
}

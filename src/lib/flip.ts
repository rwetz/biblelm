// Items that change order slide to their new places instead of jumping (FLIP:
// measure, let React move them, then animate from the old spot). Used where a
// decision model reorders a list live. Reduced motion just moves them.

import { useLayoutEffect, useRef } from "react";
import { useStill } from "./power";

/** Pass a key that changes with the order; attach the returned ref to each item. */
export function useFlip(order: string) {
  const els = useRef(new Map<string, HTMLElement>());
  const tops = useRef(new Map<string, number>());
  const reduced = useStill();
  useLayoutEffect(() => {
    for (const [k, el] of els.current) {
      const top = el.getBoundingClientRect().top;
      const before = tops.current.get(k);
      tops.current.set(k, top);
      if (reduced || before === undefined || Math.abs(before - top) < 1) continue;
      el.animate([{ transform: `translateY(${before - top}px)` }, { transform: "none" }], { duration: 240, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
    }
  }, [order, reduced]);
  return (k: string) => (el: HTMLElement | null) => {
    if (el) els.current.set(k, el);
    else els.current.delete(k);
  };
}

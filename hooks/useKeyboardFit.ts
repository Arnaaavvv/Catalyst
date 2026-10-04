"use client";
import { useEffect } from "react";

// iOS Safari shrinks only the *visual* viewport when the keyboard opens, so a
// fixed, bottom-anchored sheet stays where it was — behind the keyboard. While
// the keyboard is up this publishes the visible area as --vv-top / --vv-bottom
// for the mobile dialog rules in globals.css. Chrome on Android resizes the
// layout itself (see `interactiveWidget` in layout.tsx), where this is a no-op.
export function useKeyboardFit() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const hidden = window.innerHeight - vv.height;
        if (hidden > 120) {
          root.style.setProperty("--vv-top", `${vv.offsetTop}px`);
          root.style.setProperty("--vv-bottom", `${Math.max(0, hidden - vv.offsetTop)}px`);
        } else {
          root.style.removeProperty("--vv-top");
          root.style.removeProperty("--vv-bottom");
        }
      });
    };

    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-bottom");
    };
  }, []);
}
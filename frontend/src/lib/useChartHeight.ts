import { useEffect, useState } from "react";

/**
 * Returns a chart height adaptive to viewport width.
 *
 * Recharts' <ResponsiveContainer> handles width responsively but not height,
 * which leaves charts feeling oversized on phones (a 460-px-tall bar chart
 * eats most of a mobile viewport before showing context). This hook returns
 * `desktopHeight` on viewports ≥ 769px and a capped/scaled value below that.
 *
 * @param desktopHeight the height used at ≥ 769px (default: caller-defined)
 * @param mobileCap     max height on mobile (default: 280px). Useful for very
 *                      tall vertical bar charts; smaller charts pass through.
 */
export function useChartHeight(desktopHeight: number, mobileCap = 280): number {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    // matchMedia in old browsers uses addListener
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  if (!isMobile) return desktopHeight;
  // On mobile cap the height; small charts (≤ cap) pass through unchanged
  return Math.min(desktopHeight, mobileCap);
}

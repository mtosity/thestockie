"use client";

import { useEffect, useRef, useState } from "react";

export type FlashDir = "up" | "down" | null;

/** Theme-consistent up/down colors (match the chart's S/R palette). */
export const LIVE_UP = "#22c55e";
export const LIVE_DOWN = "#ef4444";

/**
 * Tracks the direction of the latest price change and bumps a `tick` counter
 * every time it changes — the counter is used as a React `key` to retrigger
 * the CSS flash animation on each new quote.
 */
export function usePriceFlash(price?: number): { dir: FlashDir; tick: number } {
  const prevRef = useRef<number | undefined>(undefined);
  const [state, setState] = useState<{ dir: FlashDir; tick: number }>({
    dir: null,
    tick: 0,
  });

  useEffect(() => {
    if (price == null || Number.isNaN(price)) return;
    const prev = prevRef.current;
    prevRef.current = price;
    if (prev != null && price !== prev) {
      setState((s) => ({ dir: price > prev ? "up" : "down", tick: s.tick + 1 }));
    }
  }, [price]);

  return state;
}

/**
 * Robinhood-style pulsing dot for the live price at the line's leading edge:
 * a solid core ringed by an expanding, fading halo. Rendered as a Recharts
 * `ReferenceDot` shape, so it receives the resolved `cx`/`cy`.
 */
export function LivePulseDot({
  cx,
  cy,
  color,
}: {
  cx?: number;
  cy?: number;
  color: string;
}) {
  if (cx == null || cy == null || Number.isNaN(cx) || Number.isNaN(cy)) {
    return <g />;
  }
  return (
    <g style={{ pointerEvents: "none" }}>
      <circle cx={cx} cy={cy} r={4} fill={color} opacity={0.5}>
        <animate
          attributeName="r"
          values="4;15;15"
          keyTimes="0;0.7;1"
          dur="1.8s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.45;0;0"
          keyTimes="0;0.7;1"
          dur="1.8s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx={cx}
        cy={cy}
        r={3.5}
        fill={color}
        stroke="var(--background)"
        strokeWidth={1.5}
      />
    </g>
  );
}

/** Small pulsing "LIVE" pill. */
export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-positive/30 bg-positive-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-positive">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive" />
      </span>
      Live
    </span>
  );
}

/**
 * Header readout: large flashing price + day change. When `live` is set the
 * price flashes green/red on every tick and a LIVE badge is shown.
 */
export function LiveQuoteHeader({
  price,
  change,
  changePct,
  live,
}: {
  price: number;
  change: number;
  changePct: number;
  live: boolean;
}) {
  const flash = usePriceFlash(live ? price : undefined);
  const up = change >= 0;

  return (
    <div className="flex items-center gap-2 p-2">
      {live && <LiveBadge />}
      <span
        key={flash.tick}
        className={`rounded px-1.5 text-lg font-bold tabular-nums ${
          flash.dir === "up"
            ? "flash-up"
            : flash.dir === "down"
              ? "flash-down"
              : ""
        }`}
      >
        ${price.toFixed(2)}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          up ? "text-positive" : "text-negative"
        }`}
      >
        {up ? "▲" : "▼"} {up ? "+" : ""}
        {change.toFixed(2)} ({up ? "+" : ""}
        {changePct.toFixed(2)}%)
      </span>
    </div>
  );
}

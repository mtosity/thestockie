"use client";

import { useEffect, useRef, useState } from "react";

export type FlashDir = "up" | "down" | null;

/** Theme-consistent up/down colors (match the chart's S/R palette). */
export const LIVE_UP = "#22c55e";
export const LIVE_DOWN = "#ef4444";

/**
 * Tracks the direction of the latest price change and bumps a `tick` counter
 * every time it changes — used to retrigger the flash on each new quote.
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

/** A single odometer column: 0-9 stacked, slid to reveal the active digit. */
function RollingDigit({ digit }: { digit: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        height: "1em",
        lineHeight: 1,
        overflow: "hidden",
        verticalAlign: "bottom",
      }}
    >
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          transform: `translateY(-${digit}em)`,
          transition: "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n} style={{ height: "1em", lineHeight: 1 }}>
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

/** `$1,234.56` where each digit rolls vertically when it changes. */
function RollingNumber({
  value,
  decimals = 2,
}: {
  value: number;
  decimals?: number;
}) {
  const str = value.toFixed(decimals);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span style={{ height: "1em", lineHeight: 1 }}>$</span>
      {str.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <RollingDigit key={i} digit={Number(ch)} />
        ) : (
          <span key={i} style={{ height: "1em", lineHeight: 1 }}>
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

/**
 * Header readout: a rolling-digit price that flashes green/red (text color)
 * on each tick, plus the window change. The flash is driven via the Web
 * Animations API so it replays without remounting the rolling digits.
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
  const priceRef = useRef<HTMLSpanElement>(null);
  const up = change >= 0;

  useEffect(() => {
    if (!live || flash.dir == null) return;
    const el = priceRef.current;
    if (!el || typeof el.animate !== "function") return;
    const cs = getComputedStyle(el);
    const from = (
      flash.dir === "up"
        ? cs.getPropertyValue("--positive")
        : cs.getPropertyValue("--negative")
    ).trim();
    const to = cs.getPropertyValue("--fg").trim() || "currentColor";
    el.animate([{ color: from }, { color: to }], {
      duration: 800,
      easing: "ease-out",
    });
  }, [flash.tick, flash.dir, live]);

  return (
    <div className="flex items-center gap-2 p-2">
      {live && <LiveBadge />}
      <span ref={priceRef} className="text-lg font-bold tabular-nums text-foreground">
        {live ? <RollingNumber value={price} /> : `$${price.toFixed(2)}`}
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

"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "~/components/ui/chart";
import { api } from "~/trpc/react";

const REFETCH = {
  refetchOnMount: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  refetchInterval: 300_000,
} as const;

export interface Sym {
  symbol: string;
  label: string;
}

const PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#14b8a6",
  "#6366f1",
];

// ── symbol groups ───────────────────────────────────────────────────
export const INDICES: Sym[] = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^DJI", label: "Dow Jones" },
  { symbol: "^IXIC", label: "NASDAQ" },
  { symbol: "^RUT", label: "Russell 2000" },
  { symbol: "^FTSE", label: "FTSE 100" },
  { symbol: "^GDAXI", label: "DAX" },
  { symbol: "^N225", label: "Nikkei 225" },
  { symbol: "^HSI", label: "Hang Seng" },
];

export const FOREX: Sym[] = [
  { symbol: "EURUSD", label: "EUR/USD" },
  { symbol: "GBPUSD", label: "GBP/USD" },
  { symbol: "USDJPY", label: "USD/JPY" },
  { symbol: "USDCNY", label: "USD/CNY" },
  { symbol: "USDCHF", label: "USD/CHF" },
];

export const COMMODITIES: Sym[] = [
  { symbol: "GCUSD", label: "Gold" },
  { symbol: "SIUSD", label: "Silver" },
  { symbol: "CLUSD", label: "WTI Crude" },
  { symbol: "BZUSD", label: "Brent Crude" },
  { symbol: "HGUSD", label: "Copper" },
];

export const CRYPTO: Sym[] = [
  { symbol: "BTCUSD", label: "Bitcoin" },
  { symbol: "ETHUSD", label: "Ethereum" },
  { symbol: "SOLUSD", label: "Solana" },
  { symbol: "XRPUSD", label: "XRP" },
  { symbol: "DOGEUSD", label: "Dogecoin" },
];

const SECTOR_ETFS: Sym[] = [
  { symbol: "XLK", label: "Technology" },
  { symbol: "XLF", label: "Financials" },
  { symbol: "XLV", label: "Healthcare" },
  { symbol: "XLY", label: "Cons. Cyclical" },
  { symbol: "XLP", label: "Cons. Defensive" },
  { symbol: "XLE", label: "Energy" },
  { symbol: "XLI", label: "Industrials" },
  { symbol: "XLB", label: "Materials" },
  { symbol: "XLRE", label: "Real Estate" },
  { symbol: "XLU", label: "Utilities" },
  { symbol: "XLC", label: "Communication" },
];

type Hist = Record<string, { date: string; close: number }[]>;

/** Normalize each symbol to % change from its first point, aligned on a shared
    ascending date axis. */
function normalize(data: Hist | undefined, syms: Sym[]) {
  if (!data) return { rows: [] as Record<string, number | string>[] };
  const perSym: Record<string, Map<string, number>> = {};
  const dateSet = new Set<string>();
  for (const { symbol } of syms) {
    const asc = [...(data[symbol] ?? [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const base = asc[0]?.close;
    const m = new Map<string, number>();
    if (base) {
      for (const p of asc) {
        m.set(p.date, (p.close / base - 1) * 100);
        dateSet.add(p.date);
      }
    }
    perSym[symbol] = m;
  }
  const dates = [...dateSet].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );
  const rows = dates.map((d) => {
    const row: Record<string, number | string> = { date: d };
    for (const { symbol } of syms) {
      const v = perSym[symbol]!.get(d);
      if (v != null) row[symbol] = v;
    }
    return row;
  });
  return { rows };
}

const tickFmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

/** Overlaid normalized line chart (% change over ~1Y) for a group of symbols. */
export function MacroLineCard({
  title,
  syms,
  height = 240,
}: {
  title: string;
  syms: Sym[];
  height?: number;
}) {
  const { data, isLoading } = api.asset.multiHistory.useQuery(
    syms.map((s) => s.symbol),
    REFETCH,
  );
  const { rows } = useMemo(() => normalize(data, syms), [data, syms]);

  // latest % per symbol for the legend
  const latest = useMemo(() => {
    const out: Record<string, number> = {};
    for (const { symbol } of syms) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const v = rows[i]![symbol];
        if (typeof v === "number") {
          out[symbol] = v;
          break;
        }
      }
    }
    return out;
  }, [rows, syms]);

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">% change, trailing 1Y</p>
      <div style={{ height }}>
        {isLoading || !rows.length ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {isLoading ? "Loading…" : "No data"}
          </div>
        ) : (
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="date" tickFormatter={tickFmt} minTickGap={48} fontSize={11} stroke="#9ca3af" />
              <YAxis fontSize={11} width={48} stroke="#9ca3af" tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
              <ReferenceLine y={0} stroke="var(--border)" strokeOpacity={0.4} />
              <ChartTooltip
                content={({ payload, active, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-lg">
                      <div className="mb-1 text-muted-foreground">
                        {new Date(label as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      {[...(payload as { name: string; value: number; color: string }[])]
                        .sort((a, b) => b.value - a.value)
                        .map((p) => {
                          const s = syms.find((x) => x.symbol === p.name);
                          return (
                            <div key={p.name} className="flex items-center justify-between gap-3">
                              <span style={{ color: p.color }}>{s?.label ?? p.name}</span>
                              <span className="font-mono tabular-nums text-foreground">{pct(p.value)}</span>
                            </div>
                          );
                        })}
                    </div>
                  );
                }}
              />
              {syms.map((s, i) => (
                <Line
                  key={s.symbol}
                  dataKey={s.symbol}
                  name={s.symbol}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* legend with latest % */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {syms.map((s, i) => (
          <span key={s.symbol} className="flex items-center gap-1.5 text-xs">
            <span className="inline-block h-0.5 w-3.5" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-muted-foreground">{s.label}</span>
            {latest[s.symbol] != null && (
              <span className={`font-mono tabular-nums ${latest[s.symbol]! >= 0 ? "text-positive" : "text-negative"}`}>
                {pct(latest[s.symbol]!)}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Sector rotation: scrub a slider through the year to watch the 11 SPDR
    sectors' cumulative returns (and their ranking) change over time. */
export function SectorRotation() {
  const { data, isLoading } = api.asset.multiHistory.useQuery(
    SECTOR_ETFS.map((s) => s.symbol),
    REFETCH,
  );
  const { rows } = useMemo(() => normalize(data, SECTOR_ETFS), [data]);
  const [idx, setIdx] = useState<number | null>(null);

  const pos = idx == null ? rows.length - 1 : Math.min(idx, rows.length - 1);

  // bars at the selected date — carry forward the last known value per sector
  const bars = useMemo(() => {
    if (!rows.length) return [];
    const last: Record<string, number> = {};
    for (let i = 0; i <= pos; i++) {
      for (const { symbol } of SECTOR_ETFS) {
        const v = rows[i]![symbol];
        if (typeof v === "number") last[symbol] = v;
      }
    }
    return SECTOR_ETFS.map((s) => ({ label: s.label, value: last[s.symbol] ?? 0 })).sort(
      (a, b) => b.value - a.value,
    );
  }, [rows, pos]);

  const selDate = rows[pos]?.date as string | undefined;

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sector Rotation
        </h2>
        <span className="font-mono text-xs text-foreground">
          {selDate
            ? new Date(selDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : ""}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Cumulative return since 1Y ago — drag to scrub through time
      </p>
      <div style={{ height: 280 }}>
        {isLoading || !bars.length ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {isLoading ? "Loading…" : "No data"}
          </div>
        ) : (
          <ResponsiveContainer>
            <BarChart data={bars} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
              <CartesianGrid horizontal={false} stroke="var(--border-light)" />
              <XAxis type="number" fontSize={11} stroke="#9ca3af" tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
              <YAxis type="category" dataKey="label" width={104} fontSize={11} stroke="#9ca3af" />
              <ReferenceLine x={0} stroke="var(--border)" strokeOpacity={0.5} />
              <Bar dataKey="value" isAnimationActive={false} radius={[0, 2, 2, 0]} label={{ position: "right", fontSize: 10, fill: "var(--muted)", formatter: (v: number) => pct(v) }}>
                {bars.map((b, i) => (
                  <Cell key={i} fill={b.value >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0, rows.length - 1)}
        value={pos}
        onChange={(e) => setIdx(Number(e.target.value))}
        disabled={!rows.length}
        aria-label="Scrub sector performance through time"
        className="mt-3 w-full accent-[var(--accent)]"
      />
      <div className="mt-1 flex justify-between font-mono text-[0.65rem] text-muted-foreground">
        <span>1Y ago</span>
        <span>today</span>
      </div>
    </div>
  );
}

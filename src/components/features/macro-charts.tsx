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

export type MacroLineKind = "indices" | "forex" | "commodities" | "crypto";

/** A short, data-driven takeaway computed from the latest 1Y % moves. */
function insightFor(
  kind: MacroLineKind | undefined,
  latest: Record<string, number>,
  syms: Sym[],
): string {
  const entries = syms
    .map((s) => ({ symbol: s.symbol, label: s.label, v: latest[s.symbol] }))
    .filter((e): e is { symbol: string; label: string; v: number } => e.v != null);
  if (entries.length < 2) return "";
  const sorted = [...entries].sort((a, b) => b.v - a.v);
  const top = sorted[0]!;
  const bot = sorted[sorted.length - 1]!;
  const up = entries.filter((e) => e.v > 0).length;
  const n = entries.length;
  const f = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`;

  if (kind === "forex") {
    // USD-base pairs up ⇒ dollar up; USD-quote pairs up ⇒ dollar down.
    let score = 0;
    let c = 0;
    for (const e of entries) {
      if (e.symbol.startsWith("USD")) (score += e.v), c++;
      else if (e.symbol.endsWith("USD")) (score -= e.v), c++;
    }
    const d = c ? score / c : 0;
    const dir = Math.abs(d) < 1 ? "roughly flat" : d > 0 ? "broadly stronger" : "broadly weaker";
    return `Dollar ${dir} vs majors over the past year (${f(d)} avg). Biggest mover: ${top.label} ${f(top.v)}.`;
  }
  if (kind === "crypto") {
    const tone = up >= n / 2 ? "Risk-on" : "Risk-off";
    return `${tone} — ${up}/${n} higher over 1Y. ${top.label} leads (${f(top.v)}), ${bot.label} lags (${f(bot.v)}).`;
  }
  if (kind === "commodities") {
    const gold = entries.find((e) => e.symbol === "GCUSD");
    const oil = entries.find((e) => e.symbol === "CLUSD");
    const parts: string[] = [];
    if (gold) parts.push(`Gold ${f(gold.v)} (${gold.v > 0 ? "haven / inflation bid" : "soft"})`);
    if (oil) parts.push(`WTI ${f(oil.v)} (${oil.v > 0 ? "firm demand" : "weak demand"})`);
    parts.push(`${top.label} leads, ${bot.label} lags.`);
    return parts.join(" · ");
  }
  // indices
  const breadth =
    up === n ? "Broad global strength" : up >= n / 2 ? "Mostly higher, regionally mixed" : "Mostly lower — risk-off";
  return `${breadth}: ${top.label} leads (${f(top.v)}), ${bot.label} lags (${f(bot.v)}); ${up}/${n} up over 1Y.`;
}

/** Overlaid normalized line chart (% change over ~1Y) for a group of symbols. */
export function MacroLineCard({
  title,
  syms,
  kind,
  height = 240,
}: {
  title: string;
  syms: Sym[];
  kind?: MacroLineKind;
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

  const comment = useMemo(
    () => insightFor(kind, latest, syms),
    [kind, latest, syms],
  );

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
      {comment && (
        <p className="mt-3 border-t border-border pt-2.5 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Takeaway · </span>
          {comment}
        </p>
      )}
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

  // Evenly-spaced date markers under the slider so the timeline is readable.
  const ticks = useMemo(() => {
    if (rows.length < 2) return [];
    const n = 5;
    return Array.from({ length: n }, (_, i) => {
      const ri = Math.round(((rows.length - 1) * i) / (n - 1));
      return new Date(rows[ri]!.date as string).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    });
  }, [rows]);

  // Rotation read + momentum "prediction" at the selected point in time.
  // Money flows toward relative strength (above the cross-sector average), and
  // accelerating sectors — recent (1W) pace outrunning the monthly pace — hint
  // at where leadership is heading next.
  const analysis = useMemo(() => {
    if (rows.length < 22) return null;
    const at = (sym: string, i: number) => {
      const v = rows[i]?.[sym];
      return typeof v === "number" ? v : null;
    };
    const sectors = SECTOR_ETFS.map((s) => {
      const cum = at(s.symbol, pos);
      const w5 = at(s.symbol, pos - 5);
      const m21 = at(s.symbol, pos - 21);
      const week = cum != null && w5 != null ? cum - w5 : null;
      const month = cum != null && m21 != null ? cum - m21 : null;
      return {
        label: s.label,
        cum,
        accel: week != null && month != null ? week - month / 4.2 : null,
      };
    }).filter((x): x is { label: string; cum: number; accel: number | null } => x.cum != null);
    if (sectors.length < 3) return null;
    const avg = sectors.reduce((a, b) => a + b.cum, 0) / sectors.length;
    const inflow = [...sectors].sort((a, b) => b.cum - a.cum).filter((s) => s.cum > avg).slice(0, 3);
    const outflow = [...sectors].sort((a, b) => a.cum - b.cum).filter((s) => s.cum < avg).slice(0, 3);
    const accelled = sectors.filter((s): s is { label: string; cum: number; accel: number } => s.accel != null);
    accelled.sort((a, b) => b.accel - a.accel);
    return {
      inflow,
      outflow,
      gaining: accelled.filter((s) => s.accel > 0).slice(0, 3),
      fading: accelled.filter((s) => s.accel < 0).slice(-2).reverse(),
    };
  }, [rows, pos]);

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
      {analysis && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="text-muted-foreground">Money rotating into</span>
            {analysis.inflow.map((s) => (
              <span key={s.label} className="font-medium text-positive">
                {s.label}
              </span>
            ))}
            <span className="text-muted-foreground">· out of</span>
            {analysis.outflow.map((s) => (
              <span key={s.label} className="font-medium text-negative">
                {s.label}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="font-semibold text-foreground">Prediction</span>
            <span className="text-muted-foreground">
              momentum building in
            </span>
            {analysis.gaining.length ? (
              analysis.gaining.map((s) => (
                <span key={s.label} className="font-medium text-positive">
                  {s.label} ▲
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
            {analysis.fading.length > 0 && (
              <>
                <span className="text-muted-foreground">· fading</span>
                {analysis.fading.map((s) => (
                  <span key={s.label} className="font-medium text-negative">
                    {s.label} ▼
                  </span>
                ))}
              </>
            )}
          </div>
          <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
            Capital rotates from laggards into relative-strength leaders;
            sectors whose recent (1W) pace is outrunning their monthly pace are
            where leadership may head next.
          </p>
        </div>
      )}

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
      <div className="mt-1 flex justify-between font-mono text-[0.6rem] text-muted-foreground">
        {ticks.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}

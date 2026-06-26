"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import { Select } from "@mtosity/design-system";
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

const SECTOR_SHORT: Record<string, string> = {
  XLK: "TECH",
  XLF: "FIN",
  XLV: "HLTH",
  XLY: "DISC",
  XLP: "STPL",
  XLE: "ENGY",
  XLI: "INDU",
  XLB: "MATL",
  XLRE: "RE",
  XLU: "UTIL",
  XLC: "COMM",
};

type Row = Record<string, number | string>;
const sectorColor = (i: number) => PALETTE[i % PALETTE.length]!;
const numAt = (row: Row | undefined, sym: string): number | null => {
  const v = row?.[sym];
  return typeof v === "number" ? v : null;
};

/** Rank (bump) — each sector's leadership rank (1 = best) over the year;
    crossing lines = rotation. */
function SectorBump({ rows }: { rows: Row[] }) {
  const data = useMemo(() => {
    if (rows.length < 2) return [];
    const points = 13;
    const idxs = [
      ...new Set(
        Array.from({ length: points }, (_, i) =>
          Math.round(((rows.length - 1) * i) / (points - 1)),
        ),
      ),
    ];
    return idxs.map((ri) => {
      const row = rows[ri]!;
      const vals = SECTOR_ETFS.map((s) => ({ sym: s.symbol, v: numAt(row, s.symbol) }))
        .filter((x): x is { sym: string; v: number } => x.v != null)
        .sort((a, b) => b.v - a.v);
      const o: Row = { date: row.date as string };
      vals.forEach((x, r) => (o[x.sym] = r + 1));
      return o;
    });
  }, [rows]);

  const ranking = useMemo(() => {
    const last = data[data.length - 1];
    if (!last) return [];
    return SECTOR_ETFS.map((s, i) => ({ label: s.label, symbol: s.symbol, i, rank: last[s.symbol] as number }))
      .filter((s) => s.rank != null)
      .sort((a, b) => a.rank - b.rank);
  }, [data]);

  return (
    <>
      <div style={{ height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border-light)" />
            <XAxis dataKey="date" tickFormatter={tickFmt} minTickGap={40} fontSize={11} stroke="#9ca3af" />
            <YAxis reversed domain={[1, 11]} ticks={[1, 3, 5, 7, 9, 11]} width={24} fontSize={11} stroke="#9ca3af" />
            <ChartTooltip
              content={({ payload, active, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-lg">
                    <div className="mb-1 text-muted-foreground">
                      {new Date(label as string).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </div>
                    {[...(payload as { name: string; value: number; color: string }[])]
                      .sort((a, b) => a.value - b.value)
                      .map((p) => {
                        const s = SECTOR_ETFS.find((x) => x.symbol === p.name);
                        return (
                          <div key={p.name} style={{ color: p.color }}>
                            #{p.value} {s?.label ?? p.name}
                          </div>
                        );
                      })}
                  </div>
                );
              }}
            />
            {SECTOR_ETFS.map((s, i) => (
              <Line key={s.symbol} dataKey={s.symbol} name={s.symbol} stroke={sectorColor(i)} strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {ranking.map((s) => (
          <span key={s.symbol} className="flex items-center gap-1 text-xs">
            <span className="font-mono text-muted-foreground">{s.rank}</span>
            <span className="inline-block h-0.5 w-3" style={{ background: sectorColor(s.i) }} />
            <span className="text-muted-foreground">{s.label}</span>
          </span>
        ))}
      </div>
    </>
  );
}

/** Monthly heatmap — each sector's return per calendar month. */
function SectorHeatmap({ rows }: { rows: Row[] }) {
  const { months, cells } = useMemo(() => {
    const byMonth = new Map<string, Row>();
    for (const r of rows) byMonth.set((r.date as string).slice(0, 7), r); // ascending ⇒ last row of month wins
    const months = [...byMonth.keys()].sort();
    const cells: Record<string, Record<string, number>> = {};
    for (const s of SECTOR_ETFS) {
      cells[s.symbol] = {};
      let prev = 0;
      for (const m of months) {
        const cur = numAt(byMonth.get(m), s.symbol) ?? prev;
        cells[s.symbol]![m] = cur - prev;
        prev = cur;
      }
    }
    return { months, cells };
  }, [rows]);

  const cellBg = (v: number) => {
    const a = Math.round(Math.min(1, Math.abs(v) / 8) * 70);
    return v >= 0
      ? `color-mix(in srgb, #22c55e ${a}%, transparent)`
      : `color-mix(in srgb, #ef4444 ${a}%, transparent)`;
  };

  if (!months.length) return null;
  return (
    <div className="overflow-x-auto" style={{ minHeight: 300 }}>
      <table className="w-full border-separate text-[0.62rem]" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background p-1 text-left" />
            {months.map((m) => (
              <th key={m} className="p-1 font-medium text-muted-foreground">
                {new Date(m + "-01").toLocaleDateString("en-US", { month: "short" })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SECTOR_ETFS.map((s) => (
            <tr key={s.symbol}>
              <td className="sticky left-0 z-10 whitespace-nowrap bg-background p-1 pr-2 text-left text-muted-foreground">
                {s.label}
              </td>
              {months.map((m) => {
                const v = cells[s.symbol]![m] ?? 0;
                return (
                  <td key={m} className="rounded p-1 text-center tabular-nums text-foreground" style={{ background: cellBg(v) }}>
                    {v >= 0 ? "+" : ""}
                    {v.toFixed(0)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Relative Rotation Graph — relative strength (x) vs momentum (y); each sector
    is a dot with a tail, rotating clockwise through the four quadrants. */
function SectorRRG({ rows }: { rows: Row[] }) {
  const { series, dom } = useMemo(() => {
    const empty: { symbol: string; short: string; color: string; pts: { x: number; y: number }[] }[] = [];
    if (rows.length < 30) return { series: empty, dom: 5 };
    const bench = (i: number) => {
      let s = 0;
      let c = 0;
      for (const sec of SECTOR_ETFS) {
        const v = numAt(rows[i], sec.symbol);
        if (v != null) (s += v), c++;
      }
      return c ? s / c : 0;
    };
    const lookback = 21;
    const tailN = 6;
    const tailStep = 5;
    const lastI = rows.length - 1;
    const series = SECTOR_ETFS.map((sec, idx) => {
      const pts: { x: number; y: number }[] = [];
      for (let t = tailN - 1; t >= 0; t--) {
        const i = lastI - t * tailStep;
        if (i < lookback) continue;
        const rs = (numAt(rows[i], sec.symbol) ?? 0) - bench(i);
        const rsPrev = (numAt(rows[i - lookback], sec.symbol) ?? 0) - bench(i - lookback);
        pts.push({ x: rs, y: rs - rsPrev });
      }
      return { symbol: sec.symbol, short: SECTOR_SHORT[sec.symbol] ?? sec.symbol, color: sectorColor(idx), pts };
    }).filter((s) => s.pts.length > 0);
    // Normalize both axes to z-scores (JdK-style) so a single outlier sector
    // doesn't compress everyone else into the centre.
    const allX = series.flatMap((s) => s.pts.map((p) => p.x));
    const allY = series.flatMap((s) => s.pts.map((p) => p.y));
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
    const std = (a: number[], m: number) =>
      Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length || 1)) || 1;
    const mx = mean(allX);
    const my = mean(allY);
    const sx = std(allX, mx);
    const sy = std(allY, my);
    const norm = series.map((s) => ({
      ...s,
      pts: s.pts.map((p) => ({ x: (p.x - mx) / sx, y: (p.y - my) / sy })),
    }));
    const maxAbs = Math.max(
      1.5,
      ...norm.flatMap((s) => s.pts.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y)))),
    );
    return { series: norm, dom: maxAbs * 1.12 };
  }, [rows]);

  if (!series.length) return null;
  return (
    <>
      <div style={{ height: 320 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 8, right: 18, bottom: 4, left: 0 }}>
            <XAxis type="number" dataKey="x" domain={[-dom, dom]} tick={false} axisLine={false} height={1} />
            <YAxis type="number" dataKey="y" domain={[-dom, dom]} tick={false} axisLine={false} width={1} />
            <ReferenceArea x1={0} x2={dom} y1={0} y2={dom} fill="#22c55e" fillOpacity={0.06} />
            <ReferenceArea x1={0} x2={dom} y1={-dom} y2={0} fill="#f59e0b" fillOpacity={0.06} />
            <ReferenceArea x1={-dom} x2={0} y1={-dom} y2={0} fill="#ef4444" fillOpacity={0.06} />
            <ReferenceArea x1={-dom} x2={0} y1={0} y2={dom} fill="#3b82f6" fillOpacity={0.06} />
            <ReferenceLine x={0} stroke="var(--border)" strokeOpacity={0.6} />
            <ReferenceLine y={0} stroke="var(--border)" strokeOpacity={0.6} />
            {series.map((s) => (
              <Scatter
                key={s.symbol}
                data={s.pts}
                fill={s.color}
                line={{ stroke: s.color, strokeWidth: 1, strokeOpacity: 0.5 }}
                isAnimationActive={false}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={(props: any) => {
                  const isLast = props.index === s.pts.length - 1;
                  return <circle cx={props.cx} cy={props.cy} r={isLast ? 5 : 2} fill={s.color} fillOpacity={isLast ? 1 : 0.4} />;
                }}
              >
                <LabelList
                  dataKey="x"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  content={(p: any) =>
                    p.index === s.pts.length - 1 ? (
                      <text x={Number(p.x) + 7} y={Number(p.y) + 3} fontSize={9} fontWeight={600} fill={s.color}>
                        {s.short}
                      </text>
                    ) : null
                  }
                />
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 grid grid-cols-2 text-[0.62rem] text-muted-foreground">
        <span className="text-[#3b82f6]">↖ Improving</span>
        <span className="text-right text-[#22c55e]">Leading ↗</span>
        <span className="text-[#ef4444]">↙ Lagging</span>
        <span className="text-right text-[#f59e0b]">Weakening ↘</span>
      </div>
    </>
  );
}

const SECTOR_VIEWS = [
  { value: "bump", label: "Rank (bump)" },
  { value: "heatmap", label: "Monthly heatmap" },
  { value: "rrg", label: "Relative Rotation (RRG)" },
];
const SECTOR_SUBTITLE: Record<string, string> = {
  bump: "Sector rank (1 = leader) over the trailing year — crossing lines = rotation",
  heatmap: "Each sector's return by calendar month — green up, red down",
  rrg: "Relative strength vs momentum — sectors rotate clockwise through the quadrants",
};

export function SectorRotation() {
  const { data, isLoading } = api.asset.multiHistory.useQuery(
    SECTOR_ETFS.map((s) => s.symbol),
    REFETCH,
  );
  const { rows } = useMemo(() => normalize(data, SECTOR_ETFS), [data]);
  const [view, setView] = useState("bump");

  // Rotation read + momentum "prediction" at the latest point. Money flows
  // toward relative strength (above the cross-sector average); accelerating
  // sectors (recent 1W pace outrunning the monthly pace) hint at what leads next.
  const analysis = useMemo(() => {
    if (rows.length < 22) return null;
    const pos = rows.length - 1;
    const at = (sym: string, i: number) => numAt(rows[i], sym);
    const sectors = SECTOR_ETFS.map((s) => {
      const cum = at(s.symbol, pos);
      const w5 = at(s.symbol, pos - 5);
      const m21 = at(s.symbol, pos - 21);
      const week = cum != null && w5 != null ? cum - w5 : null;
      const month = cum != null && m21 != null ? cum - m21 : null;
      return { label: s.label, cum, accel: week != null && month != null ? week - month / 4.2 : null };
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
  }, [rows]);

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sector Rotation
        </h2>
        <div className="shrink-0">
          <Select
            className="macro-fed-select"
            aria-label="Sector rotation view"
            value={view}
            onChange={setView}
            options={SECTOR_VIEWS}
          />
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{SECTOR_SUBTITLE[view]}</p>

      {isLoading || rows.length < 2 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          {isLoading ? "Loading…" : "No data"}
        </div>
      ) : view === "heatmap" ? (
        <SectorHeatmap rows={rows} />
      ) : view === "rrg" ? (
        <SectorRRG rows={rows} />
      ) : (
        <SectorBump rows={rows} />
      )}

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
            <span className="text-muted-foreground">momentum building in</span>
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
            Capital rotates from laggards into relative-strength leaders; sectors
            whose recent (1W) pace is outrunning their monthly pace are where
            leadership may head next.
          </p>
        </div>
      )}
    </div>
  );
}

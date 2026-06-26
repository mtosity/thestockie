"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Select } from "@mtosity/design-system";
import { ChartTooltip } from "~/components/ui/chart";
import { api } from "~/trpc/react";

type Pt = { date: string; value: number };
type Mode = "yoy" | "rate" | "momK" | "level" | "levelK";

interface FedSeries {
  key: string;
  label: string;
  short: string;
  mode: Mode;
  /** plain-language note keyed off the latest headline value */
  context?: (v: number) => string;
}

// The order here is the dropdown order.
const SERIES: FedSeries[] = [
  { key: "CPI", label: "Inflation — CPI (YoY)", short: "Inflation (CPI YoY)", mode: "yoy", context: (v) => (v > 2.5 ? "above the Fed's 2% target" : v < 1.5 ? "below target" : "near the 2% target") },
  { key: "unemploymentRate", label: "Unemployment Rate", short: "Unemployment", mode: "rate", context: (v) => (v < 4 ? "tight labor market" : v > 5 ? "softening" : "near full employment") },
  { key: "totalNonfarmPayroll", label: "Nonfarm Payrolls (MoM change)", short: "Nonfarm Payrolls", mode: "momK", context: (v) => (v > 150 ? "healthy hiring" : v < 0 ? "jobs lost" : "cooling hiring") },
  { key: "initialClaims", label: "Initial Jobless Claims", short: "Initial Claims", mode: "levelK", context: (v) => (v > 300 ? "rising layoffs" : "low / stable") },
  { key: "realGDP", label: "Real GDP (YoY)", short: "Real GDP", mode: "yoy", context: (v) => (v > 2.5 ? "above trend" : v < 0 ? "recessionary" : "below trend") },
  { key: "retailSales", label: "Retail Sales (YoY)", short: "Retail Sales", mode: "yoy", context: (v) => (v > 4 ? "strong consumer" : v < 0 ? "contracting" : "soft") },
  { key: "industrialProductionTotalIndex", label: "Industrial Production (YoY)", short: "Industrial Production", mode: "yoy" },
  { key: "consumerSentiment", label: "Consumer Sentiment", short: "Consumer Sentiment", mode: "level", context: (v) => (v > 80 ? "optimistic" : v < 60 ? "depressed" : "guarded") },
  { key: "federalFunds", label: "Fed Funds Rate", short: "Fed Funds Rate", mode: "rate", context: (v) => (v > 4 ? "restrictive" : v < 2.5 ? "accommodative" : "neutral") },
  { key: "30YearFixedRateMortgageAverage", label: "30Y Mortgage Rate", short: "30Y Mortgage", mode: "rate" },
];

// Find the reading ~360 days before `idx` (within tolerance) for YoY.
function yearAgoValue(asc: Pt[], idx: number): number | undefined {
  const target = new Date(asc[idx]!.date).getTime() - 360 * 864e5;
  let best: Pt | undefined;
  let bestDiff = Infinity;
  for (let j = 0; j <= idx; j++) {
    const d = Math.abs(new Date(asc[j]!.date).getTime() - target);
    if (d < bestDiff) {
      bestDiff = d;
      best = asc[j];
    }
  }
  return best && bestDiff < 70 * 864e5 ? best.value : undefined;
}

function toChart(raw: Pt[] | undefined, mode: Mode): Pt[] {
  if (!raw?.length) return [];
  const asc = [...raw].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  switch (mode) {
    case "rate":
    case "level":
      return asc.map((p) => ({ date: p.date, value: p.value }));
    case "levelK":
      return asc.map((p) => ({ date: p.date, value: p.value / 1000 }));
    case "momK": {
      const out: Pt[] = [];
      for (let i = 1; i < asc.length; i++) {
        out.push({ date: asc[i]!.date, value: asc[i]!.value - asc[i - 1]!.value });
      }
      return out;
    }
    case "yoy": {
      const out: Pt[] = [];
      for (let i = 0; i < asc.length; i++) {
        const ya = yearAgoValue(asc, i);
        if (ya != null && ya !== 0) {
          out.push({ date: asc[i]!.date, value: (asc[i]!.value / ya - 1) * 100 });
        }
      }
      return out;
    }
  }
}

function fmtValue(v: number, mode: Mode): string {
  switch (mode) {
    case "yoy":
    case "rate":
      return `${v >= 0 ? "" : ""}${v.toFixed(2)}%`;
    case "momK":
      return `${v >= 0 ? "+" : ""}${Math.round(v)}K`;
    case "levelK":
      return `${Math.round(v)}K`;
    case "level":
      return v.toFixed(1);
  }
}

export function MacroFedDataBlock() {
  const [selected, setSelected] = useState<string>("CPI");
  const { data, isLoading } = api.asset.economicIndicators.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchInterval: 300_000,
  });

  const def = SERIES.find((s) => s.key === selected) ?? SERIES[0]!;
  const chart = useMemo(
    () => toChart(data?.[def.key], def.mode),
    [data, def.key, def.mode],
  );

  const latest = chart[chart.length - 1];
  // FRED-style: one consistent steel-blue per series (not trend-colored).
  const color = "#5b8fc7";
  const asOf = data?.[def.key]?.[0]?.date;

  const tickFmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" });

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      {/* Header: title + value on the left, Select switcher on the right */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Fed &amp; Economic Data
          </h2>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {latest ? fmtValue(latest.value, def.mode) : "—"}
            </span>
            <span className="text-sm text-muted-foreground">{def.short}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {def.context && latest ? def.context(latest.value) : " "}
            {asOf ? ` · as of ${new Date(asOf).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}
          </div>
        </div>

        <div className="shrink-0">
          <Select
            className="macro-fed-select"
            aria-label="Choose economic indicator"
            value={selected}
            onChange={setSelected}
            options={SERIES.map((s) => ({ value: s.key, label: s.label }))}
          />
        </div>
      </div>

      <div className="h-64">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : chart.length ? (
          <ResponsiveContainer>
            <AreaChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="fedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.16} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis
                dataKey="date"
                tickFormatter={tickFmt}
                minTickGap={48}
                fontSize={11}
                stroke="#9ca3af"
              />
              <YAxis
                fontSize={11}
                width={52}
                stroke="#9ca3af"
                domain={["auto", "auto"]}
                tickFormatter={(v: number) =>
                  def.mode === "yoy" || def.mode === "rate"
                    ? `${v.toFixed(1)}%`
                    : def.mode === "momK" || def.mode === "levelK"
                      ? `${Math.round(v)}K`
                      : v.toFixed(0)
                }
              />
              <ChartTooltip
                content={({ payload, active, label }) => {
                  if (!active || !payload?.length) return null;
                  const v = payload[0]!.value as number;
                  return (
                    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-lg">
                      <div className="text-muted-foreground">
                        {new Date(label as string).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="font-semibold tabular-nums text-foreground">
                        {fmtValue(v, def.mode)}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill="url(#fedFill)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No data
          </div>
        )}
      </div>
    </div>
  );
}

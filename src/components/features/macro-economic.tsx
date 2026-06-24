"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";

const REFETCH = {
  refetchOnMount: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  refetchInterval: 300_000,
} as const;

type Pt = { date: string; value: number };

// ── Terminal section header ─────────────────────────────────────────
export function MacroSection({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="mb-2 flex items-baseline gap-2 border-b border-border pb-1.5">
        <h2 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">
          {label}
        </h2>
        {hint && (
          <span className="font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

// ── Tiny inline sparkline ───────────────────────────────────────────
function Sparkline({
  points,
  positive,
}: {
  points: number[];
  positive: boolean;
}) {
  const d = useMemo(() => {
    if (points.length < 2) return "";
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const w = 72;
    const h = 24;
    const step = w / (points.length - 1);
    return points
      .map((p, i) => {
        const x = i * step;
        const y = h - 1 - ((p - min) / range) * (h - 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);
  if (!d) return null;
  const color = positive ? "var(--positive)" : "var(--negative)";
  return (
    <svg width="72" height="24" viewBox="0 0 72 24" fill="none" aria-hidden>
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Indicator math ──────────────────────────────────────────────────
// Series come newest-first. `valueAgo(s, n)` reads n readings back.
function ago(s: Pt[], n: number): number | undefined {
  return s[n]?.value;
}
// ~12-month-ago reading for YoY, robust to monthly/quarterly cadence.
function yearAgo(s: Pt[]): number | undefined {
  if (!s.length) return undefined;
  const target = new Date(s[0]!.date).getTime() - 360 * 864e5;
  let best: Pt | undefined;
  let bestDiff = Infinity;
  for (const p of s) {
    const diff = Math.abs(new Date(p.date).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best?.value;
}

type Mode = "yoy" | "rate" | "momK" | "claims" | "index";

interface IndDef {
  key: string;
  label: string;
  mode: Mode;
  /** does a rising headline read "good" (green)? */
  higherIsGood: boolean;
  context?: (headline: number) => string;
}

const INDICATORS: IndDef[] = [
  {
    key: "CPI",
    label: "Inflation (CPI, YoY)",
    mode: "yoy",
    higherIsGood: false,
    context: (v) =>
      v > 2.5 ? "above Fed 2% target" : v < 1.5 ? "below target" : "near 2% target",
  },
  {
    key: "unemploymentRate",
    label: "Unemployment",
    mode: "rate",
    higherIsGood: false,
    context: (v) => (v < 4 ? "tight labor market" : v > 5 ? "softening" : "full employment"),
  },
  {
    key: "totalNonfarmPayroll",
    label: "Nonfarm Payrolls (MoM)",
    mode: "momK",
    higherIsGood: true,
    context: (v) => (v > 150 ? "healthy hiring" : v < 0 ? "contraction" : "cooling"),
  },
  {
    key: "initialClaims",
    label: "Initial Jobless Claims",
    mode: "claims",
    higherIsGood: false,
    context: (v) => (v > 300_000 ? "rising stress" : "low"),
  },
  {
    key: "realGDP",
    label: "Real GDP (YoY)",
    mode: "yoy",
    higherIsGood: true,
    context: (v) => (v > 2.5 ? "above trend" : v < 0 ? "recessionary" : "below trend"),
  },
  {
    key: "retailSales",
    label: "Retail Sales (YoY)",
    mode: "yoy",
    higherIsGood: true,
    context: (v) => (v > 4 ? "strong consumer" : v < 0 ? "contracting" : "soft"),
  },
  {
    key: "industrialProductionTotalIndex",
    label: "Industrial Production (YoY)",
    mode: "yoy",
    higherIsGood: true,
  },
  {
    key: "consumerSentiment",
    label: "Consumer Sentiment",
    mode: "index",
    higherIsGood: true,
    context: (v) => (v > 80 ? "optimistic" : v < 60 ? "depressed" : "guarded"),
  },
  {
    key: "federalFunds",
    label: "Fed Funds Rate",
    mode: "rate",
    higherIsGood: false,
    context: (v) => (v > 4 ? "restrictive" : v < 2.5 ? "accommodative" : "neutral"),
  },
  {
    key: "30YearFixedRateMortgageAverage",
    label: "30Y Mortgage Rate",
    mode: "rate",
    higherIsGood: false,
  },
];

interface Computed {
  headline: string;
  numeric: number;
  delta: number | null;
  deltaLabel: string;
  positive: boolean | null;
  spark: number[];
  asOf: string;
}

function compute(def: IndDef, s: Pt[]): Computed | null {
  if (!s.length) return null;
  const latest = s[0]!.value;
  const prev = ago(s, 1);
  const yoy = yearAgo(s);
  const spark = s.slice(0, 18).map((p) => p.value).reverse();
  const asOf = s[0]!.date;

  const colorFor = (rising: boolean | null): boolean | null =>
    rising == null ? null : def.higherIsGood ? rising : !rising;

  switch (def.mode) {
    case "yoy": {
      if (yoy == null || yoy === 0) return null;
      const v = ((latest - yoy) / Math.abs(yoy)) * 100;
      // acceleration vs prior reading's YoY
      const prevYoY =
        prev != null && ago(s, 13) != null && ago(s, 13) !== 0
          ? ((prev - ago(s, 13)!) / Math.abs(ago(s, 13)!)) * 100
          : null;
      const delta = prevYoY != null ? v - prevYoY : null;
      return {
        headline: `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`,
        numeric: v,
        delta,
        deltaLabel: delta != null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}pp MoM` : "",
        positive: colorFor(v >= 0),
        spark: s.slice(0, 18).map((p) => p.value).reverse(),
        asOf,
      };
    }
    case "rate": {
      const delta = prev != null ? latest - prev : null;
      return {
        headline: `${latest.toFixed(2)}%`,
        numeric: latest,
        delta,
        deltaLabel: delta != null ? `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(0)}bps` : "",
        positive: colorFor(delta != null ? delta >= 0 : null),
        spark,
        asOf,
      };
    }
    case "momK": {
      if (prev == null) return null;
      const add = latest - prev; // thousands of jobs
      const deltas = s
        .slice(0, 13)
        .map((p, i, arr) => (arr[i + 1] ? p.value - arr[i + 1]!.value : null))
        .filter((x): x is number => x != null)
        .reverse();
      return {
        headline: `${add >= 0 ? "+" : ""}${Math.round(add)}K`,
        numeric: add,
        delta: null,
        deltaLabel: "jobs added",
        positive: colorFor(add >= 0),
        spark: deltas,
        asOf,
      };
    }
    case "claims": {
      const delta = prev != null ? latest - prev : null;
      return {
        headline: `${Math.round(latest / 1000)}K`,
        numeric: latest,
        delta,
        deltaLabel: delta != null ? `${delta >= 0 ? "+" : ""}${Math.round(delta / 1000)}K WoW` : "",
        positive: colorFor(delta != null ? delta >= 0 : null),
        spark,
        asOf,
      };
    }
    case "index": {
      const delta = prev != null ? latest - prev : null;
      return {
        headline: latest.toFixed(1),
        numeric: latest,
        delta,
        deltaLabel: delta != null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}` : "",
        positive: colorFor(delta != null ? delta >= 0 : null),
        spark,
        asOf,
      };
    }
  }
}

function IndicatorTile({ def, series }: { def: IndDef; series: Pt[] }) {
  const c = compute(def, series);
  const toneText =
    c?.positive == null ? "text-foreground" : c.positive ? "text-positive" : "text-negative";
  return (
    <div className="rounded-lg border border-border bg-foreground/[0.02] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
          {def.label}
        </div>
        {c && <Sparkline points={c.spark} positive={c.positive ?? true} />}
      </div>
      {c ? (
        <>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tabular-nums text-foreground">
              {c.headline}
            </span>
            {c.deltaLabel && (
              <span className={`font-mono text-[0.7rem] font-semibold tabular-nums ${toneText}`}>
                {c.deltaLabel}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="text-[0.66rem] text-muted-foreground">
              {def.context?.(c.numeric) ?? " "}
            </span>
            <span className="font-mono text-[0.6rem] text-muted-foreground/70">
              {c.asOf?.slice(0, 7)}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-2 h-8 animate-pulse rounded bg-muted/40" />
      )}
    </div>
  );
}

export function EconomicIndicatorsSection() {
  const { data, isLoading } = api.asset.economicIndicators.useQuery(undefined, REFETCH);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-foreground/[0.02]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {INDICATORS.map((def) => (
        <IndicatorTile key={def.key} def={def} series={data?.[def.key] ?? []} />
      ))}
    </div>
  );
}

// ── Macro Pulse: synthesized regime read + KPI strip ────────────────
export function MacroPulse() {
  const { data: econ } = api.asset.economicIndicators.useQuery(undefined, REFETCH);
  const { data: tsy } = api.asset.treasuryRates.useQuery(undefined, REFETCH);

  const read = useMemo(() => {
    if (!econ) return null;
    const cpiSeries = econ.CPI ?? [];
    const cpiYoY =
      cpiSeries.length && yearAgo(cpiSeries)
        ? ((cpiSeries[0]!.value - yearAgo(cpiSeries)!) / yearAgo(cpiSeries)!) * 100
        : null;
    const gdpSeries = econ.realGDP ?? [];
    const gdpYoY =
      gdpSeries.length && yearAgo(gdpSeries)
        ? ((gdpSeries[0]!.value - yearAgo(gdpSeries)!) / yearAgo(gdpSeries)!) * 100
        : null;
    const unemp = econ.unemploymentRate?.[0]?.value ?? null;
    const fed = econ.federalFunds?.[0]?.value ?? null;
    const latest = tsy?.[0];
    const tenY = latest?.year10 ?? null;
    const twoY = latest?.year2 ?? null;
    const spread = tenY != null && twoY != null ? tenY - twoY : null;

    const growth = gdpYoY == null ? "—" : gdpYoY > 2.25 ? "Expansion" : gdpYoY > 0 ? "Slowdown" : "Contraction";
    const inflation =
      cpiYoY == null ? "—" : cpiYoY > 3 ? "Reflation" : cpiYoY > 2.3 ? "Sticky" : "Disinflation";
    const curve = spread == null ? "—" : spread < 0 ? "Inverted curve" : spread < 0.5 ? "Flat curve" : "Steepening";

    return { cpiYoY, gdpYoY, unemp, fed, tenY, spread, growth, inflation, curve };
  }, [econ, tsy]);

  const kpis: { label: string; value: string; tone?: "pos" | "neg" }[] = read
    ? [
        { label: "10Y UST", value: read.tenY != null ? `${read.tenY.toFixed(2)}%` : "—" },
        {
          label: "2s10s",
          value: read.spread != null ? `${read.spread >= 0 ? "+" : ""}${(read.spread * 100).toFixed(0)}bps` : "—",
          tone: read.spread != null ? (read.spread >= 0 ? "pos" : "neg") : undefined,
        },
        { label: "Fed Funds", value: read.fed != null ? `${read.fed.toFixed(2)}%` : "—" },
        {
          label: "CPI YoY",
          value: read.cpiYoY != null ? `${read.cpiYoY.toFixed(1)}%` : "—",
          tone: read.cpiYoY != null ? (read.cpiYoY > 2.3 ? "neg" : "pos") : undefined,
        },
        { label: "Unemp", value: read.unemp != null ? `${read.unemp.toFixed(1)}%` : "—" },
        { label: "GDP YoY", value: read.gdpYoY != null ? `${read.gdpYoY.toFixed(1)}%` : "—", tone: read.gdpYoY != null ? (read.gdpYoY > 0 ? "pos" : "neg") : undefined },
      ]
    : [];

  return (
    <div className="rounded-xl border border-border bg-foreground/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground">
          Macro Regime
        </span>
        {read ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {[read.growth, read.inflation, read.curve].map((t) => (
              <span
                key={t}
                className="rounded border border-border bg-foreground/[0.04] px-2 py-0.5 font-mono text-[0.7rem] font-semibold text-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        ) : (
          <span className="h-5 w-48 animate-pulse rounded bg-muted/40" />
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-6">
        {(kpis.length ? kpis : Array.from({ length: 6 }).map(() => null)).map((k, i) => (
          <div key={i} className="bg-background p-2.5">
            <div className="font-mono text-[0.58rem] uppercase tracking-wide text-muted-foreground">
              {k?.label ?? " "}
            </div>
            <div
              className={`font-mono text-base font-bold tabular-nums ${
                k?.tone === "pos" ? "text-positive" : k?.tone === "neg" ? "text-negative" : "text-foreground"
              }`}
            >
              {k?.value ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

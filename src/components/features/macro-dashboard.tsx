"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { ChartTooltip } from "~/components/ui/chart";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import Image from "next/image";
import { useNewsSummary } from "~/hooks/use-news-summary";

// ── Types & Context ─────────────────────────────────────────────────

type MacroTimeFrame = "1D" | "1W" | "1M" | "1Y";

const TimeFrameContext = createContext<MacroTimeFrame>("1D");

const TIMEFRAME_TRADING_DAYS: Record<MacroTimeFrame, number> = {
  "1D": 1,
  "1W": 5,
  "1M": 21,
  "1Y": 252,
};

const TIMEFRAME_CHART_POINTS: Record<MacroTimeFrame, number> = {
  "1D": 5,
  "1W": 10,
  "1M": 30,
  "1Y": 90,
};

// ── Shared ──────────────────────────────────────────────────────────

const REFETCH_OPTS = {
  refetchOnMount: false,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  refetchInterval: 120_000,
} as const;

function CardShell({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-background p-4 ${className}`}
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-6 animate-pulse rounded bg-muted/50" />
      ))}
    </div>
  );
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function formatLargeNumber(n: number): string {
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(2);
}

// ── TimeFrame Selector ──────────────────────────────────────────────

function TimeFrameSelector({
  value,
  onChange,
}: {
  value: MacroTimeFrame;
  onChange: (tf: MacroTimeFrame) => void;
}) {
  const options: MacroTimeFrame[] = ["1D", "1W", "1M", "1Y"];
  return (
    <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
      {options.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            value === tf
              ? "bg-foreground/10 text-foreground shadow-xs"
              : "text-muted-foreground hover:text-muted-foreground"
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

// ── Change calculation from historical data ─────────────────────────

function useHistoricalChange(
  historical: { date: string; close: number }[] | undefined,
  currentPrice: number | undefined,
  timeFrame: MacroTimeFrame,
  previousClose?: number | null,
): { changePercent: number | null; loading: boolean } {
  return useMemo(() => {
    if (!currentPrice) return { changePercent: null, loading: false };

    // For 1D, use the live quote's previousClose (FMP provides the actual
    // prior session's close, not today's intraday close). The historical
    // endpoint returns today's partial close, which would make the change
    // look like ~0%.
    if (timeFrame === "1D" && previousClose != null && previousClose > 0) {
      const changePercent =
        ((currentPrice - previousClose) / previousClose) * 100;
      return { changePercent, loading: false };
    }

    if (!historical?.length) return { changePercent: null, loading: false };

    // Sort chronologically (oldest first).
    const sorted = [...historical].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // For longer timeframes, skip the most recent entry if it matches today
    // (FMP returns the current session's intraday close as the last bar,
    // which is essentially the live price and would yield ~0%). Walk back
    // until we find a prior session.
    const isToday = (d: string) => {
      const t = new Date(d);
      const now = new Date();
      return (
        t.getUTCFullYear() === now.getUTCFullYear() &&
        t.getUTCMonth() === now.getUTCMonth() &&
        t.getUTCDate() === now.getUTCDate()
      );
    };
    let baseIdx = sorted.length - 1;
    if (isToday(sorted[baseIdx]?.date ?? "")) {
      baseIdx -= 1;
    }
    if (baseIdx < 0) return { changePercent: null, loading: false };

    const days = TIMEFRAME_TRADING_DAYS[timeFrame];
    const idx = Math.max(0, baseIdx + 1 - days);
    const pastPrice = sorted[idx]?.close;

    if (!pastPrice) return { changePercent: null, loading: false };

    const changePercent = ((currentPrice - pastPrice) / pastPrice) * 100;
    return { changePercent, loading: false };
  }, [historical, currentPrice, timeFrame, previousClose]);
}

function ChangeDisplay({
  changePercent,
  className = "",
}: {
  changePercent: number | null;
  className?: string;
}) {
  if (changePercent == null) {
    return <span className={`text-muted-foreground ${className}`}>—</span>;
  }
  const positive = changePercent >= 0;
  return (
    <span
      className={`font-semibold ${positive ? "text-green-400" : "text-red-400"} ${className}`}
    >
      {positive ? "+" : ""}
      {changePercent.toFixed(2)}%
    </span>
  );
}

// ── Fear & Greed / VIX ─────────────────────────────────────────────

const VIX_LEVELS = [
  { max: 12, label: "Extreme Low", color: "text-green-300" },
  { max: 20, label: "Normal", color: "text-green-400" },
  { max: 25, label: "Elevated", color: "text-yellow-400" },
  { max: 30, label: "High", color: "text-orange-400" },
  { max: Infinity, label: "Extreme Fear", color: "text-red-400" },
] as const;

function VixCard() {
  const timeFrame = useContext(TimeFrameContext);
  const { data, isLoading } = api.asset.equityQuote.useQuery(
    "^VIX",
    REFETCH_OPTS,
  );
  const { data: histData } = api.asset.equityPriceHistoricalFMP.useQuery(
    "^VIX",
    REFETCH_OPTS,
  );

  const quote = data?.[0];
  const level = VIX_LEVELS.find((l) => (quote?.price ?? 0) < l.max);

  const { changePercent } = useHistoricalChange(
    histData?.historical,
    quote?.price ?? undefined,
    timeFrame,
    quote?.previousClose,
  );

  const chartData = useMemo(() => {
    if (!histData?.historical) return [];
    return [...histData.historical]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-TIMEFRAME_CHART_POINTS[timeFrame])
      .map((d) => ({ date: d.date, value: d.close }));
  }, [histData, timeFrame]);

  return (
    <CardShell title="VIX — Volatility Index">
      {isLoading ? (
        <SkeletonRows count={3} />
      ) : quote ? (
        <div>
          <div className="mb-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-foreground">
              {quote.price?.toFixed(2)}
            </span>
            <ChangeDisplay changePercent={changePercent} className="text-sm" />
          </div>
          <span className={`text-sm font-medium ${level?.color}`}>
            {level?.label}
          </span>
          <div className="mt-1 text-xs text-muted-foreground">
            Day range: {quote.dayLow?.toFixed(2)} – {quote.dayHigh?.toFixed(2)}{" "}
            | Year: {quote.yearLow?.toFixed(2)} – {quote.yearHigh?.toFixed(2)}
          </div>
          {chartData.length > 0 && (
            <div className="mt-3 h-32">
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="vixGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#ef4444"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#ef4444"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="value"
                    stroke="#ef4444"
                    fill="url(#vixGrad)"
                    dot={false}
                    strokeWidth={1.5}
                  />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <ChartTooltip
                    content={({ payload, active }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0] as {
                        payload: { date: string };
                        value: number;
                      };
                      return (
                        <div className="rounded bg-primary px-2 py-1 text-xs text-black shadow-sm">
                          {p.payload.date}: {p.value?.toFixed(2)}
                        </div>
                      );
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="text-muted-foreground">No data</div>
      )}
    </CardShell>
  );
}

// ── Fear & Greed Index ──────────────────────────────────────────────

const FEAR_GREED_LEVELS = [
  { max: 24, label: "Extreme Fear", color: "text-green-400", bgColor: "bg-green-500" },
  { max: 44, label: "Fear", color: "text-blue-400", bgColor: "bg-blue-500" },
  { max: 55, label: "Neutral", color: "text-yellow-400", bgColor: "bg-yellow-500" },
  { max: 75, label: "Greed", color: "text-orange-400", bgColor: "bg-orange-500" },
  { max: 100, label: "Extreme Greed", color: "text-red-400", bgColor: "bg-red-500" },
] as const;

function FearGreedCard() {
  const { data, isLoading } = api.asset.fearGreedIndex.useQuery(
    undefined,
    REFETCH_OPTS,
  );

  // Create gauge segments for visualization
  const gaugeSegments = useMemo(() => {
    const segments: Array<{
      max: number;
      label: string;
      color: string;
      bgColor: string;
      width: number;
      start: number;
    }> = [];
    let start = 0;
    for (const level of FEAR_GREED_LEVELS) {
      const width = level.max - start;
      segments.push({
        ...level,
        width,
        start,
      });
      start = level.max;
    }
    return segments;
  }, []);

  return (
    <CardShell title="CNN Fear & Greed Index">
      {isLoading ? (
        <SkeletonRows count={3} />
      ) : data ? (
        <div>
          <div className="mb-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-foreground">
              {data.value}
            </span>
            <div className="flex flex-col">
              <ChangeDisplay 
                changePercent={data.changePercentage} 
                className="text-sm" 
              />
              <span className="text-xs text-muted-foreground">
                vs previous close
              </span>
            </div>
          </div>
          
          <span className={`text-sm font-medium ${data.colorClass}`}>
            {data.classification}
          </span>
          
          {/* Gauge visualization */}
          <div className="mt-3">
            <div className="relative h-2 w-full rounded-full bg-muted">
              {gaugeSegments.map((seg, i) => (
                <div
                  key={i}
                  className={`absolute h-full ${seg.bgColor} rounded-full`}
                  style={{
                    left: `${seg.start}%`,
                    width: `${seg.width}%`,
                  }}
                />
              ))}
              <div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-border bg-primary shadow-lg"
                style={{ left: `${data.value}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>25</span>
              <span>45</span>
              <span>56</span>
              <span>76</span>
              <span>100</span>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Previous Close:</span>
              <span className="text-muted-foreground">{data.previousClose}</span>
            </div>
            <div className="flex justify-between">
              <span>Change:</span>
              <span className={`${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.change >= 0 ? '+' : ''}{data.change.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span className="text-muted-foreground">
                {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-muted-foreground">
            Measures market sentiment from 0 (Extreme Fear) to 100 (Extreme Greed).
            Extreme fear can indicate buying opportunities, while extreme greed may signal overbought conditions.
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground">No data</div>
      )}
    </CardShell>
  );
}

// ── US Dollar Index (DXY) ───────────────────────────────────────────

function DollarIndexCard() {
  const timeFrame = useContext(TimeFrameContext);
  const { data, isLoading } = api.asset.equityQuote.useQuery(
    "DXUSD",
    REFETCH_OPTS,
  );
  const { data: histData } = api.asset.equityPriceHistoricalFMP.useQuery(
    "DXUSD",
    REFETCH_OPTS,
  );

  const quote = data?.[0];

  const { changePercent } = useHistoricalChange(
    histData?.historical,
    quote?.price ?? undefined,
    timeFrame,
  );

  const chartData = useMemo(() => {
    if (!histData?.historical) return [];
    return [...histData.historical]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-TIMEFRAME_CHART_POINTS[timeFrame])
      .map((d) => ({ date: d.date, value: d.close }));
  }, [histData, timeFrame]);

  return (
    <CardShell title="US Dollar Index (DXY)">
      {isLoading ? (
        <SkeletonRows count={3} />
      ) : quote ? (
        <div>
          <div className="mb-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-foreground">
              {quote.price?.toFixed(2)}
            </span>
            <ChangeDisplay changePercent={changePercent} className="text-sm" />
          </div>
          <div className="text-xs text-muted-foreground">
            Day range: {quote.dayLow?.toFixed(2)} – {quote.dayHigh?.toFixed(2)}{" "}
            | Year: {quote.yearLow?.toFixed(2)} – {quote.yearHigh?.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Broad USD strength vs. a basket of major currencies — a rising
            dollar pressures commodities, EM, and US export earnings.
          </div>
          {chartData.length > 0 && (
            <div className="mt-3 h-32">
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="dxyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#f59e0b"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#f59e0b"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="value"
                    stroke="#f59e0b"
                    fill="url(#dxyGrad)"
                    dot={false}
                    strokeWidth={1.5}
                  />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <ChartTooltip
                    content={({ payload, active }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0] as {
                        payload: { date: string };
                        value: number;
                      };
                      return (
                        <div className="rounded bg-primary px-2 py-1 text-xs text-black shadow-sm">
                          {p.payload.date}: {p.value?.toFixed(2)}
                        </div>
                      );
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="text-muted-foreground">No data</div>
      )}
    </CardShell>
  );
}

// ── Carry Trade & Risk (compact) ────────────────────────────────────

function CarryRiskCard() {
  const timeFrame = useContext(TimeFrameContext);

  const { data: jpy, isLoading: jpyLoading } = api.asset.forexQuote.useQuery(
    "USDJPY",
    REFETCH_OPTS,
  );
  const { data: jpyHist } = api.asset.forexHistorical.useQuery(
    "USDJPY",
    REFETCH_OPTS,
  );
  const jpyRate = jpy?.bid ?? jpy?.ask ?? 0;
  const { changePercent: jpyChange } = useHistoricalChange(
    jpyHist?.historical,
    jpyRate || undefined,
    timeFrame,
  );
  const distanceTo160 = 160 - jpyRate;
  const nearWarning = jpyRate >= 155;

  const { data: btc } = api.asset.equityQuote.useQuery("BTCUSD", REFETCH_OPTS);
  const { data: btcHist } = api.asset.equityPriceHistoricalFMP.useQuery(
    "BTCUSD",
    REFETCH_OPTS,
  );
  const btcQuote = btc?.[0];
  const { changePercent: btcChange } = useHistoricalChange(
    btcHist?.historical,
    btcQuote?.price ?? undefined,
    timeFrame,
  );

  return (
    <CardShell title="Carry Trade & Risk">
      {jpyLoading ? (
        <SkeletonRows count={3} />
      ) : (
        <div>
          <div className="flex items-center justify-between border-b border-border py-2">
            <div>
              <span className="text-sm font-medium text-foreground">USD/JPY</span>
              <span className="ml-2 text-xs text-muted-foreground">Yen Carry</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                ¥{jpyRate.toFixed(2)}
              </span>
              <ChangeDisplay
                changePercent={jpyChange}
                className="min-w-[60px] text-right text-xs"
              />
            </div>
          </div>
          <div
            className={`mt-2 rounded px-2 py-1 text-[11px] font-medium ${
              nearWarning
                ? "bg-red-500/20 text-red-300"
                : "bg-green-500/20 text-green-300"
            }`}
          >
            {nearWarning
              ? `⚠ ${distanceTo160.toFixed(2)} from 160 — BOJ intervention zone`
              : `${distanceTo160.toFixed(2)} from the 160 intervention level`}
          </div>
          <div className="mt-2 flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium text-foreground">Bitcoin</span>
              <span className="ml-2 text-xs text-muted-foreground">Risk Sentiment</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {btcQuote?.price
                  ? `$${formatLargeNumber(btcQuote.price)}`
                  : "—"}
              </span>
              <ChangeDisplay
                changePercent={btcChange}
                className="min-w-[60px] text-right text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </CardShell>
  );
}

// ── Global Market Indices ───────────────────────────────────────────

const GLOBAL_INDICES = [
  { symbol: "^GSPC", label: "S&P 500", region: "US" },
  { symbol: "^DJI", label: "Dow Jones", region: "US" },
  { symbol: "^IXIC", label: "NASDAQ", region: "US" },
  { symbol: "^RUT", label: "Russell 2000", region: "US" },
  { symbol: "^FTSE", label: "FTSE 100", region: "UK" },
  { symbol: "^GDAXI", label: "DAX", region: "Germany" },
  { symbol: "^N225", label: "Nikkei 225", region: "Japan" },
  { symbol: "^HSI", label: "Hang Seng", region: "Hong Kong" },
  { symbol: "^STOXX50E", label: "Euro Stoxx 50", region: "Europe" },
] as const;

function IndexRow({
  symbol,
  label,
  region,
}: {
  symbol: string;
  label: string;
  region: string;
}) {
  const timeFrame = useContext(TimeFrameContext);
  const { data, isLoading } = api.asset.equityQuote.useQuery(
    symbol,
    REFETCH_OPTS,
  );
  const { data: histData } = api.asset.equityPriceHistoricalFMP.useQuery(
    symbol,
    REFETCH_OPTS,
  );

  const quote = data?.[0];
  const { changePercent } = useHistoricalChange(
    histData?.historical,
    quote?.price ?? undefined,
    timeFrame,
    quote?.previousClose,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="h-5 w-32 animate-pulse rounded bg-muted/50" />
        <div className="h-5 w-20 animate-pulse rounded bg-muted/50" />
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="ml-2 text-xs text-muted-foreground">{region}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {formatLargeNumber(quote.price ?? 0)}
        </span>
        <ChangeDisplay
          changePercent={changePercent}
          className="min-w-[70px] text-right text-sm"
        />
      </div>
    </div>
  );
}

function GlobalIndicesCard() {
  return (
    <CardShell title="Global Market Indices">
      {GLOBAL_INDICES.map((idx) => (
        <IndexRow key={idx.symbol} {...idx} />
      ))}
    </CardShell>
  );
}

// ── Sector Performance ──────────────────────────────────────────────

function SectorPerformanceCard() {
  const timeFrame = useContext(TimeFrameContext);
  const { data, isLoading } = api.asset.sectorPerformanceTimeframe.useQuery(
    undefined,
    REFETCH_OPTS,
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    return data
      .map((s) => ({
        name: s.sector.replace("_", " "),
        value: s[timeFrame],
      }))
      .filter((s): s is { name: string; value: number } => s.value !== null)
      .sort((a, b) => b.value - a.value);
  }, [data, timeFrame]);

  // Money rotation for the selected timeframe: the cross-sector average is the
  // "market" proxy — capital rotates out of below-average sectors into
  // above-average ones (relative strength).
  const rotation = useMemo(() => {
    const vals = chartData;
    if (vals.length < 2) return null;
    const avg = vals.reduce((a, b) => a + b.value, 0) / vals.length;
    const inflow = vals.filter((s) => s.value > avg).slice(0, 3);
    const outflow = vals
      .filter((s) => s.value < avg)
      .slice(-3)
      .reverse();
    return { avg, inflow, outflow };
  }, [chartData]);

  // Potential trend: compare this week's pace (1W) to the average weekly pace
  // over the past month (1M ÷ ~4.2 weeks). A positive gap = momentum building.
  const trending = useMemo(() => {
    if (!data) return null;
    const scored = data
      .map((s) => {
        const w = s["1W"];
        const m = s["1M"];
        if (w == null || m == null) return null;
        return { name: s.sector.replace("_", " "), accel: w - m / 4.2 };
      })
      .filter((x): x is { name: string; accel: number } => x !== null)
      .sort((a, b) => b.accel - a.accel);
    if (scored.length < 2) return null;
    return {
      gaining: scored.filter((s) => s.accel > 0).slice(0, 3),
      fading: scored.filter((s) => s.accel < 0).slice(-2).reverse(),
    };
  }, [data]);

  const fmtPct = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";

  return (
    <CardShell title={`Sector Performance · ${timeFrame}`}>
      {isLoading ? (
        <SkeletonRows count={6} />
      ) : chartData.length > 0 ? (
        <>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="var(--border-light)"
              />
              <XAxis
                type="number"
                fontSize={11}
                tickFormatter={(v: number) => v.toFixed(1) + "%"}
                stroke="#9ca3af"
              />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={10}
                width={120}
                stroke="#9ca3af"
                tick={{ fill: "#d1d5db" }}
              />
              <ChartTooltip
                content={({ payload, active }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0] as {
                    payload: { name: string };
                    value: number;
                  };
                  return (
                    <div className="rounded bg-primary px-2 py-1 text-xs text-black shadow-sm">
                      {p.payload.name}: {p.value?.toFixed(2)}%
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.value >= 0 ? "#22c55e" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {(rotation ?? trending) && (
          <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
            {rotation && (
              <>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-muted-foreground">Money rotating into:</span>
                  {rotation.inflow.length > 0 ? (
                    rotation.inflow.map((s) => (
                      <span key={s.name} className="text-green-400">
                        {s.name}{" "}
                        <span className="text-green-500/70">
                          {fmtPct(s.value)}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-muted-foreground">Out of:</span>
                  {rotation.outflow.length > 0 ? (
                    rotation.outflow.map((s) => (
                      <span key={s.name} className="text-red-400">
                        {s.name}{" "}
                        <span className="text-red-500/70">
                          {fmtPct(s.value)}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </>
            )}
            {trending && trending.gaining.length > 0 && (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-muted-foreground">
                  Potential trend <span className="text-muted-foreground">(1W vs 1M pace)</span>:
                </span>
                {trending.gaining.map((s) => (
                  <span key={s.name} className="text-green-400">
                    ↑ {s.name}
                  </span>
                ))}
                {trending.fading.map((s) => (
                  <span key={s.name} className="text-muted-foreground">
                    ↓ {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        </>
      ) : (
        <div className="text-muted-foreground">No data</div>
      )}
    </CardShell>
  );
}

// ── Treasury Yield Curve ────────────────────────────────────────────

const TENOR_LABELS: Record<string, string> = {
  month1: "1M",
  month2: "2M",
  month3: "3M",
  month6: "6M",
  year1: "1Y",
  year2: "2Y",
  year3: "3Y",
  year5: "5Y",
  year7: "7Y",
  year10: "10Y",
  year20: "20Y",
  year30: "30Y",
};

function TreasuryCard() {
  const { data, isLoading } = api.asset.treasuryRates.useQuery(
    undefined,
    REFETCH_OPTS,
  );

  const latestCurve = useMemo(() => {
    if (!data?.length) return [];
    const latest = data[0]!;
    return Object.entries(TENOR_LABELS).map(([key, label]) => ({
      tenor: label,
      rate: (latest as Record<string, unknown>)[key] as number,
    }));
  }, [data]);

  const prevCurve = useMemo(() => {
    if (!data || data.length < 7) return [];
    const prev = data[6]!;
    return Object.entries(TENOR_LABELS).map(([key, label]) => ({
      tenor: label,
      rate: (prev as Record<string, unknown>)[key] as number,
    }));
  }, [data]);

  const combinedData = useMemo(() => {
    return latestCurve.map((d, i) => ({
      tenor: d.tenor,
      current: d.rate,
      weekAgo: prevCurve[i]?.rate,
    }));
  }, [latestCurve, prevCurve]);

  const tenYear = latestCurve.find((d) => d.tenor === "10Y")?.rate;
  const twoYear = latestCurve.find((d) => d.tenor === "2Y")?.rate;
  const spreadBps =
    tenYear != null && twoYear != null ? (tenYear - twoYear) * 100 : null;
  const is2s10sInverted = spreadBps != null && spreadBps < 0;

  return (
    <CardShell title="US Treasury Yield Curve">
      {isLoading ? (
        <SkeletonRows count={4} />
      ) : combinedData.length > 0 ? (
        <div>
          <div className="mb-3 flex items-baseline gap-6">
            <div>
              <span className="text-2xl font-bold text-foreground">
                {tenYear != null ? `${tenYear.toFixed(2)}%` : "—"}
              </span>
              <span className="ml-1.5 text-xs text-muted-foreground">US 10Y</span>
            </div>
            <div>
              <span
                className={`text-lg font-semibold ${
                  spreadBps != null && spreadBps >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {spreadBps != null
                  ? `${spreadBps >= 0 ? "+" : ""}${spreadBps.toFixed(0)} bps`
                  : "—"}
              </span>
              <span className="ml-1.5 text-xs text-muted-foreground">2s/10s</span>
            </div>
          </div>
          {is2s10sInverted && (
            <div className="mb-2 rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-300">
              2s/10s spread inverted — historically a recession signal
            </div>
          )}
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis
                  dataKey="tenor"
                  fontSize={11}
                  stroke="#9ca3af"
                  tick={{ fill: "#d1d5db" }}
                />
                <YAxis
                  fontSize={11}
                  stroke="#9ca3af"
                  tickFormatter={(v: number) => v.toFixed(2) + "%"}
                  domain={["dataMin - 0.2", "dataMax + 0.2"]}
                />
                <ChartTooltip
                  content={({ payload, active, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded bg-primary px-2 py-1 text-xs text-black shadow-sm">
                        <div className="font-semibold">{label as string}</div>
                        {(
                          payload as {
                            name: string;
                            value: number;
                            color: string;
                          }[]
                        ).map((p) => (
                          <div key={p.name} style={{ color: p.color }}>
                            {p.name === "current" ? "Today" : "1W Ago"}:{" "}
                            {p.value?.toFixed(3)}%
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="weekAgo"
                  stroke="#6b7280"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-blue-500" /> Today (
              {data?.[0]?.date})
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 border-t border-dashed border-gray-500" />{" "}
              1 Week Ago
            </span>
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground">No data</div>
      )}
    </CardShell>
  );
}

// ── Economic Calendar ───────────────────────────────────────────────

function EconomicCalendarCard() {
  const { data, isLoading } = api.asset.economicCalendar.useQuery(
    undefined,
    REFETCH_OPTS,
  );

  const events = useMemo(() => {
    if (!data) return [];
    const majorCountries = new Set([
      "US",
      "GB",
      "JP",
      "EU",
      "DE",
      "CN",
      "CA",
      "AU",
    ]);
    return data
      .filter(
        (e) =>
          majorCountries.has(e.country) &&
          (e.impact === "High" || e.impact === "Medium"),
      )
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )
      .slice(0, 15);
  }, [data]);

  return (
    <CardShell title="Upcoming Economic Events">
      {isLoading ? (
        <SkeletonRows count={5} />
      ) : events.length > 0 ? (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2 text-left font-medium">Date</th>
                <th className="pb-2 text-left font-medium">Event</th>
                <th className="pb-2 text-center font-medium">Impact</th>
                <th className="pb-2 text-right font-medium">Est.</th>
                <th className="pb-2 text-right font-medium">Prev.</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-1.5 text-muted-foreground">
                    {format(new Date(e.date), "MMM d")}
                  </td>
                  <td className="py-1.5 text-foreground">
                    <span className="mr-1 text-muted-foreground">{e.country}</span>
                    {e.event}
                  </td>
                  <td className="py-1.5 text-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        e.impact === "High"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-yellow-500/20 text-yellow-300"
                      }`}
                    >
                      {e.impact}
                    </span>
                  </td>
                  <td className="py-1.5 text-right text-muted-foreground">
                    {e.estimate != null ? e.estimate : "—"}
                  </td>
                  <td className="py-1.5 text-right text-muted-foreground">
                    {e.previous != null ? e.previous : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-muted-foreground">No upcoming events</div>
      )}
    </CardShell>
  );
}

// ── General / International News ────────────────────────────────────

const TIER1_SOURCES = new Set([
  "reuters",
  "bloomberg",
  "wall street journal",
  "wsj",
  "financial times",
  "cnbc",
  "the economist",
  "associated press",
  "ap news",
  "bbc",
]);

const TIER2_SOURCES = new Set([
  "marketwatch",
  "barrons",
  "yahoo finance",
  "seeking alpha",
  "investing.com",
  "business insider",
  "fortune",
  "forbes",
  "the motley fool",
  "benzinga",
]);

function scoreArticle(article: {
  site: string;
  symbol?: string;
  publishedDate: string;
}): number {
  let score = 0;
  const siteLower = article.site.toLowerCase();

  if (TIER1_SOURCES.has(siteLower)) score += 100;
  else if (TIER2_SOURCES.has(siteLower)) score += 50;

  if (article.symbol) score += 20;

  // Recency bonus: articles from last 4 hours get a boost
  const ageMs = Date.now() - new Date(article.publishedDate).getTime();
  if (ageMs < 4 * 60 * 60 * 1000) score += 30;
  else if (ageMs < 12 * 60 * 60 * 1000) score += 10;

  return score;
}

function NewsSummary({
  articles,
  cacheKey,
  context,
}: {
  articles: { title: string; text: string }[];
  cacheKey: string;
  context: string;
}) {
  const { summary, status, source } = useNewsSummary(
    articles,
    cacheKey,
    context,
  );

  if (status === "idle") return null;

  return (
    <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
          {source === "ai" ? "AI Summary" : "Key Headlines"}
        </span>
        {status === "summarizing" && (
          <span className="text-[10px] text-muted-foreground">generating...</span>
        )}
        {status === "done" && source && (
          <span className="ml-auto text-[10px] text-gray-600">
            {source === "ai" ? "Chrome Built-in AI" : "Auto-generated"}
          </span>
        )}
      </div>
      {status === "summarizing" ? (
        <div className="space-y-1.5">
          <div className="h-3 w-full animate-pulse rounded bg-primary/10" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-primary/10" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-primary/10" />
        </div>
      ) : (
        <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
          {summary}
        </p>
      )}
    </div>
  );
}

function GeneralNewsCard() {
  const { data, isLoading } = api.asset.generalNews.useQuery(
    undefined,
    REFETCH_OPTS,
  );

  const sortedData = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const scoreDiff = scoreArticle(b) - scoreArticle(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (
        new Date(b.publishedDate).getTime() -
        new Date(a.publishedDate).getTime()
      );
    });
  }, [data]);

  return (
    <CardShell title="Market News">
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse gap-3 border-b border-border pb-3"
            >
              <div className="h-16 w-16 rounded bg-muted/50" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-4 w-3/4 rounded bg-muted/50" />
                <div className="h-3 w-1/2 rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedData.length > 0 ? (
        <div>
          <NewsSummary
            articles={sortedData}
            cacheKey="macro-news"
            context="These are today's financial market news articles. Provide a concise macro market summary highlighting the most important themes and market-moving events."
          />
          <div className="max-h-[400px] overflow-auto">
            <div className="flex flex-col gap-3">
              {sortedData.map((article, i) => (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 rounded-lg border-b border-border pb-3 transition-colors hover:bg-accent last:border-0"
                >
                  {article.image && (
                    <div className="relative h-16 w-16 shrink-0">
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="rounded object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground hover:underline">
                      {article.title}
                    </span>
                    {article.text && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {article.text}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{article.site}</span>
                      <span>
                        {format(
                          new Date(article.publishedDate),
                          "MMM d, h:mm a",
                        )}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground">No news available</div>
      )}
    </CardShell>
  );
}

// ── Key Forex Pairs ─────────────────────────────────────────────────

const FOREX_PAIRS = [
  { pair: "EURUSD", label: "EUR/USD" },
  { pair: "GBPUSD", label: "GBP/USD" },
  { pair: "USDCNY", label: "USD/CNY" },
  { pair: "USDCHF", label: "USD/CHF" },
] as const;

function ForexRow({ pair, label }: { pair: string; label: string }) {
  const timeFrame = useContext(TimeFrameContext);
  const { data, isLoading } = api.asset.forexQuote.useQuery(
    pair,
    REFETCH_OPTS,
  );
  const { data: histData } = api.asset.forexHistorical.useQuery(
    pair,
    REFETCH_OPTS,
  );

  const rate = data?.bid ?? 0;
  const { changePercent } = useHistoricalChange(
    histData?.historical,
    rate || undefined,
    timeFrame,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="h-5 w-20 animate-pulse rounded bg-muted/50" />
        <div className="h-5 w-16 animate-pulse rounded bg-muted/50" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{data.bid?.toFixed(4)}</span>
        <ChangeDisplay
          changePercent={changePercent}
          className="min-w-[60px] text-right text-xs"
        />
      </div>
    </div>
  );
}

function ForexCard() {
  return (
    <CardShell title="Key Forex Rates">
      {FOREX_PAIRS.map((fp) => (
        <ForexRow key={fp.pair} {...fp} />
      ))}
    </CardShell>
  );
}

// ── Commodities ─────────────────────────────────────────────────────

const COMMODITIES = [
  { symbol: "GCUSD", label: "Gold" },
  { symbol: "SIUSD", label: "Silver" },
  { symbol: "CLUSD", label: "WTI Crude Oil" },
  { symbol: "BZUSD", label: "Brent Crude Oil" },
  { symbol: "HGUSD", label: "Copper" },
] as const;

function CommodityRow({ symbol, label }: { symbol: string; label: string }) {
  const timeFrame = useContext(TimeFrameContext);
  const { data, isLoading } = api.asset.equityQuote.useQuery(
    symbol,
    REFETCH_OPTS,
  );
  const { data: histData } = api.asset.equityPriceHistoricalFMP.useQuery(
    symbol,
    REFETCH_OPTS,
  );

  const quote = data?.[0];
  const { changePercent } = useHistoricalChange(
    histData?.historical,
    quote?.price ?? undefined,
    timeFrame,
    quote?.previousClose,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="h-5 w-20 animate-pulse rounded bg-muted/50" />
        <div className="h-5 w-16 animate-pulse rounded bg-muted/50" />
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          ${quote.price?.toFixed(2)}
        </span>
        <ChangeDisplay
          changePercent={changePercent}
          className="min-w-[60px] text-right text-xs"
        />
      </div>
    </div>
  );
}

function CommoditiesCard() {
  return (
    <CardShell title="Commodities">
      {COMMODITIES.map((c) => (
        <CommodityRow key={c.symbol} {...c} />
      ))}
    </CardShell>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────

export function MacroDashboard() {
  const [timeFrame, setTimeFrame] = useState<MacroTimeFrame>("1D");
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-xl border border-border bg-background"
          />
        ))}
      </div>
    );
  }

  return (
    <TimeFrameContext.Provider value={timeFrame}>
      <div className="p-4">
        {/* Sticky timeframe selector */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Showing % change over selected period
          </span>
          <TimeFrameSelector value={timeFrame} onChange={setTimeFrame} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Row 1: Key indicators */}
          <VixCard />
          <DollarIndexCard />
          <TreasuryCard />

          {/* Row 2: Markets & Sectors */}
          <GlobalIndicesCard />
          <SectorPerformanceCard />
          <div className="flex flex-col gap-4">
            <ForexCard />
            <CommoditiesCard />
            <CarryRiskCard />
            <FearGreedCard />
          </div>

          {/* Row 3: Calendar & News */}
          <EconomicCalendarCard />
          <div className="md:col-span-1 xl:col-span-2">
            <GeneralNewsCard />
          </div>
        </div>
      </div>
    </TimeFrameContext.Provider>
  );
}

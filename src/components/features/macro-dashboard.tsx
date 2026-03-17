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
      className={`rounded-xl border border-[#424975] bg-[#151624] p-4 ${className}`}
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
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
        <div key={i} className="h-6 animate-pulse rounded bg-gray-700/50" />
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
    <div className="inline-flex rounded-lg border border-[#424975] bg-[#151624] p-0.5">
      {options.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            value === tf
              ? "bg-white/10 text-white shadow-sm"
              : "text-gray-400 hover:text-gray-200"
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
): { changePercent: number | null; loading: boolean } {
  return useMemo(() => {
    if (!currentPrice) return { changePercent: null, loading: false };
    if (!historical?.length) return { changePercent: null, loading: false };

    // Sort chronologically (oldest first)
    const sorted = [...historical].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const days = TIMEFRAME_TRADING_DAYS[timeFrame];
    const idx = Math.max(0, sorted.length - days);
    const pastPrice = sorted[idx]?.close;

    if (!pastPrice) return { changePercent: null, loading: false };

    const changePercent = ((currentPrice - pastPrice) / pastPrice) * 100;
    return { changePercent, loading: false };
  }, [historical, currentPrice, timeFrame]);
}

function ChangeDisplay({
  changePercent,
  className = "",
}: {
  changePercent: number | null;
  className?: string;
}) {
  if (changePercent == null) {
    return <span className={`text-gray-500 ${className}`}>—</span>;
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
  );

  const chartData = useMemo(() => {
    if (!histData?.historical) return [];
    return [...histData.historical]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-90)
      .map((d) => ({ date: d.date, value: d.close }));
  }, [histData]);

  return (
    <CardShell title="VIX — Volatility Index">
      {isLoading ? (
        <SkeletonRows count={3} />
      ) : quote ? (
        <div>
          <div className="mb-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white">
              {quote.price?.toFixed(2)}
            </span>
            <ChangeDisplay changePercent={changePercent} className="text-sm" />
          </div>
          <span className={`text-sm font-medium ${level?.color}`}>
            {level?.label}
          </span>
          <div className="mt-1 text-xs text-gray-500">
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
                        <div className="rounded bg-white px-2 py-1 text-xs text-black shadow">
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
        <div className="text-gray-500">No data</div>
      )}
    </CardShell>
  );
}

// ── USD/JPY ─────────────────────────────────────────────────────────

function UsdJpyCard() {
  const timeFrame = useContext(TimeFrameContext);
  const { data, isLoading } = api.asset.forexQuote.useQuery(
    "USDJPY",
    REFETCH_OPTS,
  );
  const { data: histData } = api.asset.forexHistorical.useQuery(
    "USDJPY",
    REFETCH_OPTS,
  );

  const rate = data?.bid ?? data?.ask ?? 0;

  const { changePercent } = useHistoricalChange(
    histData?.historical,
    rate || undefined,
    timeFrame,
  );

  const chartData = useMemo(() => {
    if (!histData?.historical) return [];
    return [...histData.historical]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-180)
      .map((d) => ({ date: d.date, value: d.close }));
  }, [histData]);

  const distanceTo160 = 160 - rate;
  const nearWarning = rate >= 155;

  return (
    <CardShell title="USD/JPY — Yen Carry Trade Watch">
      {isLoading ? (
        <SkeletonRows count={3} />
      ) : data ? (
        <div>
          <div className="mb-1 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white">
              ¥{rate.toFixed(2)}
            </span>
            <ChangeDisplay changePercent={changePercent} className="text-sm" />
          </div>
          <div className="flex gap-4 text-xs text-gray-400">
            <span>Open: {data.open?.toFixed(2)}</span>
            <span>
              Range: {data.low?.toFixed(2)} – {data.high?.toFixed(2)}
            </span>
          </div>
          <div
            className={`mt-2 rounded px-2 py-1 text-xs font-medium ${
              nearWarning
                ? "bg-red-500/20 text-red-300"
                : "bg-green-500/20 text-green-300"
            }`}
          >
            {nearWarning
              ? `⚠ Approaching 160 level (${distanceTo160.toFixed(2)} away) — potential BOJ intervention zone`
              : `${distanceTo160.toFixed(2)} away from the 160 intervention level`}
          </div>
          {chartData.length > 0 && (
            <div className="mt-3 h-32">
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="usdjpyGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#3b82f6"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="url(#usdjpyGrad)"
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
                        <div className="rounded bg-white px-2 py-1 text-xs text-black shadow">
                          {p.payload.date}: ¥{p.value?.toFixed(2)}
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
        <div className="text-gray-500">No data</div>
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
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="h-5 w-32 animate-pulse rounded bg-gray-700/50" />
        <div className="h-5 w-20 animate-pulse rounded bg-gray-700/50" />
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2 last:border-0">
      <div>
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="ml-2 text-xs text-gray-500">{region}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-300">
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
  const { data, isLoading } = api.asset.sectorPerformance.useQuery(
    undefined,
    REFETCH_OPTS,
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    return data
      .map((s) => ({
        name: s.sector.replace("_", " "),
        value: parseFloat(s.changesPercentage),
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  return (
    <CardShell title="Sector Performance">
      {isLoading ? (
        <SkeletonRows count={6} />
      ) : chartData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="#424975"
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
                    <div className="rounded bg-white px-2 py-1 text-xs text-black shadow">
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
      ) : (
        <div className="text-gray-500">No data</div>
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

  const is2s10sInverted =
    latestCurve.length > 0
      ? (latestCurve.find((d) => d.tenor === "2Y")?.rate ?? 0) >
        (latestCurve.find((d) => d.tenor === "10Y")?.rate ?? 0)
      : false;

  return (
    <CardShell title="US Treasury Yield Curve">
      {isLoading ? (
        <SkeletonRows count={4} />
      ) : combinedData.length > 0 ? (
        <div>
          {is2s10sInverted && (
            <div className="mb-2 rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-300">
              2s/10s spread inverted — historically a recession signal
            </div>
          )}
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#424975" />
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
                      <div className="rounded bg-white px-2 py-1 text-xs text-black shadow">
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
          <div className="mt-2 flex gap-4 text-xs text-gray-400">
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
        <div className="text-gray-500">No data</div>
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
              <tr className="border-b border-white/10 text-gray-400">
                <th className="pb-2 text-left font-medium">Date</th>
                <th className="pb-2 text-left font-medium">Event</th>
                <th className="pb-2 text-center font-medium">Impact</th>
                <th className="pb-2 text-right font-medium">Est.</th>
                <th className="pb-2 text-right font-medium">Prev.</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-1.5 text-gray-400">
                    {format(new Date(e.date), "MMM d")}
                  </td>
                  <td className="py-1.5 text-white">
                    <span className="mr-1 text-gray-500">{e.country}</span>
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
                  <td className="py-1.5 text-right text-gray-300">
                    {e.estimate != null ? e.estimate : "—"}
                  </td>
                  <td className="py-1.5 text-right text-gray-400">
                    {e.previous != null ? e.previous : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500">No upcoming events</div>
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
    <div className="mb-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
          {source === "ai" ? "AI Summary" : "Key Headlines"}
        </span>
        {status === "summarizing" && (
          <span className="text-[10px] text-gray-500">generating...</span>
        )}
        {status === "done" && source && (
          <span className="ml-auto text-[10px] text-gray-600">
            {source === "ai" ? "Chrome Built-in AI" : "Auto-generated"}
          </span>
        )}
      </div>
      {status === "summarizing" ? (
        <div className="space-y-1.5">
          <div className="h-3 w-full animate-pulse rounded bg-purple-500/10" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-purple-500/10" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-purple-500/10" />
        </div>
      ) : (
        <p className="whitespace-pre-line text-xs leading-relaxed text-gray-300">
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
              className="flex animate-pulse gap-3 border-b border-white/5 pb-3"
            >
              <div className="h-16 w-16 rounded bg-gray-700/50" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-4 w-3/4 rounded bg-gray-700/50" />
                <div className="h-3 w-1/2 rounded bg-gray-700/50" />
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
                  className="flex gap-3 rounded-lg border-b border-white/5 pb-3 transition-colors hover:bg-white/5 last:border-0"
                >
                  {article.image && (
                    <div className="relative h-16 w-16 flex-shrink-0">
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
                    <span className="text-sm font-medium text-white hover:underline">
                      {article.title}
                    </span>
                    {article.text && (
                      <p className="line-clamp-2 text-xs text-gray-400">
                        {article.text}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
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
        <div className="text-gray-500">No news available</div>
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
        <div className="h-5 w-20 animate-pulse rounded bg-gray-700/50" />
        <div className="h-5 w-16 animate-pulse rounded bg-gray-700/50" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2 last:border-0">
      <span className="text-sm font-medium text-white">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-300">{data.bid?.toFixed(4)}</span>
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
  { symbol: "BZUSD", label: "Brent Crude Oil" },
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
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="h-5 w-20 animate-pulse rounded bg-gray-700/50" />
        <div className="h-5 w-16 animate-pulse rounded bg-gray-700/50" />
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2 last:border-0">
      <span className="text-sm font-medium text-white">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-300">
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
            className="h-64 animate-pulse rounded-xl border border-[#424975] bg-[#151624]"
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
          <span className="text-xs text-gray-500">
            Showing % change over selected period
          </span>
          <TimeFrameSelector value={timeFrame} onChange={setTimeFrame} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Row 1: Key indicators */}
          <VixCard />
          <UsdJpyCard />
          <TreasuryCard />

          {/* Row 2: Markets & Sectors */}
          <GlobalIndicesCard />
          <SectorPerformanceCard />
          <div className="flex flex-col gap-4">
            <ForexCard />
            <CommoditiesCard />
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

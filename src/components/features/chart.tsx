"use client";

import { LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "~/components/ui/chart";
import { useIndicatorPreferences } from "~/hooks/use-indicator-preferences";
import { useSymbol } from "~/hooks/use-symbol";
import {
  calculateBollingerBands,
  calculateMACD,
  calculateRSI,
  calculateSupportResistance,
  calculateVWAP,
  type OHLCVData,
} from "~/lib/indicators";
import { api } from "~/trpc/react";

const PriceChange = ({ data }: { data?: { price: number }[] }) => {
  if (!data?.length) return null;

  const startPrice = data[0]?.price;
  const endPrice = data[data.length - 1]?.price;

  if (!startPrice || !endPrice) return null;

  const priceDiff = endPrice - startPrice;
  const percentChange = (priceDiff / startPrice) * 100;
  const isPositive = priceDiff >= 0;

  return (
    <div className="flex items-center gap-2 p-2">
      <span className="text-lg font-semibold">${endPrice.toFixed(2)}</span>
      <span
        className={`text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}
      >
        {isPositive ? "+" : ""}${priceDiff.toFixed(2)} ({isPositive ? "+" : ""}
        {percentChange.toFixed(2)}%)
      </span>
    </div>
  );
};

const ChartSkeleton = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <LoaderCircle className="h-8 w-8 animate-spin text-gray-400" />
      <span className="text-sm text-gray-400">Loading chart data...</span>
    </div>
  </div>
);

const NoSymbolMessage = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm text-gray-400">
        Please select a stock to view the chart
      </span>
    </div>
  </div>
);

const CustomTooltip = ({
  payload,
  active,
}: {
  payload?: { payload: { date: string }; value: number }[];
  active?: boolean;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg bg-white p-2 shadow-sm">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-cyan-700 text-muted-foreground">
            {payload[0]?.payload?.date}
          </span>
          <span className="font-bold text-black">
            ${payload[0]?.value.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

type TimeFrame = "5Y" | "1Y" | "6M" | "1M" | "1W" | "1D";

const VWAP_TIMEFRAMES: TimeFrame[] = ["1M", "1W", "1D"];

interface ChartDataPoint extends OHLCVData {
  price: number;
}

const filterDataByTimeFrame = <T extends { date: string }>(
  data: T[],
  timeFrame: TimeFrame,
): T[] => {
  switch (timeFrame) {
    case "5Y":
      return data.slice(-252 * 5);
    case "1Y":
      return data.slice(-252);
    case "6M":
      return data.slice(-126);
    case "1M":
      return data.slice(-21);
    case "1W":
      return data.slice(-5);
    case "1D":
      return data.slice(-1);
    default:
      return data;
  }
};

export function Chart() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1Y");
  const [symbol] = useSymbol();
  const [indicators, toggleIndicator] = useIndicatorPreferences();

  const { data, isLoading } = api.asset.equityPriceHistoricalFMP.useQuery(
    symbol ?? "",
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      enabled: !!symbol,
    },
  );

  const { data: data2, isLoading: isLoading2 } =
    api.asset.equityPriceHistorical.useQuery(symbol ?? "", {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      enabled: timeFrame === "1D" && !!symbol,
    });

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!data?.historical) return [];
    return [...data.historical]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r) => ({
        date: r.date,
        price: r.close,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
      }));
  }, [data]);

  const chartData2: ChartDataPoint[] = useMemo(() => {
    if (!data2?.results) return [];
    return [...data2.results]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r) => ({
        date: r.date,
        price: r.close,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
      }));
  }, [data2]);

  const activeChartData: ChartDataPoint[] = useMemo(() => {
    if (timeFrame === "1D") return chartData2;
    return filterDataByTimeFrame(chartData, timeFrame);
  }, [timeFrame, chartData, chartData2]);

  const indicatorData = useMemo(() => {
    if (!activeChartData.length) return null;
    return {
      vwap: calculateVWAP(activeChartData),
      bollinger: calculateBollingerBands(activeChartData),
      rsi: calculateRSI(activeChartData),
      macd: calculateMACD(activeChartData),
      sr: calculateSupportResistance(activeChartData),
    };
  }, [activeChartData]);

  const showVWAP = indicators.vwap && VWAP_TIMEFRAMES.includes(timeFrame);

  const mergedData = useMemo(() => {
    if (!indicatorData) return activeChartData;
    return activeChartData.map((d, i) => ({
      ...d,
      ...(showVWAP ? { vwap: indicatorData.vwap[i]?.vwap } : {}),
      ...(indicators.bollinger
        ? {
            bbUpper: indicatorData.bollinger[i]?.bbUpper,
            bbMiddle: indicatorData.bollinger[i]?.bbMiddle,
            bbLower: indicatorData.bollinger[i]?.bbLower,
          }
        : {}),
      ...(indicators.rsi ? { rsi: indicatorData.rsi[i]?.rsi } : {}),
      ...(indicators.macd
        ? {
            macdLine: indicatorData.macd[i]?.macdLine,
            macdSignal: indicatorData.macd[i]?.macdSignal,
            macdHistogram: indicatorData.macd[i]?.macdHistogram,
          }
        : {}),
    }));
  }, [activeChartData, indicatorData, showVWAP, indicators]);

  const srLevels = useMemo(() => {
    if (!indicatorData || !indicators.sr || !activeChartData.length) return [];
    const referencePrice = activeChartData[activeChartData.length - 1].price;
    const prices = activeChartData.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    return indicatorData.sr
      .filter(
        (lvl) =>
          lvl.level >= minPrice - range * 0.05 &&
          lvl.level <= maxPrice + range * 0.05,
      )
      .sort(
        (a, b) =>
          Math.abs(a.level - referencePrice) - Math.abs(b.level - referencePrice),
      )
      .slice(0, 10);
  }, [indicatorData, indicators.sr, activeChartData]);

  const showRSI =
    indicators.rsi && !!indicatorData?.rsi.some((point) => point.rsi != null);
  const showMACD =
    indicators.macd &&
    !!indicatorData?.macd.some(
      (point) =>
        point.macdLine != null ||
        point.macdSignal != null ||
        point.macdHistogram != null,
    );
  const hasSubCharts = showRSI || showMACD;

  if (!symbol) return <NoSymbolMessage />;
  if (isLoading || isLoading2) return <ChartSkeleton />;

  const indicatorButtons: { key: keyof typeof indicators; label: string }[] = [
    { key: "vwap", label: "VWAP" },
    { key: "bollinger", label: "Bollinger" },
    { key: "rsi", label: "RSI" },
    { key: "macd", label: "MACD" },
    { key: "sr", label: "S/R" },
  ];

  const tickFormatter = (value: string) => {
    const date = new Date(value);
    if (timeFrame === "1D")
      return date.toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getMonth() === 0 ? "numeric" : undefined,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col justify-between sm:flex-row">
        <div className="flex gap-2 p-2">
          {(["5Y", "1Y", "6M", "1M", "1W", "1D"] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={(e) => {
                e.stopPropagation();
                setTimeFrame(tf);
              }}
              className={`rounded px-3 py-1 text-sm ${
                timeFrame === tf
                  ? "bg-[#424975] text-white"
                  : "bg-transparent text-gray-400 hover:bg-[#424975]/50"
              }`}
              style={{ zIndex: 100 }}
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {tf}
            </button>
          ))}
        </div>
        <PriceChange
          data={timeFrame === "1D" ? chartData2 : activeChartData}
        />
      </div>

      <div className="flex gap-2 px-2 pb-2">
        {indicatorButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={(e) => {
              e.stopPropagation();
              toggleIndicator(key);
            }}
            className={`rounded px-3 py-1 text-xs ${
              indicators[key]
                ? "bg-[#424975] text-white"
                : "bg-transparent text-gray-500 hover:bg-[#424975]/50"
            }`}
            style={{ zIndex: 100 }}
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            accessibilityLayer
            data={mergedData}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} />
            <XAxis
              fontSize={12}
              dataKey="date"
              minTickGap={50}
              interval="preserveStartEnd"
              tickFormatter={tickFormatter}
            />
            <YAxis
              fontSize={12}
              type="number"
              domain={["auto", "auto"]}
              tickFormatter={(value: number) => value?.toFixed(2)}
              width={65}
            />
            <ChartTooltip content={<CustomTooltip />} />

            <Area
              dataKey="price"
              stroke="#82ca9d"
              fillOpacity={1}
              fill="url(#colorPv)"
              dot={false}
              isAnimationActive={false}
            />

            {showVWAP && (
              <Line
                dataKey="vwap"
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}

            {indicators.bollinger && (
              <>
                <Line
                  dataKey="bbUpper"
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeOpacity={0.6}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Line
                  dataKey="bbMiddle"
                  stroke="#eab308"
                  strokeWidth={1}
                  strokeOpacity={0.6}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Line
                  dataKey="bbLower"
                  stroke="#22c55e"
                  strokeWidth={1}
                  strokeOpacity={0.6}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </>
            )}

            {indicators.sr &&
              srLevels.map((lvl, idx) => (
                <ReferenceLine
                  key={`${lvl.type}-${idx}`}
                  y={lvl.level}
                  stroke={lvl.type === "support" ? "#22c55e" : "#ef4444"}
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                  label={{
                    value: lvl.type === "support" ? "S" : "R",
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: lvl.type === "support" ? "#22c55e" : "#ef4444",
                  }}
                />
              ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {showRSI && (
        <div style={{ height: 90 }}>
          <div className="px-2 pt-1 text-xs text-gray-400">RSI (14)</div>
          <ResponsiveContainer width="100%" height={72}>
            <ComposedChart
              data={mergedData}
              margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            >
              <XAxis dataKey="date" hide />
              <YAxis
                domain={[0, 100]}
                ticks={[30, 70]}
                fontSize={10}
                width={65}
              />
              <ReferenceLine
                y={70}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={30}
                stroke="#22c55e"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Line
                dataKey="rsi"
                stroke="#a855f7"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {showMACD && (
        <div style={{ height: 90 }}>
          <div className="px-2 pt-1 text-xs text-gray-400">MACD (12,26,9)</div>
          <ResponsiveContainer width="100%" height={72}>
            <ComposedChart
              data={mergedData}
              margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            >
              <XAxis dataKey="date" hide />
              <YAxis fontSize={10} width={65} />
              <ReferenceLine y={0} stroke="#6b7280" strokeOpacity={0.4} />
              <Bar
                dataKey="macdHistogram"
                isAnimationActive={false}
                maxBarSize={4}
              >
                {mergedData.map((entry, idx) => {
                  const val = (
                    entry as unknown as Record<string, number | null | undefined>
                  ).macdHistogram;
                  return (
                    <Cell
                      key={`macd-cell-${idx}`}
                      fill={
                        val != null && val >= 0 ? "#22c55e" : "#ef4444"
                      }
                    />
                  );
                })}
              </Bar>
              <Line
                dataKey="macdLine"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                dataKey="macdSignal"
                stroke="#f97316"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {!hasSubCharts && <div />}
    </div>
  );
}

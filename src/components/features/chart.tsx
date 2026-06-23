"use client";

import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ReferenceDot,
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
import {
  LiveQuoteHeader,
  LivePulseDot,
  LIVE_UP,
  LIVE_DOWN,
} from "~/components/features/live-quote";

interface DragSelection {
  startIndex: number;
  endIndex: number;
}

const RangeSelectionStats = ({
  range,
  data,
  isDragging,
  onClear,
  cursorOnRight,
}: {
  range: DragSelection;
  data: ChartDataPoint[];
  isDragging: boolean;
  onClear: () => void;
  cursorOnRight: boolean;
}) => {
  const { startIndex, endIndex } = range;
  const startPoint = data[startIndex];
  const endPoint = data[endIndex];

  if (!startPoint || !endPoint) return null;

  const startPrice = startPoint.price;
  const endPrice = endPoint.price;
  const priceDiff = endPrice - startPrice;
  const percentChange = (priceDiff / startPrice) * 100;
  const isPositive = priceDiff >= 0;
  const days = Math.abs(endIndex - startIndex);

  return (
    <div
      className={`absolute top-2 z-50 flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-lg ${
        cursorOnRight ? "left-2" : "right-2"
      }`}
      style={{ pointerEvents: "none" }}
    >
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">
          {startPoint.date} → {endPoint.date}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground">
            ${startPrice.toFixed(2)} → ${endPrice.toFixed(2)}
          </span>
          <span
            className={`text-sm font-bold ${
              isPositive ? "text-positive" : "text-negative"
            }`}
          >
            {isPositive ? "+" : ""}
            {percentChange.toFixed(2)}%
          </span>
          <span className="text-xs text-muted-foreground">({days}d)</span>
        </div>
      </div>
      {!isDragging && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="ml-1 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Clear selection"
          style={{ pointerEvents: "auto" }}
        >
          ×
        </button>
      )}
    </div>
  );
};

const ChartSkeleton = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Loading chart data...</span>
    </div>
  </div>
);

const NoSymbolMessage = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm text-muted-foreground">
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
    <div className="rounded-lg bg-primary p-2 shadow-xs">
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
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  switch (timeFrame) {
    case "5Y":
      return sortedData.slice(-252 * 5);
    case "1Y":
      return sortedData.slice(-252);
    case "6M":
      return sortedData.slice(-126);
    case "1M":
      return sortedData.slice(-21);
    case "1W":
      return sortedData.slice(-5);
    case "1D":
      return sortedData.slice(-1);
    default:
      return sortedData;
  }
};

export function Chart() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1Y");
  const [symbol] = useSymbol();
  const [indicators, toggleIndicator] = useIndicatorPreferences();
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [cursorOnRight, setCursorOnRight] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

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

  // Live quote — polled every few seconds for real-time price ticks.
  const { data: liveQuoteData } = api.asset.equityQuote.useQuery(symbol ?? "", {
    enabled: !!symbol,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const liveQuote = liveQuoteData?.[0];
  const livePrice = liveQuote?.price;

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
    return data2.results.map((r) => ({
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
      .slice(0, 10);
  }, [indicatorData, indicators.sr, activeChartData]);

  /* ── live-quote overlay ── */
  const isLive =
    livePrice != null && !Number.isNaN(livePrice) && activeChartData.length > 0;

  // Overlay the live price onto the last point so the line tip tracks it live.
  const liveMergedData = useMemo(() => {
    if (!isLive || livePrice == null) return mergedData;
    const copy = mergedData.slice();
    const i = copy.length - 1;
    const last = copy[i];
    if (last) copy[i] = { ...last, price: livePrice, close: livePrice };
    return copy;
  }, [mergedData, isLive, livePrice]);

  const lastLivePoint = liveMergedData[liveMergedData.length - 1];

  // Robinhood-style: color the whole line by the visible window's performance.
  const windowBase = activeChartData[0]?.price;
  const windowEnd = isLive
    ? livePrice
    : activeChartData[activeChartData.length - 1]?.price;
  const windowUp =
    windowBase == null || windowEnd == null ? true : windowEnd >= windowBase;
  const lineColor = windowUp ? LIVE_UP : LIVE_DOWN;

  // Header readout — price flashes live; change is relative to the window start.
  const headerPrice = windowEnd ?? 0;
  const headerChange = windowBase ? headerPrice - windowBase : 0;
  const headerPct = windowBase ? (headerChange / windowBase) * 100 : 0;

  /* ── drag-select handlers (click-hold-drag-release) ── */
  const handleMouseDown = useCallback(() => {
    if (hoveredIndex === null) return;

    // If we already have a previous selection, clear it first
    if (dragSelection && !isDragging) {
      setDragSelection(null);
    }

    setDragSelection({ startIndex: hoveredIndex, endIndex: hoveredIndex });
    setIsDragging(true);
  }, [hoveredIndex, dragSelection, isDragging]);

  const handleMouseMove = useCallback(
    (state: { activeTooltipIndex?: number }) => {
      const index = state.activeTooltipIndex;
      if (index !== undefined && index !== null) {
        setHoveredIndex(index);
      }
      if (!isDragging || !dragSelection || index === undefined || index === null) return;
      setDragSelection({
        startIndex: dragSelection.startIndex,
        endIndex: index,
      });
    },
    [isDragging, dragSelection],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    // Finalize: clamp start < end, drop if same point (accidental click)
    setDragSelection((prev) => {
      if (!prev) return null;
      const start = Math.min(prev.startIndex, prev.endIndex);
      const end = Math.max(prev.startIndex, prev.endIndex);
      if (start === end) return null; // accidental click, drop selection
      return { startIndex: start, endIndex: end };
    });
  }, [isDragging]);

  // Listen for mouseup on document so releasing outside the chart still finalizes
  useEffect(() => {
    const onUp = () => handleMouseUp();
    if (isDragging) {
      window.addEventListener("mouseup", onUp);
      return () => window.removeEventListener("mouseup", onUp);
    }
  }, [isDragging, handleMouseUp]);

  const handleClearSelection = useCallback(() => {
    setDragSelection(null);
    setIsDragging(false);
  }, []);

  // Track mouse position relative to chart for tooltip positioning
  useEffect(() => {
    const handleMouseMoveGlobal = (e: globalThis.MouseEvent) => {
      if (!chartContainerRef.current) return;
      const rect = chartContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setCursorOnRight(x > rect.width / 2);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMoveGlobal);
      return () => window.removeEventListener("mousemove", handleMouseMoveGlobal);
    }
  }, [isDragging]);

  const showRSI = indicators.rsi;
  const showMACD = indicators.macd;
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
                  ? "bg-secondary text-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-secondary/50"
              }`}
              style={{ zIndex: 100 }}
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {tf}
            </button>
          ))}
        </div>
        <LiveQuoteHeader
          price={headerPrice}
          change={headerChange}
          changePct={headerPct}
          live={isLive}
        />
      </div>

      <div className="flex items-center justify-between px-2 pb-2">
        <div className="flex gap-2">
          {indicatorButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                toggleIndicator(key);
              }}
              className={`rounded px-3 py-1 text-xs ${
                indicators[key]
                  ? "bg-secondary text-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-secondary/50"
              }`}
              style={{ zIndex: 100 }}
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {isDragging ? "" : ""}
        </span>
      </div>

      <div
        ref={chartContainerRef}
        className="relative min-h-0 flex-1"
        style={{ outline: "none" }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {dragSelection && isDragging && (
          <RangeSelectionStats
            range={dragSelection}
            data={activeChartData}
            isDragging={isDragging}
            onClear={handleClearSelection}
            cursorOnRight={cursorOnRight}
          />
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={liveMergedData}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            style={{ outline: "none" }}
          >
            <defs>
              <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.5} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
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
              stroke={lineColor}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPv)"
              dot={false}
              isAnimationActive={false}
            />

            {/* Live pulsing dot at the leading edge of the line */}
            {isLive && !isDragging && lastLivePoint && (
              <ReferenceDot
                x={lastLivePoint.date}
                y={lastLivePoint.price}
                ifOverflow="extendDomain"
                isFront
                shape={(props) => (
                  <LivePulseDot
                    cx={(props as { cx?: number }).cx}
                    cy={(props as { cy?: number }).cy}
                    color={lineColor}
                  />
                )}
              />
            )}

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

            {/* Selection vertical lines and dots */}
            {dragSelection && isDragging && activeChartData[dragSelection.startIndex] && (
              <ReferenceLine
                x={activeChartData[dragSelection.startIndex]?.date}
                stroke="#82ca9d"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                ifOverflow="extendDomain"
              />
            )}
            {dragSelection && isDragging && activeChartData[dragSelection.startIndex] && (
              <ReferenceDot
                x={activeChartData[dragSelection.startIndex]?.date}
                y={activeChartData[dragSelection.startIndex]?.price}
                r={6}
                fill="#82ca9d"
                stroke="#ffffff"
                strokeWidth={2}
              />
            )}
            {dragSelection && isDragging && activeChartData[dragSelection.endIndex] &&
              dragSelection.endIndex !== dragSelection.startIndex && (
                <ReferenceLine
                  x={activeChartData[dragSelection.endIndex]?.date}
                  stroke="#82ca9d"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  ifOverflow="extendDomain"
                />
              )}
            {dragSelection && isDragging && activeChartData[dragSelection.endIndex] &&
              dragSelection.endIndex !== dragSelection.startIndex && (
                <ReferenceDot
                  x={activeChartData[dragSelection.endIndex]?.date}
                  y={activeChartData[dragSelection.endIndex]?.price}
                  r={6}
                  fill="#82ca9d"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {showRSI && (
        <div style={{ height: 90 }}>
          <div className="px-2 pt-1 text-xs text-muted-foreground">RSI (14)</div>
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
          <div className="px-2 pt-1 text-xs text-muted-foreground">MACD (12,26,9)</div>
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

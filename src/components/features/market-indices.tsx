"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";

const INDICES = [
  { symbol: "^DJI", label: "DOW" },
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "NASDAQ" },
] as const;

function MiniSparkline({
  prices,
  positive,
}: {
  prices: number[];
  positive: boolean;
}) {
  const path = useMemo(() => {
    if (prices.length < 2) return "";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const width = 48;
    const height = 20;
    const padding = 2;
    const usableHeight = height - padding * 2;
    const step = width / (prices.length - 1);

    return prices
      .map((p, i) => {
        const x = i * step;
        const y = padding + usableHeight - ((p - min) / range) * usableHeight;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [prices]);

  if (!path) return null;

  const color = positive ? "#22c55e" : "#ef4444";

  return (
    <svg width="48" height="20" viewBox="0 0 48 20" fill="none">
      <path
        d={path}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IndexChip({ symbol, label }: { symbol: string; label: string }) {
  const { data: quoteData, isLoading: quoteLoading } =
    api.asset.equityQuote.useQuery(symbol, {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      refetchInterval: 60000,
    });

  const { data: histData, isLoading: histLoading } =
    api.asset.equityPriceHistorical.useQuery(symbol, {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      refetchInterval: 60000,
    });

  const quote = quoteData?.[0];
  const changePercent = quote?.changesPercentage ?? 0;
  const positive = (quote?.change ?? 0) >= 0;

  // Extract today's intraday close prices, sampled to ~30 points
  const prices = useMemo(() => {
    const results = histData?.results;
    if (!results?.length) return [];
    // Data comes newest-first, reverse to chronological
    const chronological = [...results].reverse();
    // Sample down to ~30 points for a clean sparkline
    const maxPoints = 30;
    if (chronological.length <= maxPoints) {
      return chronological.map((r) => r.close);
    }
    const step = chronological.length / maxPoints;
    const sampled: number[] = [];
    for (let i = 0; i < maxPoints; i++) {
      sampled.push(chronological[Math.floor(i * step)]!.close);
    }
    // Always include the latest point
    sampled.push(chronological[chronological.length - 1]!.close);
    return sampled;
  }, [histData]);

  if (quoteLoading || histLoading) {
    return (
      <div className="flex animate-pulse items-center gap-1.5">
        <div className="h-3 w-10 rounded bg-gray-700" />
        <div className="h-5 w-12 rounded bg-gray-700" />
        <div className="h-3 w-12 rounded bg-gray-700" />
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-gray-400">{label}</span>
      {prices.length > 1 ? (
        <MiniSparkline prices={prices} positive={positive} />
      ) : (
        <span
          className={`text-xs ${positive ? "text-green-400" : "text-red-400"}`}
        >
          {positive ? "\u25B2" : "\u25BC"}
        </span>
      )}
      <span
        className={`text-xs font-semibold ${positive ? "text-green-400" : "text-red-400"}`}
      >
        {positive ? "+" : ""}
        {changePercent.toFixed(2)}%
      </span>
    </div>
  );
}

export function MarketIndices() {
  return (
    <div className="flex items-center gap-4">
      {INDICES.map((idx) => (
        <IndexChip key={idx.symbol} symbol={idx.symbol} label={idx.label} />
      ))}
    </div>
  );
}

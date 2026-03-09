"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Check,
  ChevronDown,
  ChevronUp,
  Users,
  BarChart3,
  DollarSign,
  PieChart,
  Shield,
  Zap,
  Lightbulb,
} from "lucide-react";
import { api } from "~/trpc/react";
import { cn, formatLargeNumber } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { CommandLoading } from "cmdk";
import useDebounce from "~/hooks/use-debounce";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompareStock {
  symbol: string;
  name: string;
  image: string | null;
  sector: string;
  industry: string;
  country: string;
  exchange: string;
  ipoDate: string;
  employees: string;
  peers: string[];
  price: number;
  change: number;
  changesPercentage: number;
  marketCap: number;
  beta: number;
  volume: number;
  avgVolume: number;
  yearHigh: number;
  yearLow: number;
  priceAvg50: number;
  priceAvg200: number;
  peRatio: number;
  forwardPE: number;
  pegRatio: number;
  priceToSales: number;
  priceToBook: number;
  evToEbitda: number;
  evToSales: number;
  priceToFCF: number;
  eps: number;
  ttmEps: number;
  ttmEpsGrowth: number | null;
  epsYoY: number | null;
  earningsYield: number;
  ttmRevenue: number;
  ttmRevenueGrowth: number | null;
  revenueYoY: number | null;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  ebitdaMargin: number;
  roe: number;
  roa: number;
  roic: number;
  fcfPerShare: number;
  fcfYield: number;
  operatingCFPerShare: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  interestCoverage: number;
  dividendYield: number;
  payoutRatio: number;
  dividendPerShare: number;
  ttmNetIncome: number;
  ttmNetIncomeGrowth: number | null;
  ttmGrossProfit: number;
  ttmEbitda: number;
  ttmOperatingIncome: number;
  sbcToRevenue: number;
  rdToRevenue: number;
}

interface MetricRow {
  label: string;
  key: string;
  getValue: (stock: CompareStock) => number | null;
  format: (val: number | null) => string;
  /** "higher" = green when highest, "lower" = green when lowest, "neutral" = no highlight */
  better: "higher" | "lower" | "neutral";
  tooltip?: string;
}

interface MetricSection {
  title: string;
  icon: React.ReactNode;
  metrics: MetricRow[];
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

const fmt = (v: number | null) => (v != null ? v.toFixed(2) : "N/A");
const fmtPct = (v: number | null) =>
  v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "N/A";
const fmtPctPlain = (v: number | null) =>
  v != null ? `${v.toFixed(2)}%` : "N/A";
const fmtMoney = (v: number | null) =>
  v != null ? `$${formatLargeNumber(v)}` : "N/A";
const fmtRatio = (v: number | null) => (v != null ? `${v.toFixed(2)}x` : "N/A");

// ─── Reference / benchmark ranges for typical S&P 500 stocks ─────────────────

const BENCHMARKS: Record<string, string> = {
  peRatio: "S&P 500 avg: 20–28",
  forwardPE: "Typical: 18–26",
  pegRatio: "< 1 = undervalued, > 2 = expensive",
  priceToSales: "Typical: 1.8–2.6",
  priceToBook: "Typical: 3–5",
  evToEbitda: "Typical: 12–18",
  priceToFCF: "Typical: 20–30",
  earningsYield: "Higher = cheaper",
  ttmEpsGrowth: "Strong: 8–12%+",
  epsYoY: "Strong: 8–12%+",
  ttmRevenueGrowth: "Typical: 4.5–6.5%",
  revenueYoY: "Typical: 4.5–6.5%",
  grossMargin: "Typical: 40–48%",
  operatingMargin: "Typical: 15–22%",
  netMargin: "Typical: 8–10%",
  ebitdaMargin: "Typical: 20–30%",
  roe: "Strong: 15–25%",
  roa: "Strong: 5–10%",
  roic: "Excellent: >15%",
  fcfYield: "Higher = better (3–6%)",
  debtToEquity: "< 1.0 = conservative",
  currentRatio: "Healthy: 1.5–3.0",
  quickRatio: "Healthy: 1.0–2.0",
  interestCoverage: "> 5 = strong",
  dividendYield: "Typical: 1.5–3%",
  payoutRatio: "Sustainable: 30–60%",
  sbcToRevenue: "Low = better (<5%)",
  rdToRevenue: "Tech avg: 10–20%",
  beta: "< 1 = less volatile",
  ttmNetIncomeGrowth: "Strong: 8–12%+",
};

// ─── Metric definitions (grouped by category like in the image) ──────────────

const METRIC_SECTIONS: MetricSection[] = [
  {
    title: "Valuation",
    icon: <DollarSign className="h-4 w-4" />,
    metrics: [
      {
        label: "PE Ratio (TTM)",
        key: "peRatio",
        getValue: (s) => s.peRatio,
        format: fmt,
        better: "lower",
      },
      {
        label: "Forward PE",
        key: "forwardPE",
        getValue: (s) => s.forwardPE,
        format: fmt,
        better: "lower",
      },
      {
        label: "PEG Ratio",
        key: "pegRatio",
        getValue: (s) => s.pegRatio || null,
        format: fmt,
        better: "lower",
      },
      {
        label: "P/S Ratio (TTM)",
        key: "priceToSales",
        getValue: (s) => s.priceToSales,
        format: fmt,
        better: "lower",
      },
      {
        label: "P/B Ratio",
        key: "priceToBook",
        getValue: (s) => s.priceToBook,
        format: fmt,
        better: "lower",
      },
      {
        label: "EV / EBITDA",
        key: "evToEbitda",
        getValue: (s) => s.evToEbitda,
        format: fmt,
        better: "lower",
      },
      {
        label: "Price / FCF",
        key: "priceToFCF",
        getValue: (s) => s.priceToFCF,
        format: fmt,
        better: "lower",
      },
      {
        label: "Earnings Yield",
        key: "earningsYield",
        getValue: (s) => s.earningsYield,
        format: fmtPctPlain,
        better: "higher",
      },
    ],
  },
  {
    title: "EPS Growth",
    icon: <TrendingUp className="h-4 w-4" />,
    metrics: [
      {
        label: "TTM EPS Growth",
        key: "ttmEpsGrowth",
        getValue: (s) => s.ttmEpsGrowth,
        format: fmtPct,
        better: "higher",
      },
      {
        label: "EPS (YoY Quarter)",
        key: "epsYoY",
        getValue: (s) => s.epsYoY,
        format: fmtPct,
        better: "higher",
      },
      {
        label: "EPS (TTM)",
        key: "ttmEps",
        getValue: (s) => s.ttmEps,
        format: (v) => (v != null ? `$${v.toFixed(2)}` : "N/A"),
        better: "higher",
      },
    ],
  },
  {
    title: "Revenue Growth",
    icon: <BarChart3 className="h-4 w-4" />,
    metrics: [
      {
        label: "TTM Revenue Growth",
        key: "ttmRevenueGrowth",
        getValue: (s) => s.ttmRevenueGrowth,
        format: fmtPct,
        better: "higher",
      },
      {
        label: "Revenue (YoY Quarter)",
        key: "revenueYoY",
        getValue: (s) => s.revenueYoY,
        format: fmtPct,
        better: "higher",
      },
      {
        label: "TTM Revenue",
        key: "ttmRevenue",
        getValue: (s) => s.ttmRevenue,
        format: fmtMoney,
        better: "higher",
      },
    ],
  },
  {
    title: "Profitability",
    icon: <PieChart className="h-4 w-4" />,
    metrics: [
      {
        label: "Gross Margin",
        key: "grossMargin",
        getValue: (s) => s.grossMargin,
        format: fmtPctPlain,
        better: "higher",
      },
      {
        label: "Operating Margin",
        key: "operatingMargin",
        getValue: (s) => s.operatingMargin,
        format: fmtPctPlain,
        better: "higher",
      },
      {
        label: "Net Margin",
        key: "netMargin",
        getValue: (s) => s.netMargin,
        format: fmtPctPlain,
        better: "higher",
      },
      {
        label: "EBITDA Margin",
        key: "ebitdaMargin",
        getValue: (s) => s.ebitdaMargin,
        format: fmtPctPlain,
        better: "higher",
      },
    ],
  },
  {
    title: "Returns",
    icon: <Zap className="h-4 w-4" />,
    metrics: [
      {
        label: "ROE",
        key: "roe",
        getValue: (s) => s.roe,
        format: fmtPctPlain,
        better: "higher",
      },
      {
        label: "ROA",
        key: "roa",
        getValue: (s) => s.roa,
        format: fmtPctPlain,
        better: "higher",
      },
      {
        label: "ROIC",
        key: "roic",
        getValue: (s) => s.roic,
        format: fmtPctPlain,
        better: "higher",
      },
      {
        label: "Net Income Growth (TTM)",
        key: "ttmNetIncomeGrowth",
        getValue: (s) => s.ttmNetIncomeGrowth,
        format: fmtPct,
        better: "higher",
      },
    ],
  },
  {
    title: "Cash Flow",
    icon: <DollarSign className="h-4 w-4" />,
    metrics: [
      {
        label: "FCF Yield",
        key: "fcfYield",
        getValue: (s) => s.fcfYield,
        format: fmtPctPlain,
        better: "higher",
      },
      {
        label: "FCF / Share",
        key: "fcfPerShare",
        getValue: (s) => s.fcfPerShare,
        format: (v) => (v != null ? `$${v.toFixed(2)}` : "N/A"),
        better: "higher",
      },
      {
        label: "Operating CF / Share",
        key: "operatingCFPerShare",
        getValue: (s) => s.operatingCFPerShare,
        format: (v) => (v != null ? `$${v.toFixed(2)}` : "N/A"),
        better: "higher",
      },
    ],
  },
  {
    title: "Financial Health",
    icon: <Shield className="h-4 w-4" />,
    metrics: [
      {
        label: "Debt / Equity",
        key: "debtToEquity",
        getValue: (s) => s.debtToEquity,
        format: fmtRatio,
        better: "lower",
      },
      {
        label: "Current Ratio",
        key: "currentRatio",
        getValue: (s) => s.currentRatio,
        format: fmtRatio,
        better: "higher",
      },
      {
        label: "Quick Ratio",
        key: "quickRatio",
        getValue: (s) => s.quickRatio,
        format: fmtRatio,
        better: "higher",
      },
      {
        label: "Interest Coverage",
        key: "interestCoverage",
        getValue: (s) => s.interestCoverage,
        format: fmtRatio,
        better: "higher",
      },
    ],
  },
  {
    title: "Dividend",
    icon: <DollarSign className="h-4 w-4" />,
    metrics: [
      {
        label: "Dividend Yield",
        key: "dividendYield",
        getValue: (s) => s.dividendYield,
        format: fmtPctPlain,
        better: "higher",
      },
      {
        label: "Payout Ratio",
        key: "payoutRatio",
        getValue: (s) => s.payoutRatio,
        format: fmtPctPlain,
        better: "neutral",
      },
      {
        label: "Dividend / Share",
        key: "dividendPerShare",
        getValue: (s) => s.dividendPerShare,
        format: (v) => (v != null ? `$${v.toFixed(2)}` : "N/A"),
        better: "higher",
      },
    ],
  },
  {
    title: "Efficiency & Risk",
    icon: <Lightbulb className="h-4 w-4" />,
    metrics: [
      {
        label: "SBC / Revenue",
        key: "sbcToRevenue",
        getValue: (s) => s.sbcToRevenue,
        format: fmtPctPlain,
        better: "lower",
      },
      {
        label: "R&D / Revenue",
        key: "rdToRevenue",
        getValue: (s) => s.rdToRevenue,
        format: fmtPctPlain,
        better: "neutral",
      },
      {
        label: "Beta",
        key: "beta",
        getValue: (s) => s.beta,
        format: fmt,
        better: "neutral",
      },
    ],
  },
];

// ─── Stock Search Popover ────────────────────────────────────────────────────

function StockSearchPopover({
  onSelect,
  existingSymbols,
}: {
  onSelect: (symbol: string) => void;
  existingSymbols: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const isReady = debouncedSearch === search;

  const { data, isLoading } = api.asset.equitySearch.useQuery(
    debouncedSearch || "AAPL",
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      enabled: !!debouncedSearch,
    },
  );

  const stocks = data?.results
    ?.filter(
      (re) =>
        re.etf === "N" && !existingSymbols.includes(re.symbol.toUpperCase()),
    )
    .slice(0, 20)
    .map((re) => ({
      value: re.symbol,
      label: `${re.symbol} - ${re.name}`,
    }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-full min-h-[120px] w-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 transition-all hover:border-purple-400/60 hover:bg-white/5">
          <Plus className="h-6 w-6 text-gray-400" />
          <span className="text-xs text-gray-400">Add Stock</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command
          shouldFilter={
            !!isReady && !!stocks?.length && !!debouncedSearch?.length
          }
          filter={(_v, _s, keywords) => {
            if (
              keywords?.some((kw) =>
                kw.toLowerCase().includes(debouncedSearch?.toLowerCase() ?? ""),
              )
            )
              return 1;
            return 0;
          }}
        >
          <CommandInput
            placeholder="Search stocks..."
            className="h-9"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isReady && data && <CommandEmpty>No stocks found.</CommandEmpty>}
            {isLoading ? (
              <CommandLoading>
                <div className="flex justify-center py-6">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                </div>
              </CommandLoading>
            ) : (
              <CommandGroup>
                {stocks?.map((stock) => (
                  <CommandItem
                    key={stock.value}
                    value={stock.value}
                    keywords={[stock.value, stock.label]}
                    onSelect={(val) => {
                      onSelect(val.toUpperCase());
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    {stock.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Stock Column Header ─────────────────────────────────────────────────────

function StockHeader({
  stock,
  onRemove,
}: {
  stock: CompareStock;
  onRemove: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div className="group relative flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-4 transition-all hover:border-purple-400/30">
      <button
        onClick={onRemove}
        className="absolute -right-2 -top-2 hidden rounded-full bg-red-500/90 p-1 text-white transition-all hover:bg-red-400 group-hover:block"
      >
        <X className="h-3 w-3" />
      </button>
      {stock.image && !imgFailed ? (
        <Image
          src={stock.image}
          alt={stock.symbol}
          width={40}
          height={40}
          className="rounded-lg"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-sm font-bold text-purple-300">
          {stock.symbol.slice(0, 2)}
        </div>
      )}
      <span className="text-sm font-bold text-white">{stock.symbol}</span>
      <span className="max-w-[160px] truncate text-center text-[10px] text-gray-400">
        {stock.name}
      </span>
      <div className="flex items-center gap-1">
        <span className="font-mono text-xs text-gray-200">
          ${stock.price.toFixed(2)}
        </span>
        <span
          className={cn(
            "font-mono text-[10px]",
            stock.changesPercentage >= 0 ? "text-green-400" : "text-red-400",
          )}
        >
          {stock.changesPercentage >= 0 ? "+" : ""}
          {stock.changesPercentage.toFixed(2)}%
        </span>
      </div>
      <div className="flex gap-2 text-[9px] text-gray-500">
        <span>{stock.sector}</span>
      </div>
      <span className="font-mono text-[10px] text-gray-400">
        MCap: {formatLargeNumber(stock.marketCap)}
      </span>
    </div>
  );
}

// ─── Metric Cell ─────────────────────────────────────────────────────────────

function MetricCell({
  value,
  formatted,
  isBest,
  isWorst,
  better,
}: {
  value: number | null;
  formatted: string;
  isBest: boolean;
  isWorst: boolean;
  better: "higher" | "lower" | "neutral";
}) {
  const isGrowth = formatted.startsWith("+") || formatted.startsWith("-");
  const isNeg = value != null && value < 0;

  let textColor = "text-gray-200";
  if (better !== "neutral" && isBest) textColor = "text-green-400";
  if (better !== "neutral" && isWorst) textColor = "text-red-400";
  if (better === "neutral" && isGrowth) {
    textColor = isNeg ? "text-red-400" : "text-green-400";
  }

  return (
    <td className="px-3 py-2 text-center">
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-sm font-medium",
          isBest && better !== "neutral" && "bg-green-500/10",
          isWorst && better !== "neutral" && "bg-red-500/10",
          textColor,
        )}
      >
        {formatted}
        {isBest && better !== "neutral" && (
          <TrendingUp className="h-3 w-3 text-green-400" />
        )}
        {isWorst && better !== "neutral" && (
          <TrendingDown className="h-3 w-3 text-red-400" />
        )}
      </div>
    </td>
  );
}

// ─── Suggested Competitors ───────────────────────────────────────────────────

function SuggestedPeers({
  stocks,
  existingSymbols,
  onAdd,
}: {
  stocks: CompareStock[];
  existingSymbols: string[];
  onAdd: (symbol: string) => void;
}) {
  // Collect all unique peers from all currently compared stocks
  const allPeers = useMemo(() => {
    const peerSet = new Set<string>();
    stocks.forEach((s) => {
      s.peers.forEach((p: string) => {
        if (!existingSymbols.includes(p)) peerSet.add(p);
      });
    });
    return Array.from(peerSet).slice(0, 10);
  }, [stocks, existingSymbols]);

  if (allPeers.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-purple-400" />
        <span className="text-sm font-semibold text-gray-200">
          Suggested Competitors
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {allPeers.map((peer) => (
          <button
            key={peer}
            onClick={() => onAdd(peer)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-purple-400/40 hover:bg-purple-500/10 hover:text-white"
          >
            <Plus className="h-3 w-3" />
            {peer}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL"];

export function StockComparison() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse symbols from URL (or use defaults)
  const urlSymbols = searchParams.get("symbols");
  const [symbols, setSymbolsState] = useState<string[]>(() => {
    if (urlSymbols) {
      return urlSymbols
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 6);
    }
    return DEFAULT_SYMBOLS;
  });

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );

  // Sync URL
  const updateUrl = useCallback(
    (newSymbols: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("symbols", newSymbols.join(","));
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const addSymbol = useCallback(
    (symbol: string) => {
      if (symbols.length >= 6 || symbols.includes(symbol.toUpperCase())) return;
      const next = [...symbols, symbol.toUpperCase()];
      setSymbolsState(next);
      updateUrl(next);
    },
    [symbols, updateUrl],
  );

  const removeSymbol = useCallback(
    (symbol: string) => {
      const next = symbols.filter((s) => s !== symbol);
      setSymbolsState(next);
      updateUrl(next);
    },
    [symbols, updateUrl],
  );

  const toggleSection = useCallback((title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }, []);

  // Fetch comparison data
  const { data: stocks, isLoading } = api.asset.compareStocks.useQuery(
    { symbols },
    {
      enabled: symbols.length > 0,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 pb-16">
      {/* Stock headers + add button */}
      <div className="flex flex-wrap items-start gap-3">
        {isLoading
          ? symbols.map((s) => (
              <div
                key={s}
                className="flex h-[160px] w-[180px] animate-pulse flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5"
              >
                <div className="h-10 w-10 rounded-lg bg-white/10" />
                <div className="h-4 w-12 rounded bg-white/10" />
                <div className="h-3 w-20 rounded bg-white/10" />
              </div>
            ))
          : stocks?.map((stock) => (
              <StockHeader
                key={stock.symbol}
                stock={stock}
                onRemove={() => removeSymbol(stock.symbol)}
              />
            ))}
        {symbols.length < 6 && (
          <StockSearchPopover onSelect={addSymbol} existingSymbols={symbols} />
        )}
      </div>

      {/* Suggested competitors */}
      {stocks && stocks.length > 0 && (
        <SuggestedPeers
          stocks={stocks}
          existingSymbols={symbols}
          onAdd={addSymbol}
        />
      )}

      {/* Comparison table */}
      {stocks && stocks.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="sticky left-0 z-10 min-w-[200px] bg-[#1a1b35] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Metric
                </th>
                {stocks.map((stock) => (
                  <th
                    key={stock.symbol}
                    className="min-w-[140px] px-3 py-3 text-center text-sm font-bold text-white"
                  >
                    {stock.symbol}
                  </th>
                ))}
                <th className="min-w-[180px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Benchmark
                </th>
              </tr>
            </thead>
            <tbody>
              {METRIC_SECTIONS.map((section) => {
                const isCollapsed = collapsedSections.has(section.title);
                return (
                  <React.Fragment key={section.title}>
                    {/* Section header row */}
                    <tr
                      className="cursor-pointer border-b border-white/5 bg-purple-500/5 transition-colors hover:bg-purple-500/10"
                      onClick={() => toggleSection(section.title)}
                    >
                      <td
                        colSpan={stocks.length + 2}
                        className="sticky left-0 z-10 px-4 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400">
                            {section.icon}
                          </span>
                          <span className="text-sm font-semibold text-purple-300">
                            {section.title}
                          </span>
                          {isCollapsed ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Metric rows */}
                    {!isCollapsed &&
                      section.metrics.map((metric) => {
                        const values = stocks.map((s) => metric.getValue(s));
                        const validValues = values.filter(
                          (v): v is number => v != null && isFinite(v),
                        );

                        let bestIdx = -1;
                        let worstIdx = -1;
                        if (
                          metric.better !== "neutral" &&
                          validValues.length > 1
                        ) {
                          const sorted = [...validValues].sort((a, b) => a - b);
                          const best =
                            metric.better === "higher"
                              ? sorted[sorted.length - 1]
                              : sorted[0];
                          const worst =
                            metric.better === "higher"
                              ? sorted[0]
                              : sorted[sorted.length - 1];
                          bestIdx = values.findIndex((v) => v === best);
                          worstIdx = values.findIndex((v) => v === worst);
                          // Don't highlight if all values are the same
                          if (best === worst) {
                            bestIdx = -1;
                            worstIdx = -1;
                          }
                        }

                        return (
                          <tr
                            key={metric.key}
                            className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                          >
                            <td className="sticky left-0 z-10 bg-[#15162c] px-4 py-2 text-xs text-gray-300">
                              <div className="flex items-center gap-1">
                                {metric.label}
                              </div>
                            </td>
                            {stocks.map((stock, idx) => (
                              <MetricCell
                                key={stock.symbol}
                                value={values[idx] ?? null}
                                formatted={metric.format(values[idx] ?? null)}
                                isBest={idx === bestIdx}
                                isWorst={idx === worstIdx}
                                better={metric.better}
                              />
                            ))}
                            <td className="px-3 py-2 text-center text-[10px] text-gray-500">
                              {BENCHMARKS[metric.key] ?? ""}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}

              {/* Market Data Section */}
              <tr
                className="cursor-pointer border-b border-white/5 bg-purple-500/5 transition-colors hover:bg-purple-500/10"
                onClick={() => toggleSection("__market")}
              >
                <td
                  colSpan={stocks.length + 2}
                  className="sticky left-0 z-10 px-4 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-300">
                      Market Data
                    </span>
                    {collapsedSections.has("__market") ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </td>
              </tr>
              {!collapsedSections.has("__market") && (
                <>
                  <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-[#15162c] px-4 py-2 text-xs text-gray-300">
                      Market Cap
                    </td>
                    {stocks.map((s) => (
                      <td
                        key={s.symbol}
                        className="px-3 py-2 text-center font-mono text-sm text-gray-200"
                      >
                        {fmtMoney(s.marketCap)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-[10px] text-gray-500" />
                  </tr>
                  <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-[#15162c] px-4 py-2 text-xs text-gray-300">
                      52W Range
                    </td>
                    {stocks.map((s) => (
                      <td
                        key={s.symbol}
                        className="px-3 py-2 text-center font-mono text-xs text-gray-300"
                      >
                        ${s.yearLow.toFixed(0)} – ${s.yearHigh.toFixed(0)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-[10px] text-gray-500" />
                  </tr>
                  <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-[#15162c] px-4 py-2 text-xs text-gray-300">
                      50-Day Avg
                    </td>
                    {stocks.map((s) => (
                      <td
                        key={s.symbol}
                        className="px-3 py-2 text-center font-mono text-sm text-gray-200"
                      >
                        ${s.priceAvg50.toFixed(2)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-[10px] text-gray-500" />
                  </tr>
                  <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-[#15162c] px-4 py-2 text-xs text-gray-300">
                      200-Day Avg
                    </td>
                    {stocks.map((s) => (
                      <td
                        key={s.symbol}
                        className="px-3 py-2 text-center font-mono text-sm text-gray-200"
                      >
                        ${s.priceAvg200.toFixed(2)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-[10px] text-gray-500" />
                  </tr>
                  <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-[#15162c] px-4 py-2 text-xs text-gray-300">
                      Avg Volume
                    </td>
                    {stocks.map((s) => (
                      <td
                        key={s.symbol}
                        className="px-3 py-2 text-center font-mono text-sm text-gray-200"
                      >
                        {formatLargeNumber(s.avgVolume)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-[10px] text-gray-500" />
                  </tr>
                  <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-[#15162c] px-4 py-2 text-xs text-gray-300">
                      Employees
                    </td>
                    {stocks.map((s) => (
                      <td
                        key={s.symbol}
                        className="px-3 py-2 text-center font-mono text-sm text-gray-200"
                      >
                        {s.employees
                          ? parseInt(s.employees).toLocaleString()
                          : "N/A"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-[10px] text-gray-500" />
                  </tr>
                  <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-[#15162c] px-4 py-2 text-xs text-gray-300">
                      Sector
                    </td>
                    {stocks.map((s) => (
                      <td
                        key={s.symbol}
                        className="px-3 py-2 text-center text-xs text-gray-300"
                      >
                        {s.sector || "N/A"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-[10px] text-gray-500" />
                  </tr>
                  <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-[#15162c] px-4 py-2 text-xs text-gray-300">
                      Industry
                    </td>
                    {stocks.map((s) => (
                      <td
                        key={s.symbol}
                        className="px-3 py-2 text-center text-xs text-gray-300"
                      >
                        {s.industry || "N/A"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-[10px] text-gray-500" />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {symbols.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <BarChart3 className="mb-4 h-12 w-12 text-gray-600" />
          <h2 className="mb-2 text-lg font-semibold text-gray-300">
            Compare Stocks Side by Side
          </h2>
          <p className="mb-6 max-w-md text-sm text-gray-500">
            Add up to 6 stocks to compare their fundamentals, valuations, growth
            metrics, profitability, and more.
          </p>
          <StockSearchPopover onSelect={addSymbol} existingSymbols={[]} />
        </div>
      )}
    </div>
  );
}

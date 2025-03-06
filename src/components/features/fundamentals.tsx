import { Check, X } from "lucide-react";
import React from "react";
import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { type EquityFundamentalsMultipleResponse } from "~/server/api/schema/EquityFundamentalsMultiple";

interface MetricCardProps {
  title: string;
  value: number;
  threshold: number;
  isHigherBetter: boolean;
  format?: (value: number) => string;
  explanation: string;
}

const MetricCard = ({
  title,
  value,
  threshold,
  isHigherBetter,
  format,
  explanation,
}: MetricCardProps) => {
  const isGood = isHigherBetter ? value >= threshold : value <= threshold;
  const formattedValue = format ? format(value) : value?.toFixed(2);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-full w-44 cursor-help rounded-lg border border-gray-200 p-3 shadow-sm transition-colors hover:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <h3 className="truncate text-xs font-medium text-gray-300 sm:text-sm">
                {title}
              </h3>
              {isGood ? (
                <Check className="h-4 w-4 flex-shrink-0 text-green-500 sm:h-5 sm:w-5" />
              ) : (
                <X className="h-4 w-4 flex-shrink-0 text-red-500 sm:h-5 sm:w-5" />
              )}
            </div>
            <p className="mt-1 truncate text-lg font-semibold text-orange-50 sm:mt-2 sm:text-2xl">
              {formattedValue}
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{explanation}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isHigherBetter
              ? `Higher than ${threshold} is considered good`
              : `Lower than ${threshold} is considered good`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface MetricAnalysis {
  title: string;
  value: number;
  threshold: number;
  isHigherBetter: boolean;
  format?: (value: number) => string;
  explanation: string;
}

const createMetricCards = (
  metrics: EquityFundamentalsMultipleResponse["results"][0],
): MetricAnalysis[] => [
  {
    title: "P/E Ratio",
    value: metrics.pe_ratio_ttm,
    threshold: 20,
    isHigherBetter: false,
    explanation:
      "Price-to-Earnings indicates valuation multiple. Below 20 suggests reasonable valuation, while high P/E may signal overvaluation or high growth expectations. Compare with industry average for context.",
  },
  {
    title: "Current Ratio",
    value: metrics.current_ratio_ttm,
    threshold: 1.5,
    isHigherBetter: true,
    explanation:
      "Liquidity measure showing ability to cover short-term obligations. Above 1.5 indicates strong working capital position. Below 1 signals potential liquidity risks. Critical for operational stability.",
  },
  {
    title: "Debt to Equity",
    value: metrics.debt_to_equity_ttm,
    threshold: 0.5,
    isHigherBetter: false,
    explanation:
      "Capital structure health indicator. Lower ratio suggests financial stability. High leverage can amplify returns but increases financial risk. Industry-dependent, but generally prefer below 0.5 for safety.",
  },
  {
    title: "ROE",
    value: metrics.roe_ttm,
    threshold: 0.15,
    isHigherBetter: true,
    format: (value) => `${(value * 100).toFixed(1)}%`,
    explanation:
      "Return on Equity measures management's efficiency using shareholder capital. Above 15% indicates strong profitability and competitive advantage. Key metric for value creation.",
  },
  {
    title: "ROIC",
    value: metrics.roic_ttm,
    threshold: 0.1, // 10% is generally considered good across industries
    isHigherBetter: true,
    format: (value) => `${(value * 100).toFixed(1)}%`,
    explanation:
      "Return on Invested Capital measures how efficiently a company uses all capital (equity + debt) to generate profits. Above 10% indicates strong competitive advantage and efficient capital allocation. Compare with WACC for value creation assessment. High ROIC suggests sustainable competitive moat and superior management execution. Critical for PE/VC investment decisions.",
  },
  {
    title: "Free Cash Flow Yield",
    value: metrics.free_cash_flow_yield_ttm,
    threshold: 0.05,
    isHigherBetter: true,
    format: (value) => `${(value * 100).toFixed(1)}%`,
    explanation:
      "Cash generation vs market value. Higher FCF yield suggests undervaluation and strong cash generation. Above 5% indicates good value. Important for dividend sustainability and growth funding.",
  },
];

export const Fundamentals = () => {
  const [symbol] = useSymbol();
  const { data, isLoading } = api.asset.equityFundamentalMultiples.useQuery(
    symbol ?? "",
    {
      enabled: !!symbol,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  if (isLoading) {
    return (
      <div className="h-full w-full p-2">
        <div className="flex flex-wrap items-stretch gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-[100px] min-w-[200px] flex-1 animate-pulse flex-col justify-between rounded-lg border border-gray-700 bg-[#121327] p-4"
            >
              <div className="h-4 w-24 rounded bg-gray-700"></div>
              <div className="h-8 w-full rounded bg-gray-700"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data?.results?.[0]) return <div>No fundamental data available</div>;
  const metrics = data.results[0];

  return (
    <div className="h-full w-full overflow-auto p-2">
      <div className="flex flex-wrap items-stretch justify-center gap-2">
        {createMetricCards(metrics).map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            threshold={metric.threshold}
            isHigherBetter={metric.isHigherBetter}
            format={metric.format}
            explanation={metric.explanation}
          />
        ))}
      </div>
    </div>
  );
};

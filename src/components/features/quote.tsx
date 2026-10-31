"use client";
import React from "react";
import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";
import { formatLargeNumber } from "~/lib/utils";
import { Card } from "~/components/ui/card";
import { BarChart, DollarSign, TrendingUp } from "lucide-react";
import { type EquityQuoteItem } from "~/server/api/schema/EquityQuote";

export const QuoteMetrics = ({ data }: { data: EquityQuoteItem }) => {
  return (
    <div className="grid gap-4 p-4">
      {/* Price Metrics */}
      <Card className="bg-transparent p-4 text-muted-foreground">
        <h3 className="mb-3 flex items-center text-sm font-semibold">
          <DollarSign className="mr-2 h-5 w-5" />
          Price Metrics
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Current</span>
            <span className="tabular-nums">${data.price}</span>
          </div>
          <div className="flex justify-between">
            <span>Change</span>
            <span
              className={`tabular-nums ${data.change >= 0 ? "text-positive" : "text-negative"}`}
            >
              {data.change > 0 ? "+" : ""}
              {data.change} ({data.changesPercentage.toFixed(2)}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Day Range</span>
            <span className="tabular-nums">
              ${data.dayLow} - ${data.dayHigh}
            </span>
          </div>
          <div className="flex justify-between">
            <span>52W Range</span>
            <span className="tabular-nums">
              ${data.yearLow} - ${data.yearHigh}
            </span>
          </div>
        </div>
      </Card>

      {/* Volume Metrics */}
      <Card className="bg-transparent p-4 text-muted-foreground">
        <h3 className="mb-3 flex items-center text-sm font-semibold">
          <BarChart className="mr-2 h-5 w-5" />
          Volume Metrics
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Volume</span>
            <span className="tabular-nums">{formatLargeNumber(data.volume)}</span>
          </div>
          <div className="flex justify-between">
            <span>Avg Volume</span>
            <span className="tabular-nums">
              {formatLargeNumber(data.avgVolume)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Market Cap</span>
            <span className="tabular-nums">
              {formatLargeNumber(data.marketCap)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Shares Out</span>
            <span className="tabular-nums">
              {formatLargeNumber(data.sharesOutstanding)}
            </span>
          </div>
        </div>
      </Card>

      {/* Trading Metrics */}
      <Card className="bg-transparent p-4 text-muted-foreground">
        <h3 className="mb-3 flex items-center text-sm font-semibold">
          <TrendingUp className="mr-2 h-5 w-5" />
          Trading Metrics
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>50d Avg</span>
            <span className="tabular-nums">${data.priceAvg50.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>200d Avg</span>
            <span className="tabular-nums">${data.priceAvg200.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>P/E Ratio</span>
            <span className="tabular-nums">{data.pe.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>EPS</span>
            <span className="tabular-nums">${data.eps}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
export const Quote = () => {
  const [symbol] = useSymbol();
  const { data } = api.asset.equityQuote.useQuery(symbol);

  if (!data?.[0]) return null;

  return <QuoteMetrics data={data[0]} />;
};

"use client";

import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";
import { formatLargeNumber } from "~/lib/utils";
import { ShieldAlert, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";

export const InsiderTrading = () => {
  const [symbol] = useSymbol();
  const { data, isLoading } = api.asset.insiderTrading.useQuery(symbol ?? "", {
    enabled: !!symbol,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
          <ShieldAlert className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-semibold text-gray-200">Insider Trading</span>
        </div>
        <div className="flex-1 space-y-2 p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-white/10" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="h-2.5 w-16 rounded bg-white/10" />
              </div>
              <div className="h-3 w-14 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
          <ShieldAlert className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-semibold text-gray-200">Insider Trading</span>
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
          No insider trading data
        </div>
      </div>
    );
  }

  // Summarize: total buys vs sells in last 12 months
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const recent = data.filter((t) => new Date(t.transactionDate) >= oneYearAgo);
  const buys = recent.filter((t) => t.acquistionOrDisposition === "A");
  const sells = recent.filter((t) => t.acquistionOrDisposition === "D");
  const totalBuyValue = buys.reduce((s, t) => s + t.securitiesTransacted * t.price, 0);
  const totalSellValue = sells.reduce((s, t) => s + t.securitiesTransacted * t.price, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
        <ShieldAlert className="h-4 w-4 text-orange-400" />
        <span className="text-sm font-semibold text-gray-200">Insider Trading</span>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-2 border-b border-white/5 px-4 py-2">
        <div className="rounded-md bg-green-500/10 px-3 py-1.5 text-center">
          <div className="text-[10px] uppercase text-green-400">Buys (12m)</div>
          <div className="font-mono text-sm font-bold text-green-300">
            {buys.length}
          </div>
          <div className="font-mono text-[10px] text-green-400/70">
            ${formatLargeNumber(totalBuyValue)}
          </div>
        </div>
        <div className="rounded-md bg-red-500/10 px-3 py-1.5 text-center">
          <div className="text-[10px] uppercase text-red-400">Sells (12m)</div>
          <div className="font-mono text-sm font-bold text-red-300">
            {sells.length}
          </div>
          <div className="font-mono text-[10px] text-red-400/70">
            ${formatLargeNumber(totalSellValue)}
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-auto">
        {data.slice(0, 30).map((trade, idx) => {
          const isBuy = trade.acquistionOrDisposition === "A";
          const value = trade.securitiesTransacted * trade.price;
          return (
            <div
              key={`${trade.reportingName}-${trade.transactionDate}-${idx}`}
              className="flex items-start gap-2 border-b border-white/5 px-3 py-1.5 transition-colors hover:bg-white/5"
            >
              <div className="mt-0.5">
                {isBuy ? (
                  <ArrowUpRight className="h-4 w-4 text-green-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-xs font-medium text-gray-200">
                    {trade.reportingName}
                  </span>
                  <span className="shrink-0 text-[10px] text-gray-500">
                    ({trade.typeOfOwner})
                  </span>
                </div>
                <div className="text-[10px] text-gray-500">
                  {trade.transactionType} &middot;{" "}
                  {format(new Date(trade.transactionDate), "MMM d, yyyy")}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className={`font-mono text-xs font-medium ${
                    isBuy ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {value > 0 ? `${isBuy ? "+" : "-"}$${formatLargeNumber(value)}` : "Unknown"}
                </div>
                <div className="font-mono text-[10px] text-gray-500">
                  {formatLargeNumber(trade.securitiesTransacted)} @{" "}
                  {trade.price > 0 ? `$${trade.price.toFixed(2)}` : "Unknown"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

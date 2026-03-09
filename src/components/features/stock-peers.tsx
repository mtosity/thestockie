"use client";

import Image from "next/image";
import { useState } from "react";
import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";
import { formatLargeNumber } from "~/lib/utils";
import { Users } from "lucide-react";

function PeerLogo({ symbol }: { symbol: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="flex h-8 w-8 items-center justify-center rounded bg-white/10 text-[10px] font-bold text-gray-300">
      {symbol.slice(0, 2)}
    </div>
  ) : (
    <Image
      src={`https://financialmodelingprep.com/image-stock/${symbol}.png`}
      alt={symbol}
      width={32}
      height={32}
      className="rounded object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export const StockPeers = () => {
  const [symbol] = useSymbol();
  const { data, isLoading } = api.asset.stockPeers.useQuery(symbol ?? "", {
    enabled: !!symbol,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
          <Users className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-semibold text-gray-200">Competitors</span>
        </div>
        <div className="flex-1 space-y-2 p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3">
              <div className="h-8 w-8 rounded bg-white/10" />
              <div className="h-4 w-16 rounded bg-white/10" />
              <div className="ml-auto h-4 w-12 rounded bg-white/10" />
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
          <Users className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-semibold text-gray-200">Competitors</span>
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
          No peer data available
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
        <Users className="h-4 w-4 text-purple-400" />
        <span className="text-sm font-semibold text-gray-200">Competitors</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-[11px] uppercase text-gray-500">
              <th className="px-3 py-1.5 text-left">Company</th>
              <th className="px-3 py-1.5 text-right">Price</th>
              <th className="px-3 py-1.5 text-right">Change</th>
              <th className="hidden px-3 py-1.5 text-right sm:table-cell">Mkt Cap</th>
            </tr>
          </thead>
          <tbody>
            {data.map((peer) => (
              <tr
                key={peer.symbol}
                className="border-b border-white/5 transition-colors hover:bg-white/5"
              >
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <PeerLogo symbol={peer.symbol} />
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-purple-300">
                        {peer.symbol}
                      </div>
                      <div className="truncate text-[10px] text-gray-500">
                        {peer.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-xs text-gray-200">
                  ${peer.price?.toFixed(2)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <span
                    className={`font-mono text-xs ${
                      peer.changesPercentage >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {peer.changesPercentage >= 0 ? "+" : ""}
                    {peer.changesPercentage?.toFixed(2)}%
                  </span>
                </td>
                <td className="hidden px-3 py-1.5 text-right font-mono text-xs text-gray-400 sm:table-cell">
                  {formatLargeNumber(peer.marketCap)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

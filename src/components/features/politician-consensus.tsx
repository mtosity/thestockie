"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Landmark, ShoppingCart, TrendingDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { InvestorConsensusBadge } from "./super-investor-shared";

// The tRPC router output for politician.consensus
export interface PoliticianConsensusRow {
  ticker: string;
  name: string;
  buyers: number;
  sellers: number;
  buyerNames: string[];
  sellerNames: string[];
  totalTrades: number;
  consensus: string;
}

export interface PoliticianConsensus {
  bought: PoliticianConsensusRow[];
  sold: PoliticianConsensusRow[];
}

function CountBadge({
  count,
  arrow,
  color,
  names,
}: {
  count: number;
  arrow: string;
  color: string;
  names: string[];
}) {
  if ((names?.length ?? 0) === 0) {
    return (
      <span className={color}>
        {count}
        {arrow}
      </span>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`cursor-help ${color}`}>
          {count}
          {arrow}
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[220px] sm:max-w-[260px]">
        <ul className="space-y-0.5 text-xs leading-snug">
          {names.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function SymbolRow({ row, rank }: { row: PoliticianConsensusRow; rank: number }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-2 sm:gap-3 sm:px-3">
      <span className="w-4 shrink-0 text-right text-xs text-muted-foreground">{rank}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href={`/?symbol=${row.ticker}`}
            className="font-semibold text-foreground hover:underline"
          >
            {row.ticker}
          </Link>
          <InvestorConsensusBadge consensus={row.consensus} />
        </div>
        {row.name && <p className="truncate text-xs text-muted-foreground">{row.name}</p>}
      </div>
      <div className="shrink-0 text-right text-xs sm:text-sm">
        <CountBadge count={row.buyers} arrow="↑" color="text-positive" names={row.buyerNames} />{" "}
        <CountBadge count={row.sellers} arrow="↓" color="text-negative" names={row.sellerNames} />
      </div>
    </div>
  );
}

function Side({
  title,
  icon,
  accent,
  rows,
  empty,
}: {
  title: string;
  icon: ReactNode;
  accent: string;
  rows?: PoliticianConsensusRow[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-0 p-4 pb-3 sm:p-6">
        <div className={`flex items-center gap-2 text-sm font-semibold ${accent}`}>
          {icon} {title}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 p-4 pt-0 sm:p-6 sm:pt-0">
        {(rows?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          rows?.map((row, i) => <SymbolRow key={row.ticker} row={row} rank={i + 1} />)
        )}
      </CardContent>
    </Card>
  );
}

export function PoliticianConsensus({ consensus }: { consensus: PoliticianConsensus }) {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="grid gap-4 md:grid-cols-2">
        <Side
          title="Most bought by politicians"
          icon={<ShoppingCart className="h-4 w-4" />}
          accent="text-positive"
          rows={consensus.bought}
          empty="No politician buying activity detected."
        />
        <Side
          title="Most sold by politicians"
          icon={<TrendingDown className="h-4 w-4" />}
          accent="text-negative"
          rows={consensus.sold}
          empty="No politician selling activity detected."
        />
      </div>
    </TooltipProvider>
  );
}
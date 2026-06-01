"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ShoppingCart, TrendingDown } from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { InvestorConsensusBadge } from "./super-investor-shared";

type Consensus = RouterOutputs["superInvestor"]["consensus"];
type Row = Consensus["bought"][number];

function InvestorCount({
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
      <TooltipContent side="left" className="max-w-[260px]">
        <ul className="space-y-0.5 text-xs leading-snug">
          {names.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function SymbolRow({ row, rank }: { row: Row; rank: number }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-black/20 px-3 py-2">
      <span className="w-4 shrink-0 text-right text-xs text-gray-500">{rank}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/?symbol=${row.ticker}`}
            className="font-semibold text-white hover:underline"
          >
            {row.ticker}
          </Link>
          <InvestorConsensusBadge consensus={row.consensus} />
        </div>
        {row.name && <p className="truncate text-xs text-gray-500">{row.name}</p>}
      </div>
      <div className="shrink-0 text-right text-sm">
        <InvestorCount count={row.buyers} arrow="↑" color="text-emerald-400" names={row.buyerNames} />{" "}
        <InvestorCount count={row.sellers} arrow="↓" color="text-rose-400" names={row.sellerNames} />
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
  rows: Row[];
  empty: string;
}) {
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="space-y-0 pb-3">
        <div className={`flex items-center gap-2 text-sm font-semibold ${accent}`}>
          {icon} {title}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">{empty}</p>
        ) : (
          rows.map((row, i) => <SymbolRow key={row.ticker} row={row} rank={i + 1} />)
        )}
      </CardContent>
    </Card>
  );
}

export function InvestorConsensus({ consensus }: { consensus: Consensus }) {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="grid gap-4 md:grid-cols-2">
        <Side
          title="Most bought"
          icon={<ShoppingCart className="h-4 w-4" />}
          accent="text-emerald-400"
          rows={consensus.bought}
          empty="No multi-investor buying this quarter."
        />
        <Side
          title="Most sold"
          icon={<TrendingDown className="h-4 w-4" />}
          accent="text-rose-400"
          rows={consensus.sold}
          empty="No multi-investor selling this quarter."
        />
      </div>
    </TooltipProvider>
  );
}

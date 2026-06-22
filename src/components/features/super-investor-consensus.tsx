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
  const consensus = row.consensus ?? "mixed";
  const buyers = row.buyers ?? 0;
  const buyerNames = row.buyerNames ?? [];
  const sellers = row.sellers ?? 0;
  const sellerNames = row.sellerNames ?? [];

  return (
    <div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2">
      <span className="w-4 shrink-0 text-right text-xs text-muted-foreground">{rank}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/?symbol=${row.ticker}`}
            className="font-semibold text-foreground hover:underline"
          >
            {row.ticker}
          </Link>
          <InvestorConsensusBadge consensus={consensus} />
        </div>
        {row.name && <p className="truncate text-xs text-muted-foreground">{row.name}</p>}
      </div>
      <div className="shrink-0 text-right text-sm">
        <InvestorCount count={buyers} arrow="↑" color="text-positive" names={buyerNames} />{" "}
        <InvestorCount count={sellers} arrow="↓" color="text-negative" names={sellerNames} />
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
  rows?: Row[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-0 pb-3">
        <div className={`flex items-center gap-2 text-sm font-semibold ${accent}`}>
          {icon} {title}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {(rows?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          rows?.map((row, i) => <SymbolRow key={row.ticker} row={row} rank={i + 1} />)
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
          accent="text-positive"
          rows={consensus.bought}
          empty="No multi-investor buying this quarter."
        />
        <Side
          title="Most sold"
          icon={<TrendingDown className="h-4 w-4" />}
          accent="text-negative"
          rows={consensus.sold}
          empty="No multi-investor selling this quarter."
        />
      </div>
    </TooltipProvider>
  );
}

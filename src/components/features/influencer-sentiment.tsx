"use client";

import { type ReactNode } from "react";
import { Flame, Snowflake } from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { ConsensusBadge } from "./influencer-shared";

type Sentiment = RouterOutputs["influencer"]["sentiment"];
type Row = Sentiment["bullish"][number];

// A stance count (e.g. "10↑") that, on hover, lists the creators holding it.
function CreatorCount({
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
      <TooltipContent side="left" className="max-w-[240px]">
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
    <div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2">
      <span className="w-4 shrink-0 text-right text-xs text-muted-foreground">{rank}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{row.symbol}</span>
          <ConsensusBadge consensus={row.consensus} />
        </div>
        {row.companyName && (
          <p className="truncate text-xs text-muted-foreground">{row.companyName}</p>
        )}
      </div>
      <div className="shrink-0 text-right text-sm">
        <CreatorCount
          count={row.bullishCount}
          arrow="↑"
          color="text-positive"
          names={row.bullishCreators ?? []}
        />{" "}
        <CreatorCount
          count={row.bearishCount}
          arrow="↓"
          color="text-negative"
          names={row.bearishCreators ?? []}
        />
        {row.neutralCount > 0 && (
          <>
            {" "}
            <CreatorCount
              count={row.neutralCount}
              arrow="·"
              color="text-slate-400"
              names={row.neutralCreators ?? []}
            />
          </>
        )}
      </div>
    </div>
  );
}

function LeaderCard({
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
    <Card>
      <CardHeader className="space-y-0 pb-3">
        <div className={`flex items-center gap-2 text-sm font-semibold ${accent}`}>
          {icon} {title}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          rows.map((row, i) => <SymbolRow key={row.symbol} row={row} rank={i + 1} />)
        )}
      </CardContent>
    </Card>
  );
}

export function SentimentLeaderboard({ sentiment }: { sentiment: Sentiment }) {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="grid gap-4 md:grid-cols-2">
        <LeaderCard
          title="Most bullish"
          icon={<Flame className="h-4 w-4" />}
          accent="text-positive"
          rows={sentiment.bullish}
          empty="No bullish consensus yet."
        />
        <LeaderCard
          title="Most bearish"
          icon={<Snowflake className="h-4 w-4" />}
          accent="text-negative"
          rows={sentiment.bearish}
          empty="No bearish consensus yet."
        />
      </div>
    </TooltipProvider>
  );
}

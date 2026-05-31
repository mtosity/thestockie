"use client";

import { type ReactNode } from "react";
import { Flame, Snowflake } from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { ConsensusBadge, netColor, formatNet } from "./influencer-shared";

type Sentiment = RouterOutputs["influencer"]["sentiment"];
type Row = Sentiment["bullish"][number];

function SymbolRow({ row, rank }: { row: Row; rank: number }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-black/20 px-3 py-2">
      <span className="w-4 shrink-0 text-right text-xs text-gray-500">{rank}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{row.symbol}</span>
          <ConsensusBadge consensus={row.consensus} />
        </div>
        {row.companyName && (
          <p className="truncate text-xs text-gray-500">{row.companyName}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className={`font-mono text-sm font-semibold ${netColor(row.netScore)}`}>
          {formatNet(row.netScore)}
        </div>
        <div className="text-[11px] text-gray-500">
          <span className="text-emerald-400">{row.bullishCount}↑</span>{" "}
          <span className="text-rose-400">{row.bearishCount}↓</span>
          {row.neutralCount > 0 && (
            <span className="text-slate-400"> {row.neutralCount}·</span>
          )}
        </div>
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
          rows.map((row, i) => <SymbolRow key={row.symbol} row={row} rank={i + 1} />)
        )}
      </CardContent>
    </Card>
  );
}

export function SentimentLeaderboard({ sentiment }: { sentiment: Sentiment }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <LeaderCard
        title="Most bullish"
        icon={<Flame className="h-4 w-4" />}
        accent="text-emerald-400"
        rows={sentiment.bullish}
        empty="No bullish consensus yet."
      />
      <LeaderCard
        title="Most bearish"
        icon={<Snowflake className="h-4 w-4" />}
        accent="text-rose-400"
        rows={sentiment.bearish}
        empty="No bearish consensus yet."
      />
    </div>
  );
}

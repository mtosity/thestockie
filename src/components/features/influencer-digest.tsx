"use client";

import {
  TrendingUp,
  TrendingDown,
  Repeat,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  SentimentBadge,
  Pill,
  netColor,
  formatNet,
} from "./influencer-shared";

type Digest = NonNullable<RouterOutputs["influencer"]["latestDigest"]>;

function LeaderRow({
  symbol,
  netScore,
  mentions,
}: {
  symbol: string;
  netScore: number;
  mentions: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-black/20 px-2 py-1.5 text-sm">
      <span className="font-semibold text-white">{symbol}</span>
      <span className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{mentions} mentions</span>
        <span className={`font-mono text-xs ${netColor(netScore)}`}>
          {formatNet(netScore)}
        </span>
      </span>
    </div>
  );
}

export function InfluencerDigest({ digest }: { digest: Digest }) {
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <h2 className="text-lg font-semibold">Daily Market Digest</h2>
          <p className="text-xs text-gray-400">
            {digest.date} · {digest.videosAnalyzed} videos · {digest.influencersCount}{" "}
            creators · {digest.windowDays}d window
          </p>
        </div>
        {digest.sentimentLabel && (
          <SentimentBadge label={digest.sentimentLabel} />
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="text-sm leading-relaxed text-gray-200">
          {digest.marketSentiment}
        </p>

        {digest.keyThemes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {digest.keyThemes.map((theme, i) => (
              <Pill
                key={i}
                className="bg-purple-500/15 text-purple-200 ring-purple-500/30"
              >
                {theme}
              </Pill>
            ))}
          </div>
        )}

        {(digest.bullishLeaders.length > 0 || digest.bearishLeaders.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" /> Most bullish
              </div>
              {digest.bullishLeaders.slice(0, 5).map((l) => (
                <LeaderRow key={l.symbol} {...l} />
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-rose-400">
                <TrendingDown className="h-3.5 w-3.5" /> Most bearish
              </div>
              {digest.bearishLeaders.slice(0, 5).map((l) => (
                <LeaderRow key={l.symbol} {...l} />
              ))}
            </div>
          </div>
        )}

        {digest.sectorRotation.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
              <Repeat className="h-3.5 w-3.5" /> Sector rotation
            </div>
            {digest.sectorRotation.map((r, i) => (
              <div key={i} className="rounded-md bg-black/20 px-3 py-2 text-sm">
                {(r.from ?? r.to) && (
                  <div className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-white">
                    {r.from && <span>{r.from}</span>}
                    <ArrowRight className="h-3 w-3 text-gray-500" />
                    {r.to && <span>{r.to}</span>}
                  </div>
                )}
                <p className="text-gray-300">{r.rationale}</p>
              </div>
            ))}
          </div>
        )}

        {digest.recommendedActions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
              <Lightbulb className="h-3.5 w-3.5" /> Recommended actions
            </div>
            {digest.recommendedActions.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md bg-black/20 px-3 py-2 text-sm"
              >
                <Pill className="mt-0.5 shrink-0 bg-purple-500/15 text-purple-200 ring-purple-500/30">
                  {a.action}
                </Pill>
                <p className="text-gray-300">
                  {a.symbol && (
                    <span className="font-semibold text-white">{a.symbol}: </span>
                  )}
                  {a.rationale}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

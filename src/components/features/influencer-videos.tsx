"use client";

import { ExternalLink } from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Pill, formatRelative } from "./influencer-shared";

type Video = RouterOutputs["influencer"]["recentVideos"][number];
type Mention = Video["mentions"][number];

const STANCE_CHIP: Record<string, string> = {
  bullish: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  bearish: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  neutral: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
};

function SymbolChip({ mention }: { mention: Mention }) {
  return (
    <Pill className={STANCE_CHIP[mention.stance] ?? STANCE_CHIP.neutral}>
      {mention.symbol}
    </Pill>
  );
}

function VideoRow({ video }: { video: Video }) {
  return (
    <div className="space-y-1.5 rounded-md bg-black/20 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-purple-200">
          {video.influencerName}
        </span>
        <span className="shrink-0 text-gray-500">
          {formatRelative(video.publishedAt)}
        </span>
      </div>
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-1.5 text-sm text-gray-200 hover:text-white"
      >
        <span className="line-clamp-2">{video.title}</span>
        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-gray-600 group-hover:text-gray-400" />
      </a>
      {video.mentions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {video.mentions.slice(0, 8).map((m) => (
            <SymbolChip key={m.symbol} mention={m} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RecentInfluencerVideos({ videos }: { videos: Video[] }) {
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="pb-3">
        <h2 className="text-sm font-semibold">Recently analyzed</h2>
      </CardHeader>
      <CardContent className="space-y-2">
        {videos.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No analyzed videos yet.
          </p>
        ) : (
          videos.map((v) => <VideoRow key={v.videoId} video={v} />)
        )}
      </CardContent>
    </Card>
  );
}

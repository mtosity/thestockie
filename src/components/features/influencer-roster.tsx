"use client";

import { Youtube } from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { formatRelative } from "./influencer-shared";

type Influencer = RouterOutputs["influencer"]["influencers"][number];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Row({ inf }: { inf: Influencer }) {
  const inner = (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-white/5">
      <Avatar className="h-9 w-9 shrink-0">
        {inf.avatar && <AvatarImage src={inf.avatar} alt={inf.name} />}
        <AvatarFallback className="bg-purple-500/20 text-xs text-purple-200">
          {initials(inf.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-white">{inf.name}</span>
          {inf.youtubeUrl && <Youtube className="h-3.5 w-3.5 shrink-0 text-rose-400" />}
        </div>
        {inf.handle && <p className="truncate text-xs text-gray-500">{inf.handle}</p>}
      </div>
      <div className="shrink-0 text-right text-xs text-gray-400">
        <div>{inf.videoCount} videos</div>
        <div className="text-gray-600">{formatRelative(inf.lastPublishedAt)}</div>
      </div>
    </div>
  );

  return inf.youtubeUrl ? (
    <a href={inf.youtubeUrl} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}

export function InfluencerRoster({
  influencers,
}: {
  influencers: Influencer[];
}) {
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="pb-3">
        <h2 className="text-sm font-semibold">Tracked creators ({influencers.length})</h2>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {influencers.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No creators yet.
          </p>
        ) : (
          influencers.map((inf) => <Row key={inf._id} inf={inf} />)
        )}
      </CardContent>
    </Card>
  );
}

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

function channelUrl(inf: Influencer): string {
  if (inf.youtubeUrl) return inf.youtubeUrl;
  if (inf.handle) return `https://www.youtube.com/${inf.handle}`;
  return `https://www.youtube.com/channel/${inf.channelId}`;
}

function Row({ inf }: { inf: Influencer }) {
  return (
    <a
      href={channelUrl(inf)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
    >
      <Avatar className="h-9 w-9 shrink-0">
        {inf.avatar && <AvatarImage src={inf.avatar} alt={inf.name} />}
        <AvatarFallback className="bg-primary/20 text-xs text-foreground">
          {initials(inf.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-foreground group-hover:underline">
            {inf.name}
          </span>
          <Youtube className="h-3.5 w-3.5 shrink-0 text-negative" />
        </div>
        {inf.handle && <p className="truncate text-xs text-muted-foreground">{inf.handle}</p>}
      </div>
      <div className="shrink-0 text-right text-xs text-muted-foreground">
        <div>{inf.videoCount} videos</div>
        <div className="text-gray-600">{formatRelative(inf.lastPublishedAt)}</div>
      </div>
    </a>
  );
}

export function InfluencerRoster({
  influencers,
}: {
  influencers: Influencer[];
}) {
  return (
    <Card className="strategy-card text-card-foreground">
      <CardHeader className="pb-3">
        <h2 className="text-sm font-semibold">Tracked creators ({(influencers?.length ?? 0)})</h2>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {(influencers?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No creators yet.
          </p>
        ) : (
          influencers.map((inf) => <Row key={inf._id} inf={inf} />)
        )}
      </CardContent>
    </Card>
  );
}

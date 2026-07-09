"use client";

import { Radar, RefreshCw, Inbox } from "lucide-react";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent } from "~/components/ui/card";
import { InfluencerDigest } from "~/components/features/influencer-digest";
import { SentimentLeaderboard } from "~/components/features/influencer-sentiment";
import { InfluencerRoster } from "~/components/features/influencer-roster";
import { RecentInfluencerVideos } from "~/components/features/influencer-videos";
import { SuperInvestorsSection } from "~/components/features/super-investor-section";
import { formatRelative } from "~/components/features/influencer-shared";

function LoadingState() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Skeleton className="h-72 w-full rounded-xl bg-foreground/5" />
        <Skeleton className="h-64 w-full rounded-xl bg-foreground/5" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl bg-foreground/5" />
        <Skeleton className="h-64 w-full rounded-xl bg-foreground/5" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Inbox className="h-10 w-10 text-gray-600" />
        <h2 className="text-lg font-semibold">No influencer data yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Run the <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
            thestockie-influencer
          </code>{" "}
          job to scan tracked creators, transcribe their latest videos, and
          aggregate stock sentiment. Results will appear here automatically.
        </p>
      </CardContent>
    </Card>
  );
}

export default function InfluencersPage() {
  const digestQ = api.influencer.latestDigest.useQuery();
  const sentimentQ = api.influencer.sentiment.useQuery({ limit: 12 });
  const influencersQ = api.influencer.influencers.useQuery();
  const videosQ = api.influencer.recentVideos.useQuery({ limit: 12 });
  const runQ = api.influencer.latestRun.useQuery();

  const loading =
    digestQ.isLoading ||
    sentimentQ.isLoading ||
    influencersQ.isLoading ||
    videosQ.isLoading;

  const lastUpdated = runQ.data?.runAt ?? null;

  const hasData =
    !!digestQ.data ||
    (sentimentQ.data
      ? sentimentQ.data.bullish.length +
        sentimentQ.data.bearish.length +
        sentimentQ.data.mixed.length
      : 0) > 0 ||
    (influencersQ.data?.length ?? 0) > 0 ||
    (videosQ.data?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Radar className="h-7 w-7 text-foreground" /> Influencer Radar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              What YouTube stock creators are buying, selling, and saying —
              aggregated daily.
            </p>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" /> Updated{" "}
              {formatRelative(lastUpdated)}
            </div>
          )}
        </header>

        {loading ? (
          <LoadingState />
        ) : !hasData ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {digestQ.data && <InfluencerDigest digest={digestQ.data} />}
              {sentimentQ.data && (
                <SentimentLeaderboard sentiment={sentimentQ.data} />
              )}
            </div>
            <div className="space-y-4">
              {influencersQ.data && (
                <InfluencerRoster influencers={influencersQ.data} />
              )}
              {videosQ.data && <RecentInfluencerVideos videos={videosQ.data} />}
            </div>
          </div>
        )}

        <SuperInvestorsSection />
      </div>
    </div>
  );
}

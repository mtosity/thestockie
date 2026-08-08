import { Radar, RefreshCw, Inbox } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { InfluencerDigest } from "~/components/features/influencer-digest";
import { SentimentLeaderboard } from "~/components/features/influencer-sentiment";
import { InfluencerRoster } from "~/components/features/influencer-roster";
import { RecentInfluencerVideos } from "~/components/features/influencer-videos";
import { SuperInvestorsSection } from "~/components/features/super-investor-section";
import { PoliticianSection } from "~/components/features/politician-section";
import {
  InfluencerSeoSummary,
  formatAsOf,
} from "~/components/features/influencer-seo";
import {
  getInfluencerPageData,
  getSuperInvestorPageData,
  lastUpdatedAt,
} from "./_data";

// Rendered on the server so the digest, leaderboard, roster and 13F tables all
// ship in the initial HTML. See ./_data.ts for why.
export const revalidate = 3600;

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

export default async function InfluencersPage() {
  const [{ digest, sentiment, influencers, videos, run }, superInvestors] =
    await Promise.all([getInfluencerPageData(), getSuperInvestorPageData()]);

  const updatedAt = lastUpdatedAt(run, videos);

  const sentimentCount = sentiment
    ? sentiment.bullish.length + sentiment.bearish.length + sentiment.mixed.length
    : 0;
  const hasData =
    !!digest || sentimentCount > 0 || influencers.length > 0 || videos.length > 0;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-20 text-foreground">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Radar className="h-7 w-7 text-foreground" /> Influencer Radar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              What YouTube stock creators are buying, selling, and saying —
              aggregated daily from {influencers.length || "tracked"} channels
              and cross-checked against SEC 13F filings from legendary fund
              managers.
            </p>
          </div>
          {updatedAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" /> Updated{" "}
              <time dateTime={new Date(updatedAt).toISOString()}>
                {formatAsOf(updatedAt)}
              </time>
            </div>
          )}
        </header>

        {!hasData ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {digest && <InfluencerDigest digest={digest} />}
              {sentiment && <SentimentLeaderboard sentiment={sentiment} />}
            </div>
            <div className="space-y-4">
              <InfluencerRoster influencers={influencers} />
              <RecentInfluencerVideos videos={videos} />
            </div>
          </div>
        )}

        <SuperInvestorsSection
          consensus={superInvestors.consensus}
          moves={superInvestors.moves}
          investors={superInvestors.investors}
        />

        <PoliticianSection />

        <InfluencerSeoSummary
          sentiment={sentiment}
          creators={influencers}
          videoCount={videos.length}
          updatedAt={updatedAt}
          digestSummary={digest?.marketSentiment ?? null}
          consensusBought={superInvestors.consensus?.bought ?? []}
          period={superInvestors.consensus?.period ?? null}
        />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { convex } from "~/server/api/trpc";
import { api } from "../../../../convex/_generated/api";
import { InfluencerDetail } from "~/components/features/influencer-detail";

export const revalidate = 3600;

const BASE_URL = "https://thestockie.com";

type Params = { params: Promise<{ channelId: string }> };

async function getSummary(channelId: string) {
  try {
    return await convex.query(api.influencerReads.influencerSummary, {
      channelId,
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { channelId } = await params;
  const data = await getSummary(channelId);
  const url = `${BASE_URL}/influencers/${channelId}`;

  if (!data) {
    return {
      title: "Creator not found | The Stockie",
      alternates: { canonical: url },
    };
  }

  const name = data.influencer.name;
  const bullish = data.takes
    .filter((t) => t.stance === "bullish")
    .slice(0, 4)
    .map((t) => t.symbol);
  const title = `${name}'s market view & stock picks`;
  const desc = `What ${name} is saying about the market${
    bullish.length ? ` — bullish on ${bullish.join(", ")}` : ""
  }. AI-analyzed takes, buys and theses from their last ${data.stats.videoCount} videos.`;

  return {
    title: `${title} | The Stockie`,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc,
      type: "profile",
      url,
      siteName: "The Stockie",
      images: data.influencer.avatar
        ? [{ url: data.influencer.avatar, alt: name }]
        : ["/thumbnail.png"],
    },
    twitter: {
      card: "summary",
      title,
      description: desc,
      images: data.influencer.avatar ? [data.influencer.avatar] : ["/thumbnail.png"],
      creator: "@mtosity",
    },
  };
}

export default async function InfluencerDetailPage({ params }: Params) {
  const { channelId } = await params;
  return <InfluencerDetail channelId={channelId} />;
}

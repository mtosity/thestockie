import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { convex } from "~/server/api/trpc";
import { SITE_NAME, SITE_URL } from "~/lib/site";
import { api } from "../../../../convex/_generated/api";
import { InfluencerDetail } from "~/components/features/influencer-detail";

export const revalidate = 3600;

const BASE_URL = SITE_URL;

type Params = { params: Promise<{ channelId: string }> };

// Deduped between generateMetadata, the JSON-LD builder and the page render.
const getSummary = cache(async (channelId: string) => {
  try {
    return await convex.query(api.influencerReads.influencerSummary, {
      channelId,
    });
  } catch {
    return null;
  }
});

/** Pre-render every tracked creator so bots get a cached HTML doc, not a miss. */
export async function generateStaticParams() {
  try {
    const creators = await convex.query(api.influencerReads.influencers, {});
    return creators.map((c) => ({ channelId: c.channelId }));
  } catch {
    return [];
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
      robots: { index: false, follow: true },
    };
  }

  const name = data.influencer.name;
  const bullish = data.takes
    .filter((t) => t.stance === "bullish")
    .slice(0, 4)
    .map((t) => t.symbol);
  const title = `${name}'s stock picks & market view`;
  const desc = `Every stock ${name} has covered on YouTube${
    bullish.length ? `, currently bullish on ${bullish.join(", ")}` : ""
  } — AI-extracted buys, theses and price targets from their last ${data.stats.videoCount} videos, updated daily.`;

  return {
    title: `${title} | The Stockie`,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc,
      type: "profile",
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      images: data.influencer.avatar
        ? [{ url: data.influencer.avatar, alt: name }]
        : ["/thumbnail.png"],
    },
    twitter: {
      card: "summary",
      title,
      description: desc,
      images: data.influencer.avatar
        ? [data.influencer.avatar]
        : ["/thumbnail.png"],
      creator: "@mtosity",
      site: "@mtosity",
    },
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  };
}

type Summary = NonNullable<Awaited<ReturnType<typeof getSummary>>>;

function buildJsonLd(channelId: string, data: Summary) {
  const url = `${BASE_URL}/influencers/${channelId}`;
  const name = data.influencer.name;
  const modified = new Date(
    data.stats.lastPublishedAt ?? Date.now(),
  ).toISOString();

  const takeList = data.takes.slice(0, 25).map((t, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: t.symbol,
    description: [
      `${name} is ${t.stance} on ${t.symbol}`,
      t.action ? `action: ${t.action}` : null,
      t.conviction ? `${t.conviction} conviction` : null,
      t.thesis,
    ]
      .filter(Boolean)
      .join(" — "),
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": url,
        url,
        name: `${name}'s stock picks & market view`,
        description: `AI-extracted stock takes, buy calls and market commentary from ${name}'s YouTube videos.`,
        inLanguage: "en-US",
        dateModified: modified,
        isPartOf: { "@id": `${BASE_URL}/#website` },
        mainEntity: { "@id": `${url}#person` },
        ...(takeList.length > 0
          ? {
              hasPart: {
                "@type": "ItemList",
                "@id": `${url}#takes`,
                name: `Stocks ${name} has covered`,
                numberOfItems: takeList.length,
                itemListElement: takeList,
              },
            }
          : {}),
      },
      {
        "@type": "Person",
        "@id": `${url}#person`,
        name,
        url,
        jobTitle: "Stock market content creator",
        description: `YouTube finance creator covering ${data.stats.symbolsCovered} stocks across ${data.stats.videoCount} analyzed videos.`,
        ...(data.influencer.avatar ? { image: data.influencer.avatar } : {}),
        ...(data.influencer.handle
          ? { alternateName: data.influencer.handle }
          : {}),
        sameAs: [
          data.influencer.handle
            ? `https://www.youtube.com/${data.influencer.handle}`
            : `https://www.youtube.com/channel/${data.influencer.channelId}`,
        ],
        subjectOf: { "@id": url },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Influencer Radar",
            item: `${BASE_URL}/influencers`,
          },
          { "@type": "ListItem", position: 3, name, item: url },
        ],
      },
    ],
  };
}

export default async function InfluencerDetailPage({ params }: Params) {
  const { channelId } = await params;
  const data = await getSummary(channelId);

  if (!data) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(channelId, data)),
        }}
      />
      <InfluencerDetail data={data} />
    </>
  );
}

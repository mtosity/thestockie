import type { Metadata } from "next";
import { convex } from "~/server/api/trpc";
import { api } from "../../../convex/_generated/api";

export const revalidate = 3600; // refresh JSON-LD hourly

const BASE_URL = "https://thestockie.com";
const URL = `${BASE_URL}/influencers`;

const TITLE =
  "Influencer Radar & Super Investors — Stock Sentiment from YouTube & 13F Filings";
const DESCRIPTION =
  "Daily stock sentiment from top YouTube finance creators, plus quarterly SEC 13F holdings from legendary super investors like Warren Buffett and Bill Ackman. See bull/bear consensus, biggest new buys, and full exits.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "stock influencer sentiment",
    "YouTube stock picks",
    "stock sentiment tracker",
    "13F tracker",
    "super investor portfolio",
    "hedge fund holdings",
    "Warren Buffett portfolio",
    "stock consensus",
    "bullish bearish stocks",
  ].join(", "),
  alternates: { canonical: URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: URL,
    siteName: "The Stockie",
    images: [{ url: "/thumbnail.png", width: 1200, height: 630, alt: "The Stockie Influencer Radar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/thumbnail.png"],
    creator: "@mtosity",
  },
};

async function buildJsonLd() {
  let creators: { name: string; channelId: string; handle?: string }[] = [];
  let bought: { ticker: string; name: string; buyers: number }[] = [];
  try {
    [creators, bought] = await Promise.all([
      convex.query(api.influencerReads.influencers, {}),
      convex
        .query(api.superInvestorReads.consensus, { limit: 10 })
        .then((c) => c.bought),
    ]);
  } catch {
    // fall back to a static description-only graph
  }

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": URL,
    url: URL,
    name: TITLE,
    description: DESCRIPTION,
    isPartOf: { "@type": "WebSite", name: "The Stockie", url: BASE_URL },
    about: [
      {
        "@type": "Thing",
        name: "Stock influencer sentiment",
        description:
          "Aggregated bullish/bearish stock calls from YouTube finance creators.",
      },
      {
        "@type": "Thing",
        name: "Super investor 13F holdings",
        description:
          "Quarterly SEC Form 13F holdings and moves of well-known institutional investors.",
      },
    ],
    ...(creators.length > 0
      ? {
          mentions: creators.map((c) => ({
            "@type": "Person",
            name: c.name,
            sameAs: c.handle
              ? `https://www.youtube.com/${c.handle}`
              : `https://www.youtube.com/channel/${c.channelId}`,
          })),
        }
      : {}),
    ...(bought.length > 0
      ? {
          hasPart: {
            "@type": "ItemList",
            name: "Most-bought stocks across super investors",
            itemListElement: bought.map((r, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: r.ticker,
              description: `${r.name} — bought by ${r.buyers} investor${r.buyers === 1 ? "" : "s"}`,
            })),
          },
        }
      : {}),
  };
}

export default async function InfluencersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = await buildJsonLd();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}

import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "~/lib/site";
import { buildFaqJsonLd } from "~/components/features/influencer-seo";
import {
  getInfluencerPageData,
  getSuperInvestorPageData,
  lastUpdatedAt,
} from "./_data";

export const revalidate = 3600; // refresh JSON-LD hourly

const BASE_URL = SITE_URL;
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
    siteName: SITE_NAME,
    locale: "en_US",
    images: [
      {
        url: "/thumbnail.png",
        width: 1200,
        height: 630,
        alt: "The Stockie Influencer Radar — YouTube stock sentiment and 13F tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/thumbnail.png"],
    creator: "@mtosity",
    site: "@mtosity",
  },
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
};

/**
 * A single `@graph` describing the page: what it is, where it sits, who it
 * mentions, and the ranked lists it publishes. Answer engines lean on
 * ItemList + FAQPage to lift concrete claims, and on `dateModified` to decide
 * whether a "right now" question can be answered from this page at all.
 */
async function buildJsonLd() {
  const [{ sentiment, influencers, videos, run, digest }, superInvestors] =
    await Promise.all([getInfluencerPageData(), getSuperInvestorPageData()]);

  const updatedAt = lastUpdatedAt(run, videos);
  const modified = new Date(updatedAt ?? Date.now()).toISOString();
  const bought = superInvestors.consensus?.bought ?? [];

  const publisher = {
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: SITE_NAME,
    url: BASE_URL,
    logo: { "@type": "ImageObject", url: `${BASE_URL}/thumbnail.png` },
    sameAs: ["https://github.com/mtosity/thestockie", "https://mtosity.com"],
  };

  const rankedList = (
    id: string,
    name: string,
    description: string,
    rows: {
      symbol: string;
      companyName?: string | null;
      bullishCount?: number | null;
      bearishCount?: number | null;
      consensus?: string | null;
    }[],
    side: "bullish" | "bearish",
  ) => ({
    "@type": "ItemList",
    "@id": `${URL}#${id}`,
    name,
    description,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => {
      const count = side === "bullish" ? r.bullishCount : r.bearishCount;
      return {
        "@type": "ListItem",
        position: i + 1,
        name: r.symbol,
        description: [
          r.companyName ?? r.symbol,
          count
            ? `${count} tracked creator${count === 1 ? "" : "s"} are ${side}`
            : null,
          r.consensus ? `consensus: ${r.consensus.replace("_", " ")}` : null,
        ]
          .filter(Boolean)
          .join(" — "),
      };
    }),
  });

  const graph: Record<string, unknown>[] = [
    publisher,
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      name: SITE_NAME,
      url: BASE_URL,
      publisher: { "@id": `${BASE_URL}/#organization` },
    },
    {
      "@type": "CollectionPage",
      "@id": URL,
      url: URL,
      name: TITLE,
      headline: "Influencer Radar & Super Investors",
      description: DESCRIPTION,
      inLanguage: "en-US",
      dateModified: modified,
      isPartOf: { "@id": `${BASE_URL}/#website` },
      publisher: { "@id": `${BASE_URL}/#organization` },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: `${BASE_URL}/thumbnail.png`,
      },
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
      ...(influencers.length > 0
        ? {
            mentions: influencers.map((c) => ({
              "@type": "Person",
              "@id": `${URL}/${c.channelId}#person`,
              name: c.name,
              url: `${URL}/${c.channelId}`,
              jobTitle: "Stock market content creator",
              sameAs: c.handle
                ? `https://www.youtube.com/${c.handle}`
                : `https://www.youtube.com/channel/${c.channelId}`,
            })),
          }
        : {}),
      hasPart: [
        `${URL}#most-bullish`,
        `${URL}#most-bearish`,
        `${URL}#most-bought-13f`,
      ].map((id) => ({ "@id": id })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Influencer Radar", item: URL },
      ],
    },
    {
      "@type": "Dataset",
      "@id": `${URL}#dataset`,
      name: "YouTube stock creator sentiment & super investor 13F holdings",
      description:
        "Daily per-ticker bullish/bearish consensus extracted from transcribed YouTube finance videos, combined with quarterly SEC Form 13F holdings of well-known institutional investors.",
      url: URL,
      license: "https://www.gnu.org/licenses/agpl-3.0.html",
      creator: { "@id": `${BASE_URL}/#organization` },
      dateModified: modified,
      temporalCoverage: `../${modified.slice(0, 10)}`,
      keywords: [
        "stock sentiment",
        "YouTube finance creators",
        "SEC Form 13F",
        "institutional holdings",
        "bullish bearish consensus",
      ],
      isAccessibleForFree: true,
      measurementTechnique:
        "Automated speech-to-text transcription of public YouTube videos followed by LLM extraction of per-ticker stance, conviction and thesis; SEC EDGAR Form 13F parsing.",
    },
  ];

  if ((sentiment?.bullish.length ?? 0) > 0) {
    graph.push(
      rankedList(
        "most-bullish",
        "Stocks YouTube creators are most bullish on",
        `Tickers with the strongest bullish consensus across ${influencers.length} tracked YouTube stock creators.`,
        sentiment!.bullish,
        "bullish",
      ),
    );
  }

  if ((sentiment?.bearish.length ?? 0) > 0) {
    graph.push(
      rankedList(
        "most-bearish",
        "Stocks YouTube creators are most bearish on",
        `Tickers with the strongest bearish consensus across ${influencers.length} tracked YouTube stock creators.`,
        sentiment!.bearish,
        "bearish",
      ),
    );
  }

  if (bought.length > 0) {
    graph.push({
      "@type": "ItemList",
      "@id": `${URL}#most-bought-13f`,
      name: "Most-bought stocks across super investors",
      description: `Stocks bought by the largest number of tracked super investors in ${superInvestors.consensus?.period ?? "the latest"} SEC Form 13F filings.`,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: bought.length,
      itemListElement: bought.map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: r.ticker,
        description: `${r.name} — bought by ${r.buyers} investor${r.buyers === 1 ? "" : "s"}`,
      })),
    });
  }

  graph.push({
    ...buildFaqJsonLd({
      sentiment,
      creators: influencers,
      videoCount: videos.length,
      updatedAt,
      digestSummary: digest?.marketSentiment ?? null,
      consensusBought: bought,
      period: superInvestors.consensus?.period ?? null,
    }),
    "@id": `${URL}#faq`,
    isPartOf: { "@id": URL },
  });

  return { "@context": "https://schema.org", "@graph": graph };
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

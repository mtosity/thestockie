import type { Metadata } from "next";
import { convex } from "~/server/api/trpc";
import { api } from "../../../../convex/_generated/api";
import { InvestorDetail } from "~/components/features/investor-detail";

export const revalidate = 3600; // refresh metadata/JSON-LD hourly

const BASE_URL = "https://thestockie.com";

type Params = { params: Promise<{ slug: string }> };

async function getInvestor(slug: string) {
  try {
    return await convex.query(api.superInvestorReads.investorBySlug, { slug });
  } catch {
    return null;
  }
}

function periodLabel(p: string | null): string {
  if (!p) return "";
  const [y, q] = p.split("-");
  return `${q} ${y}`;
}

function money(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${Math.round(v)}`;
}

export async function generateStaticParams() {
  try {
    const investors = await convex.query(api.superInvestorReads.investors, {});
    return investors.map((i) => ({ slug: i.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = await getInvestor(slug);
  const url = `${BASE_URL}/investors/${slug}`;

  if (!data) {
    return {
      title: "Investor not found | The Stockie",
      alternates: { canonical: url },
    };
  }

  const { investor, filing, period } = data;
  const q = periodLabel(period);
  const firm = investor.firm ?? "";
  const title = `${investor.name}'s 13F Portfolio${q ? ` (${q})` : ""} — ${firm} holdings & moves`;
  const desc = filing
    ? `${investor.name}${firm ? ` of ${firm}` : ""} disclosed ${filing.holdingsCount} holdings worth ${money(filing.totalValue)} in the ${q} SEC 13F filing. See top positions, new buys, adds, trims and full exits.`
    : `Track ${investor.name}${firm ? ` of ${firm}` : ""} — latest SEC 13F holdings, top buys and exits.`;

  return {
    title: `${title} | The Stockie`,
    description: desc,
    keywords: [
      investor.name,
      firm,
      "13F",
      "13F filing",
      "portfolio",
      "holdings",
      "hedge fund",
      "super investor",
      "stock picks",
    ]
      .filter(Boolean)
      .join(", "),
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc,
      type: "profile",
      url,
      siteName: "The Stockie",
      images: investor.avatar
        ? [{ url: investor.avatar, alt: investor.name }]
        : ["/thumbnail.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: investor.avatar ? [investor.avatar] : ["/thumbnail.png"],
      creator: "@mtosity",
    },
  };
}

export default async function InvestorDetailPage({ params }: Params) {
  const { slug } = await params;
  const data = await getInvestor(slug);
  const url = `${BASE_URL}/investors/${slug}`;

  // Server-rendered structured data so Google + AI crawlers read the holdings
  // even without executing the client-side query.
  const jsonLd = data
    ? {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "@id": url,
        url,
        ...(data.filing
          ? { dateModified: new Date(data.filing.filingDate).toISOString() }
          : {}),
        mainEntity: {
          "@type": "Person",
          name: data.investor.name,
          jobTitle: "Investor",
          ...(data.investor.firm
            ? {
                worksFor: {
                  "@type": "Organization",
                  name: data.investor.firm,
                },
              }
            : {}),
          ...(data.investor.why ? { description: data.investor.why } : {}),
        },
        about: {
          "@type": "Dataset",
          name: `${data.investor.name} SEC Form 13F holdings${
            periodLabel(data.period) ? ` (${periodLabel(data.period)})` : ""
          }`,
          description: `Long US equity positions disclosed by ${data.investor.name} in their quarterly SEC Form 13F-HR filing.`,
          ...(data.filing
            ? {
                dateModified: new Date(data.filing.filingDate).toISOString(),
                variableMeasured: "Position value (USD)",
              }
            : {}),
          creator: { "@type": "Organization", name: "U.S. SEC EDGAR" },
        },
        hasPart: {
          "@type": "ItemList",
          numberOfItems: data.positions.length,
          itemListElement: data.positions.slice(0, 20).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: p.ticker ? `${p.ticker} — ${p.name}` : p.name,
            ...(p.value
              ? { description: `${money(p.value)} · ${p.changeType}` }
              : {}),
          })),
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <InvestorDetail slug={slug} />
    </>
  );
}

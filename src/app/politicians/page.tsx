import type { Metadata } from "next";
import { PoliticianSection } from "~/components/features/politician-section";

export const revalidate = 3600;

const BASE_URL = "https://www.thestockie.com";

export const metadata: Metadata = {
  title: "Politician Trading Tracker — Congress Stock Disclosures | The Stockie",
  description:
    "Track stock trades by US Senators and Representatives. See which stocks politicians are buying and selling, sourced from public STOCK Act disclosures via FMP Congressional Trading APIs.",
  alternates: { canonical: `${BASE_URL}/politicians` },
  keywords: [
    "politician stock trading",
    "congressional trading tracker",
    "STOCK Act disclosures",
    "senator stock trades",
    "house representative trades",
    "congress stock tracker",
    "politician buys sells stocks",
  ].join(", "),
};

export default function PoliticiansPage() {
  return (
    <div className="min-h-screen bg-background pb-20 text-foreground">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Politician Trading</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track which stocks US Senators and Representatives are buying and selling.
            Data sourced from public STOCK Act disclosures via FMP.
          </p>
        </header>

        <PoliticianSection />
      </div>
    </div>
  );
}
"use client";

import { Landmark } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { api } from "~/trpc/react";
import { PoliticianConsensus, type PoliticianConsensus as ConsensusType } from "./politician-consensus";

/**
 * Politician Trading section — displayed on the /influencers page below
 * the Super Investors section. Shows which stocks are being most bought
 * and most sold by US Senators and House Representatives, sourced from
 * FMP's Congressional trading APIs (STOCK Act disclosures).
 *
 * Data is fetched client-side via tRPC (direct FMP API call, no Convex).
 */
export function PoliticianSection() {
  const { data, isLoading, isError } = api.politician.consensus.useQuery(
    { limit: 12, pages: 5 },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 15, // 15 min cache
    },
  );

  const hasData =
    data && (data.bought.length > 0 || data.sold.length > 0);

  return (
    <section
      id="politician-trading"
      className="mt-12 border-t border-border pt-8"
      aria-labelledby="politician-trading-heading"
    >
      <div className="mb-1 flex items-center gap-2">
        <Landmark className="h-5 w-5 shrink-0 text-warning sm:h-6 sm:w-6" />
        <h2 id="politician-trading-heading" className="text-xl font-bold sm:text-2xl">
          Politician Trading
        </h2>
      </div>
      <p className="mb-4 max-w-3xl text-xs text-muted-foreground sm:text-sm">
        Which stocks are US Senators and Representatives buying and selling? Data sourced
        from public STOCK Act disclosures via FMP&apos;s Congressional Trading APIs.
        <span className="text-muted-foreground">
          {" "}Disclosures lag 30–45 days by law, so transaction dates reflect past activity.
        </span>
      </p>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-2 p-4 pt-4 sm:p-6 sm:pt-4">
                <div className="h-4 w-28 animate-pulse rounded bg-foreground/10 sm:w-32" />
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-2 sm:gap-3 sm:px-3">
                    <div className="h-3 w-3 animate-pulse rounded bg-foreground/10" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-16 animate-pulse rounded bg-foreground/10 sm:w-20" />
                      <div className="h-2 w-24 animate-pulse rounded bg-foreground/10 sm:w-32" />
                    </div>
                    <div className="h-3 w-10 animate-pulse rounded bg-foreground/10" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="p-4 pt-4 text-center text-sm text-muted-foreground sm:p-6 sm:pt-6">
            Unable to load politician trading data right now.
          </CardContent>
        </Card>
      ) : !hasData ? (
        <Card>
          <CardContent className="p-4 pt-4 text-center text-sm text-muted-foreground sm:p-6 sm:pt-6">
            No politician trading data available right now.
          </CardContent>
        </Card>
      ) : (
        <PoliticianConsensus consensus={data as ConsensusType} />
      )}
    </section>
  );
}
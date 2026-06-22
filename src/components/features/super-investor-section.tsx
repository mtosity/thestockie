"use client";

import { Landmark } from "lucide-react";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent } from "~/components/ui/card";
import { InvestorMoves } from "./super-investor-moves";
import { InvestorConsensus } from "./super-investor-consensus";
import { InvestorRoster } from "./super-investor-roster";

function periodLabel(p: string | null): string {
  if (!p) return "";
  const [y, q] = p.split("-");
  return `${q} ${y}`;
}

export function SuperInvestorsSection() {
  const consensusQ = api.superInvestor.consensus.useQuery({ limit: 12 });
  const movesQ = api.superInvestor.notableMoves.useQuery({ limit: 8 });
  const investorsQ = api.superInvestor.investors.useQuery();

  const loading = consensusQ.isLoading || movesQ.isLoading || investorsQ.isLoading;
  const period = consensusQ.data?.period ?? movesQ.data?.period ?? null;
  const hasData = (investorsQ.data?.length ?? 0) > 0;

  return (
    <section className="mt-12 border-t border-border pt-8">
      <div className="mb-1 flex items-center gap-2">
        <Landmark className="h-6 w-6 text-warning" />
        <h2 className="text-2xl font-bold">Super Investors</h2>
        {period && (
          <span className="rounded-md bg-foreground/5 px-2 py-0.5 text-xs text-muted-foreground">
            13F · {periodLabel(period)}
          </span>
        )}
      </div>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        How legendary fund managers moved their books, from quarterly SEC 13F filings.{" "}
        <span className="text-muted-foreground">
          13F covers long US positions only and lags ~45 days, so a sale means trimmed or
          exited — not short.
        </span>
      </p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full rounded-xl bg-foreground/5" />
          <Skeleton className="h-56 w-full rounded-xl bg-foreground/5" />
        </div>
      ) : !hasData ? (
        <Card className="strategy-card text-card-foreground">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No 13F data yet — run the superinvestor-job.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {movesQ.data && <InvestorMoves moves={movesQ.data} />}
          {consensusQ.data && <InvestorConsensus consensus={consensusQ.data} />}
          {investorsQ.data && <InvestorRoster investors={investorsQ.data} />}
        </div>
      )}
    </section>
  );
}

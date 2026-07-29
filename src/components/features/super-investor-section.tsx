"use client";

import { Landmark } from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";
import { Card, CardContent } from "~/components/ui/card";
import { InvestorMoves } from "./super-investor-moves";
import { InvestorConsensus } from "./super-investor-consensus";
import { InvestorRoster } from "./super-investor-roster";

type Consensus = RouterOutputs["superInvestor"]["consensus"];
type Moves = RouterOutputs["superInvestor"]["notableMoves"];
type Investors = RouterOutputs["superInvestor"]["investors"];

function periodLabel(p: string | null): string {
  if (!p) return "";
  const [y, q] = p.split("-");
  return `${q} ${y}`;
}

/**
 * Data is fetched on the server and handed down as props so the whole section
 * lands in the initial HTML — AI crawlers never execute the client bundle.
 */
export function SuperInvestorsSection({
  consensus,
  moves,
  investors,
}: {
  consensus: Consensus | null;
  moves: Moves | null;
  investors: Investors;
}) {
  const period = consensus?.period ?? moves?.period ?? null;
  const hasData = investors.length > 0;

  return (
    <section
      id="super-investors"
      className="mt-12 border-t border-border pt-8"
      aria-labelledby="super-investors-heading"
    >
      <div className="mb-1 flex items-center gap-2">
        <Landmark className="h-6 w-6 text-warning" />
        <h2 id="super-investors-heading" className="text-2xl font-bold">
          Super Investors
        </h2>
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

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No 13F data yet — run the superinvestor-job.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {moves && <InvestorMoves moves={moves} />}
          {consensus && <InvestorConsensus consensus={consensus} />}
          <InvestorRoster investors={investors} />
        </div>
      )}
    </section>
  );
}

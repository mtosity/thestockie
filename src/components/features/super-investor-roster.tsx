"use client";

import Link from "next/link";
import { type RouterOutputs } from "~/trpc/react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { formatMoney } from "./super-investor-shared";

type Investor = RouterOutputs["superInvestor"]["investors"][number];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function InvestorCard({ inv }: { inv: Investor }) {
  const moves = inv.moves ?? { new: 0, added: 0, reduced: 0, sold: 0 };

  return (
    <Link
      href={`/investors/${inv.slug}`}
      className="group block rounded-lg border border-border bg-black/20 p-3 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          {inv.avatar && <AvatarImage src={inv.avatar} alt={inv.name} />}
          <AvatarFallback className="bg-primary/20 text-xs text-foreground">
            {initials(inv.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-foreground group-hover:underline">{inv.name}</div>
          <div className="truncate text-xs text-muted-foreground">{inv.firm}</div>
        </div>
        {inv.totalValue != null && (
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            {formatMoney(inv.totalValue)}
            <div className="text-gray-600">{inv.holdingsCount} pos</div>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
        {moves.new > 0 && <span className="text-emerald-400">{moves.new} new</span>}
        {moves.added > 0 && <span className="text-emerald-300">{moves.added} added</span>}
        {moves.reduced > 0 && <span className="text-amber-300">{moves.reduced} trimmed</span>}
        {moves.sold > 0 && <span className="text-rose-400">{moves.sold} exited</span>}
        {inv.period === null && <span className="text-gray-600">no filing yet</span>}
      </div>
    </Link>
  );
}

export function InvestorRoster({ investors }: { investors: Investor[] }) {
  return (
    <Card className="border-border bg-foreground/5 text-foreground">
      <CardHeader className="pb-3">
        <h3 className="text-sm font-semibold">Tracked investors ({(investors?.length ?? 0)})</h3>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {investors.map((inv) => (
          <InvestorCard key={inv._id} inv={inv} />
        ))}
      </CardContent>
    </Card>
  );
}

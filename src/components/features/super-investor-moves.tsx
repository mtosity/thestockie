"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Sparkles, DoorOpen } from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { formatMoney } from "./super-investor-shared";

type Moves = RouterOutputs["superInvestor"]["notableMoves"];
type Move = Moves["newBuys"][number];

function MoveRow({ m, kind }: { m: Move; kind: "buy" | "sell" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-black/20 px-3 py-2 text-sm">
      <div className="min-w-0">
        <Link
          href={`/investors/${m.slug}`}
          className="text-xs text-primary hover:underline"
        >
          {m.investor}
        </Link>
        <div className="flex items-center gap-2">
          {m.ticker ? (
            <Link
              href={`/?symbol=${m.ticker}`}
              className="font-semibold text-foreground hover:underline"
            >
              {m.ticker}
            </Link>
          ) : (
            <span className="font-medium text-muted-foreground">—</span>
          )}
          <span className="truncate text-xs text-muted-foreground">{m.name}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={kind === "buy" ? "text-emerald-400" : "text-rose-400"}>
          {formatMoney(m.value)}
        </div>
        {kind === "buy" && m.pctPortfolio > 0 && (
          <div className="text-[11px] text-muted-foreground">
            {Math.round(m.pctPortfolio)}% of book
          </div>
        )}
        {kind === "sell" && (
          <div className="text-[11px] text-muted-foreground">exited</div>
        )}
      </div>
    </div>
  );
}

function MoveCard({
  title,
  icon,
  accent,
  rows,
  empty,
  kind,
}: {
  title: string;
  icon: ReactNode;
  accent: string;
  rows?: Move[];
  empty: string;
  kind: "buy" | "sell";
}) {
  return (
    <Card className="border-border bg-foreground/5 text-foreground">
      <CardHeader className="space-y-0 pb-3">
        <div
          className={`flex items-center gap-2 text-sm font-semibold ${accent}`}
        >
          {icon} {title}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {(rows?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          (rows ?? []).map((m, i) => (
            <MoveRow
              key={`${m.slug}-${m.ticker ?? m.name}-${i}`}
              m={m}
              kind={kind}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function InvestorMoves({ moves }: { moves: Moves }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MoveCard
        title="Biggest new buys"
        icon={<Sparkles className="h-4 w-4" />}
        accent="text-emerald-400"
        rows={moves.newBuys}
        empty="No new positions this quarter."
        kind="buy"
      />
      <MoveCard
        title="Full exits"
        icon={<DoorOpen className="h-4 w-4" />}
        accent="text-rose-400"
        rows={moves.exits}
        empty="No full exits this quarter."
        kind="sell"
      />
    </div>
  );
}

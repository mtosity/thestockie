"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  MoveBadge,
  moveColor,
  formatMoney,
  formatPct,
} from "~/components/features/super-investor-shared";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function periodLabel(p: string | null): string {
  if (!p) return "—";
  const [y, q] = p.split("-");
  return `${q} ${y}`;
}

export function InvestorDetail({ slug }: { slug: string }) {
  const { data, isLoading } = api.superInvestor.bySlug.useQuery(
    { slug },
    { enabled: !!slug },
  );

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <Link
          href="/influencers"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Influencer Radar
        </Link>

        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl bg-foreground/5" />
        ) : !data ? (
          <p className="py-16 text-center text-muted-foreground">Investor not found.</p>
        ) : (
          <>
            <Card className="mb-4 border-border bg-foreground/5 text-foreground">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <Avatar className="h-14 w-14 shrink-0">
                  {data.investor.avatar && (
                    <AvatarImage src={data.investor.avatar} alt={data.investor.name} />
                  )}
                  <AvatarFallback className="bg-primary/20 text-foreground">
                    {initials(data.investor.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold">{data.investor.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {data.investor.firm}
                    {data.investor.style ? ` · ${data.investor.style}` : ""}
                  </p>
                  {data.investor.why && (
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{data.investor.why}</p>
                  )}
                </div>
                {data.filing && (
                  <div className="shrink-0 text-right text-sm">
                    <div className="font-semibold">{formatMoney(data.filing.totalValue)}</div>
                    <div className="text-xs text-muted-foreground">{data.filing.holdingsCount} holdings</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {periodLabel(data.period)} · filed{" "}
                      {new Date(data.filing.filingDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardHeader>
            </Card>

            <Card className="border-border bg-foreground/5 text-foreground">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold">Holdings &amp; moves</h2>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Ticker</TableHead>
                      <TableHead className="text-muted-foreground">Company</TableHead>
                      <TableHead className="text-muted-foreground">Move</TableHead>
                      <TableHead className="text-right text-muted-foreground">% Book</TableHead>
                      <TableHead className="text-right text-muted-foreground">Value</TableHead>
                      <TableHead className="text-right text-muted-foreground">Δ Shares</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.positions.map((p, i) => (
                      <TableRow key={`${p.ticker ?? p.name}-${i}`} className="border-border">
                        <TableCell className="font-semibold">
                          {p.ticker ? (
                            <Link href={`/?symbol=${p.ticker}`} className="text-foreground hover:underline">
                              {p.ticker}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">
                          {p.name}
                          {p.isOption && <span className="ml-1 text-[10px] text-warning">OPT</span>}
                        </TableCell>
                        <TableCell>
                          <MoveBadge type={p.changeType} />
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {p.changeType === "sold" ? "—" : `${p.pctPortfolio.toFixed(1)}%`}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {p.changeType === "sold" ? "exited" : formatMoney(p.value)}
                        </TableCell>
                        <TableCell className={`text-right ${moveColor(p.changeType)}`}>
                          {p.changeType === "new"
                            ? "new"
                            : p.changeType === "sold"
                              ? "−100%"
                              : formatPct(p.changePct)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
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

export default function InvestorDetailPage() {
  const params = useParams();
  const slug = String(params?.slug ?? "");
  const { data, isLoading } = api.superInvestor.bySlug.useQuery(
    { slug },
    { enabled: !!slug },
  );

  return (
    <div className="min-h-screen bg-[#15162c] pb-20 text-white">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <Link
          href="/influencers"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Influencer Radar
        </Link>

        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-xl bg-white/5" />
        ) : !data ? (
          <p className="py-16 text-center text-gray-400">Investor not found.</p>
        ) : (
          <>
            <Card className="mb-4 border-white/10 bg-white/5 text-white">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <Avatar className="h-14 w-14 shrink-0">
                  {data.investor.avatar && (
                    <AvatarImage src={data.investor.avatar} alt={data.investor.name} />
                  )}
                  <AvatarFallback className="bg-purple-500/20 text-purple-200">
                    {initials(data.investor.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold">{data.investor.name}</h1>
                  <p className="text-sm text-gray-400">
                    {data.investor.firm}
                    {data.investor.style ? ` · ${data.investor.style}` : ""}
                  </p>
                  {data.investor.why && (
                    <p className="mt-2 max-w-2xl text-sm text-gray-300">{data.investor.why}</p>
                  )}
                </div>
                {data.filing && (
                  <div className="shrink-0 text-right text-sm">
                    <div className="font-semibold">{formatMoney(data.filing.totalValue)}</div>
                    <div className="text-xs text-gray-400">{data.filing.holdingsCount} holdings</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {periodLabel(data.period)} · filed{" "}
                      {new Date(data.filing.filingDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardHeader>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold">Holdings &amp; moves</h2>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-gray-400">Ticker</TableHead>
                      <TableHead className="text-gray-400">Company</TableHead>
                      <TableHead className="text-gray-400">Move</TableHead>
                      <TableHead className="text-right text-gray-400">% Book</TableHead>
                      <TableHead className="text-right text-gray-400">Value</TableHead>
                      <TableHead className="text-right text-gray-400">Δ Shares</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.positions.map((p, i) => (
                      <TableRow key={`${p.ticker ?? p.name}-${i}`} className="border-white/5">
                        <TableCell className="font-semibold">
                          {p.ticker ? (
                            <Link href={`/?symbol=${p.ticker}`} className="text-white hover:underline">
                              {p.ticker}
                            </Link>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-gray-300">
                          {p.name}
                          {p.isOption && <span className="ml-1 text-[10px] text-amber-400">OPT</span>}
                        </TableCell>
                        <TableCell>
                          <MoveBadge type={p.changeType} />
                        </TableCell>
                        <TableCell className="text-right text-gray-300">
                          {p.changeType === "sold" ? "—" : `${p.pctPortfolio.toFixed(1)}%`}
                        </TableCell>
                        <TableCell className="text-right text-gray-300">
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

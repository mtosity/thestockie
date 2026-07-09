"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Youtube } from "lucide-react";
import { api, type RouterOutputs } from "~/trpc/react";
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
  Pill,
  StanceBadge,
  SentimentBadge,
  formatRelative,
} from "~/components/features/influencer-shared";

const ACTION_STYLES: Record<string, string> = {
  buy: "bg-positive-surface text-positive ring-positive/30",
  add: "bg-positive-surface text-positive ring-positive/30",
  hold: "bg-slate-500/15 text-muted-foreground ring-slate-500/30",
  watch: "bg-slate-500/15 text-muted-foreground ring-slate-500/30",
  trim: "bg-warning-surface text-warning ring-warning/30",
  sell: "bg-negative-surface text-negative ring-negative/30",
};

function ActionBadge({ action }: { action: string }) {
  return (
    <Pill className={ACTION_STYLES[action] ?? ACTION_STYLES.hold!}>
      {action}
    </Pill>
  );
}

function ConvictionDots({ conviction }: { conviction: string }) {
  const n = conviction === "high" ? 3 : conviction === "medium" ? 2 : 1;
  return (
    <span
      className="text-xs text-muted-foreground"
      title={`${conviction} conviction`}
    >
      {"●".repeat(n)}
      <span className="opacity-30">{"●".repeat(3 - n)}</span>
    </span>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTarget(t: string | number | null): string | null {
  if (t === null || t === undefined || t === "") return null;
  const n = typeof t === "number" ? t : Number(t);
  if (Number.isFinite(n) && n > 0) return `$${n.toLocaleString()}`;
  return String(t);
}

function SymbolLink({ symbol }: { symbol: string }) {
  return (
    <Link
      href={`/?symbol=${symbol}`}
      className="font-semibold text-foreground hover:underline"
    >
      {symbol}
    </Link>
  );
}

type Summary = NonNullable<RouterOutputs["influencer"]["summary"]>;

function TakeCard({ take }: { take: Summary["takes"][number] }) {
  const target = formatTarget(take.priceTarget);
  return (
    <div className="rounded-md border border-border bg-foreground/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <SymbolLink symbol={take.symbol} />
        <StanceBadge stance={take.stance} />
        {take.action && <ActionBadge action={take.action} />}
        <ConvictionDots conviction={take.conviction} />
        <span className="ml-auto text-xs text-muted-foreground">
          {take.mentionCount > 1 ? `${take.mentionCount}× · ` : ""}
          {formatRelative(take.lastDate)}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{take.thesis}</p>
      {target && (
        <p className="mt-1 text-xs text-muted-foreground">
          Price target: <span className="text-foreground">{target}</span>
        </p>
      )}
    </div>
  );
}

const BUYS_PREVIEW = 15;

export function InfluencerDetail({ channelId }: { channelId: string }) {
  const [showAllBuys, setShowAllBuys] = useState(false);
  const { data, isLoading } = api.influencer.summary.useQuery(
    { channelId },
    { enabled: !!channelId },
  );
  const visibleBuys = showAllBuys
    ? (data?.buys ?? [])
    : (data?.buys ?? []).slice(0, BUYS_PREVIEW);

  const bullish = data?.takes.filter((t) => t.stance === "bullish") ?? [];
  const bearish = data?.takes.filter((t) => t.stance === "bearish") ?? [];
  const neutral = data?.takes.filter((t) => t.stance === "neutral") ?? [];
  const latestMacro = data?.marketView[0];

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
          <p className="py-16 text-center text-muted-foreground">
            Creator not found.
          </p>
        ) : (
          <>
            {/* ── Header ─────────────────────────────────── */}
            <Card className="mb-4 border-border bg-foreground/5 text-foreground">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <Avatar className="h-14 w-14 shrink-0">
                  {data.influencer.avatar && (
                    <AvatarImage
                      src={data.influencer.avatar}
                      alt={data.influencer.name}
                    />
                  )}
                  <AvatarFallback className="bg-primary/20 text-foreground">
                    {initials(data.influencer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold">{data.influencer.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {data.influencer.handle ?? ""}
                  </p>
                  <a
                    href={
                      data.influencer.handle
                        ? `https://www.youtube.com/${data.influencer.handle}`
                        : `https://www.youtube.com/channel/${data.influencer.channelId}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Youtube className="h-3.5 w-3.5 text-negative" /> Open
                    channel
                  </a>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <div className="font-semibold">
                    {data.stats.videoCount} videos analyzed
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {data.stats.symbolsCovered} stocks covered
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    last video {formatRelative(data.stats.lastPublishedAt)}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* ── Market view ────────────────────────────── */}
            <Card className="mb-4 border-border bg-foreground/5 text-foreground">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold">🌍 Market view</h2>
              </CardHeader>
              <CardContent>
                {!latestMacro ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No market commentary captured yet.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {latestMacro.sentiment && (
                        <SentimentBadge label={latestMacro.sentiment} />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatRelative(latestMacro.date)} ·{" "}
                        {latestMacro.videoTitle}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">
                      {latestMacro.macroSummary}
                    </p>
                    {(latestMacro.sectorViews.length > 0 ||
                      latestMacro.rotations.length > 0) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {latestMacro.sectorViews.map((s, i) => (
                          <Pill
                            key={`sv-${i}`}
                            className="bg-slate-500/15 normal-case tracking-normal text-muted-foreground ring-slate-500/30"
                          >
                            {s}
                          </Pill>
                        ))}
                        {latestMacro.rotations.map((r, i) => (
                          <Pill
                            key={`rot-${i}`}
                            className="bg-warning-surface normal-case tracking-normal text-warning ring-warning/30"
                          >
                            ⇄ {r}
                          </Pill>
                        ))}
                      </div>
                    )}
                    {data.marketView.length > 1 && (
                      <div className="mt-4 space-y-2 border-t border-border pt-3">
                        {data.marketView.slice(1).map((m) => (
                          <div key={m.videoId} className="text-xs">
                            <span className="text-muted-foreground">
                              {formatRelative(m.date)} —{" "}
                            </span>
                            <span className="text-muted-foreground/90">
                              {m.macroSummary}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Bought / added ─────────────────────────── */}
            <Card className="mb-4 border-border bg-foreground/5 text-foreground">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold">
                  💰 Bought / added ({data.buys.length})
                </h2>
              </CardHeader>
              <CardContent>
                {data.buys.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No buy/add calls in recent videos.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">
                          Ticker
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Action
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Why
                        </TableHead>
                        <TableHead className="text-right text-muted-foreground">
                          Target
                        </TableHead>
                        <TableHead className="text-right text-muted-foreground">
                          When
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleBuys.map((b, i) => (
                        <TableRow
                          key={`${b.videoId}-${b.symbol}-${i}`}
                          className="border-border"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <SymbolLink symbol={b.symbol} />
                              <ConvictionDots conviction={b.conviction} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <ActionBadge action={b.action ?? "buy"} />
                          </TableCell>
                          <TableCell className="max-w-[380px] text-sm text-muted-foreground">
                            {b.thesis}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatTarget(b.priceTarget) ?? "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                            {formatRelative(b.date)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {data.buys.length > BUYS_PREVIEW && (
                  <button
                    onClick={() => setShowAllBuys((s) => !s)}
                    className="mt-2 w-full rounded-md border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {showAllBuys
                      ? "Show fewer"
                      : `Show all ${data.buys.length} buy/add calls`}
                  </button>
                )}
              </CardContent>
            </Card>

            {/* ── Stock takes ────────────────────────────── */}
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <Card className="border-border bg-foreground/5 text-foreground">
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-semibold text-positive">
                    🐂 Bullish on ({bullish.length})
                  </h2>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bullish.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No bullish takes.
                    </p>
                  ) : (
                    bullish.map((t) => <TakeCard key={t.symbol} take={t} />)
                  )}
                </CardContent>
              </Card>
              <Card className="border-border bg-foreground/5 text-foreground">
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-semibold text-negative">
                    🐻 Bearish on ({bearish.length})
                  </h2>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bearish.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No bearish takes.
                    </p>
                  ) : (
                    bearish.map((t) => <TakeCard key={t.symbol} take={t} />)
                  )}
                </CardContent>
              </Card>
            </div>

            {neutral.length > 0 && (
              <Card className="mb-4 border-border bg-foreground/5 text-foreground">
                <CardHeader className="pb-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    😐 Neutral / watching ({neutral.length})
                  </h2>
                </CardHeader>
                <CardContent className="grid gap-2 md:grid-cols-2">
                  {neutral.map((t) => (
                    <TakeCard key={t.symbol} take={t} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ── Recent videos ──────────────────────────── */}
            <Card className="border-border bg-foreground/5 text-foreground">
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold">
                  🎬 Recent videos analyzed
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.videos.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No analyzed videos yet.
                  </p>
                ) : (
                  data.videos.map((vid) => (
                    <div key={vid.videoId}>
                      <div className="flex items-baseline gap-2">
                        <a
                          href={`https://www.youtube.com/watch?v=${vid.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline"
                        >
                          {vid.title}
                        </a>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatRelative(vid.publishedAt)}
                        </span>
                      </div>
                      {vid.summary && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {vid.summary}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Based on AI analysis of this creator&apos;s recent videos. Theses
              are paraphrases of the creator&apos;s own words, not verbatim
              quotes. Not financial advice.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

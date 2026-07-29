import "server-only";
import { cache } from "react";
import { convex } from "~/server/api/trpc";
import { api } from "../../../convex/_generated/api";

/**
 * Server-side loader for /influencers.
 *
 * The page used to fetch everything client-side through tRPC, which meant the
 * HTML crawlers receive contained nothing but headings — AI crawlers (GPTBot,
 * ClaudeBot, PerplexityBot) never run JavaScript, so the entire feature was
 * invisible to answer engines and only reachable by Googlebot's deferred
 * render pass. Loading here puts the data in the first byte instead.
 *
 * `cache()` dedupes the Convex round-trips between the layout (JSON-LD) and
 * the page (markup) within a single request.
 */
export const getInfluencerPageData = cache(async () => {
  const [digest, sentiment, influencers, videos, run] = await Promise.all([
    convex.query(api.influencerReads.latestDigest, {}).catch(() => null),
    convex
      .query(api.influencerReads.sentimentRanking, { limit: 12 })
      .catch(() => null),
    convex.query(api.influencerReads.influencers, {}).catch(() => []),
    convex
      .query(api.influencerReads.recentVideos, { limit: 12 })
      .catch(() => []),
    convex.query(api.influencerReads.latestRun, {}).catch(() => null),
  ]);

  return { digest, sentiment, influencers, videos, run };
});

export const getSuperInvestorPageData = cache(async () => {
  const [consensus, moves, investors] = await Promise.all([
    convex
      .query(api.superInvestorReads.consensus, { limit: 12 })
      .catch(() => null),
    convex
      .query(api.superInvestorReads.notableMoves, { limit: 8 })
      .catch(() => null),
    convex.query(api.superInvestorReads.investors, {}).catch(() => []),
  ]);

  return { consensus, moves, investors };
});

/** Most recent signal on the page, used for `dateModified` / "last updated". */
export function lastUpdatedAt(
  run: { runAt?: number | null; startedAt?: number | null } | null,
  videos: { publishedAt: number }[],
): number | null {
  const fromRun = run?.runAt ?? run?.startedAt ?? null;
  const fromVideos = videos.reduce((m, v) => Math.max(m, v.publishedAt), 0);
  return fromRun ?? (fromVideos || null);
}

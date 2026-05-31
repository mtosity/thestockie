import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Public read queries for the influencer feature, consumed by the Next.js app
 * via the `influencer` tRPC router. Writes live in `influencer.ts` (internal,
 * called by the Go job through `http.ts`).
 */

// Most recent daily macro digest (date is YYYY-MM-DD, so lexicographic = chronological).
export const latestDigest = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("macroDigest")
      .withIndex("by_date")
      .order("desc")
      .first();
  },
});

// Per-symbol sentiment ranking for the latest (or given) date.
export const sentimentRanking = query({
  args: { date: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { date, limit }) => {
    let theDate = date ?? null;
    if (!theDate) {
      const latest = await ctx.db
        .query("dailySentiment")
        .withIndex("by_date")
        .order("desc")
        .first();
      theDate = latest?.date ?? null;
    }
    if (!theDate) {
      return { date: null, total: 0, bullish: [], bearish: [] };
    }
    const rows = await ctx.db
      .query("dailySentiment")
      .withIndex("by_date_symbol", (q) => q.eq("date", theDate!))
      .collect();
    const sorted = [...rows].sort((a, b) => b.netScore - a.netScore);
    const n = limit ?? 12;
    return {
      date: theDate,
      total: rows.length,
      bullish: sorted.filter((r) => r.netScore > 0).slice(0, n),
      bearish: sorted.filter((r) => r.netScore < 0).reverse().slice(0, n),
    };
  },
});

// Active influencers with a little activity context, most-recently-active first.
export const influencers = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db
      .query("influencers")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    const out = [];
    for (const inf of list) {
      const vids = await ctx.db
        .query("influencerVideos")
        .withIndex("by_influencer", (q) => q.eq("influencerId", inf._id))
        .collect();
      const lastPublishedAt = vids.reduce((m, v) => Math.max(m, v.publishedAt), 0);
      out.push({
        _id: inf._id,
        name: inf.name,
        handle: inf.handle ?? null,
        avatar: inf.avatar ?? null,
        youtubeUrl: inf.youtubeUrl ?? null,
        channelId: inf.channelId,
        videoCount: vids.filter((v) => v.status === "done").length,
        lastPublishedAt: lastPublishedAt || null,
      });
    }
    out.sort((a, b) => (b.lastPublishedAt ?? 0) - (a.lastPublishedAt ?? 0));
    return out;
  },
});

// Recently analyzed videos with their influencer + extracted symbols.
export const recentVideos = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const vids = await ctx.db
      .query("influencerVideos")
      .withIndex("by_publishedAt")
      .order("desc")
      .take(limit ?? 24);

    const out = [];
    for (const meta of vids) {
      if (meta.status !== "done") continue;
      const inf = await ctx.db.get(meta.influencerId);
      const mentions = await ctx.db
        .query("videoStockMentions")
        .withIndex("by_video", (q) => q.eq("videoId", meta.videoId))
        .collect();
      out.push({
        videoId: meta.videoId,
        title: meta.title,
        url: meta.url,
        publishedAt: meta.publishedAt,
        influencerName: inf?.name ?? "Unknown",
        influencerAvatar: inf?.avatar ?? null,
        summary: meta.summary ?? null,
        mentions: mentions.map((m) => ({
          symbol: m.symbol,
          stance: m.stance,
          action: m.action ?? null,
        })),
      });
    }
    return out;
  },
});

// Last job execution, for a "last updated" indicator.
export const latestRun = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("jobRuns")
      .withIndex("by_runAt")
      .order("desc")
      .first();
  },
});

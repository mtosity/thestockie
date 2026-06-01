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
    // Rank purely by how many distinct creators hold the stance (not a
    // conviction-weighted score, so hyperbole can't inflate it). Show every
    // stock with a real consensus (>2 creators); if that's fewer than the
    // target, fill with lighter (1–2 creator) names. Tie-break by total reach.
    const n = limit ?? 12;
    const pick = (countOf: (r: (typeof rows)[number]) => number) => {
      const ranked = rows
        .filter((r) => countOf(r) > 0)
        .sort((a, b) => countOf(b) - countOf(a) || b.mentionsCount - a.mentionsCount);
      const strong = ranked.filter((r) => countOf(r) > 2);
      return strong.length >= n ? strong : ranked.slice(0, n);
    };
    return {
      date: theDate,
      total: rows.length,
      bullish: pick((r) => r.bullishCount),
      bearish: pick((r) => r.bearishCount),
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

// All discovered videos for a channel, with processing status — used to audit
// which expected videos are missing/failed.
export const videosByChannel = query({
  args: { channelId: v.string() },
  handler: async (ctx, { channelId }) => {
    const inf = await ctx.db
      .query("influencers")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .first();
    if (!inf) return { found: false, name: null, videos: [] };
    const vids = await ctx.db
      .query("influencerVideos")
      .withIndex("by_influencer", (q) => q.eq("influencerId", inf._id))
      .collect();
    vids.sort((a, b) => b.publishedAt - a.publishedAt);
    return {
      found: true,
      name: inf.name,
      videos: vids.map((v) => ({
        videoId: v.videoId,
        title: v.title,
        status: v.status,
        error: v.error ?? null,
        publishedAt: v.publishedAt,
      })),
    };
  },
});

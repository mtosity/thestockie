import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Public read queries for the thestockie.com/influencers page.
 * These are called directly from the frontend (not via HTTP).
 */

export const influencers = query({
  handler: async (ctx) => {
    const list = await ctx.db
      .query("influencers")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const out = [];
    for (const inf of list) {
      const videos = await ctx.db
        .query("influencerVideos")
        .withIndex("by_channelId", (q) => q.eq("channelId", inf.channelId))
        .collect();
      // "videos analyzed" = transcribed + sentiment-extracted (status done)
      const videoCount = videos.filter((v) => v.status === "done").length;
      const lastPublishedAt =
        videos.reduce((m, v) => Math.max(m, v.publishedAt), 0) || null;
      out.push({ ...inf, videoCount, lastPublishedAt });
    }
    out.sort(
      (a, b) =>
        b.videoCount - a.videoCount ||
        (b.lastPublishedAt ?? 0) - (a.lastPublishedAt ?? 0),
    );
    return out;
  },
});

export const allInfluencers = query({
  handler: async (ctx) => {
    return await ctx.db.query("influencers").collect();
  },
});

export const latestDigest = query({
  handler: async (ctx) => {
    const digests = await ctx.db.query("macroDigest").collect();
    if (digests.length === 0) return null;
    return digests.sort((a, b) => b.createdAt - a.createdAt)[0];
  },
});

export const sentimentRanking = query({
  args: {
    date: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sentiments = await ctx.db.query("dailySentiment").collect();
    
    // Filter by date if provided
    let filtered = sentiments;
    if (args.date) {
      filtered = sentiments.filter((s) => s.date === args.date);
    }
    
    const bullish = filtered
      .filter((s) => s.consensus === "strong_bullish" || s.consensus === "bullish")
      .sort((a, b) => (b.bullishCount ?? 0) - (a.bullishCount ?? 0));
    const bearish = filtered
      .filter((s) => s.consensus === "strong_bearish" || s.consensus === "bearish")
      .sort((a, b) => (b.bearishCount ?? 0) - (a.bearishCount ?? 0));
    const mixed = filtered.filter((s) => s.consensus === "mixed");

    const result = {
      bullish: args.limit ? bullish.slice(0, args.limit) : bullish,
      bearish: args.limit ? bearish.slice(0, args.limit) : bearish,
      mixed: args.limit ? mixed.slice(0, args.limit) : mixed,
    };
    return result;
  },
});

export const recentVideos = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("influencerVideos")
      .withIndex("by_publishedAt")
      .collect();
    const videos = all
      .filter((v) => v.status === "done")
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, args.limit ?? 20);

    // channelId -> creator name
    const creators = await ctx.db.query("influencers").collect();
    const nameByChannel = new Map(creators.map((c) => [c.channelId, c.name]));

    // stance ordering so the chips group green → red → grey
    const stanceRank: Record<string, number> = { bullish: 0, bearish: 1, neutral: 2 };

    return Promise.all(
      videos.map(async (v) => {
        const rows = await ctx.db
          .query("videoStockMentions")
          .withIndex("by_videoId", (q) => q.eq("videoId", v.videoId))
          .collect();
        // one chip per symbol (keep the highest-conviction row)
        const bySymbol = new Map<string, (typeof rows)[number]>();
        for (const r of rows) {
          const cur = bySymbol.get(r.symbol);
          if (!cur) bySymbol.set(r.symbol, r);
        }
        const mentions = [...bySymbol.values()]
          .map((r) => ({
            symbol: r.symbol,
            stance: r.stance,
            conviction: r.conviction,
            thesis: r.thesis,
          }))
          .sort(
            (a, b) =>
              (stanceRank[a.stance] ?? 3) - (stanceRank[b.stance] ?? 3) ||
              a.symbol.localeCompare(b.symbol),
          );
        return {
          ...v,
          influencerName: nameByChannel.get(v.channelId) ?? "Unknown",
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          mentions,
        };
      }),
    );
  },
});

export const videosByChannel = query({
  args: { channelId: v.string() },
  handler: async (ctx, { channelId }) => {
    const videos = await ctx.db
      .query("influencerVideos")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .collect();
    return videos.sort((a, b) => b.publishedAt - a.publishedAt);
  },
});

export const latestRun = query({
  handler: async (ctx) => {
    const runs = await ctx.db
      .query("jobRuns")
      .withIndex("by_startedAt")
      .collect();
    if (runs.length === 0) return null;
    return runs.sort((a, b) => b.startedAt - a.startedAt)[0];
  },
});

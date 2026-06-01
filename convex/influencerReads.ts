import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Public read queries for the thestockie.com/influencers page.
 * These are called directly from the frontend (not via HTTP).
 */

export const influencers = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("influencers")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
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
  handler: async (ctx) => {
    const sentiments = await ctx.db.query("dailySentiment").collect();
    const bullish = sentiments
      .filter((s) => s.consensus === "strong_bullish" || s.consensus === "bullish")
      .sort((a, b) => b.bullishCount - a.bullishCount);
    const bearish = sentiments
      .filter((s) => s.consensus === "strong_bearish" || s.consensus === "bearish")
      .sort((a, b) => b.bearishCount - a.bearishCount);
    const mixed = sentiments.filter((s) => s.consensus === "mixed");

    return { bullish, bearish, mixed };
  },
});

export const recentVideos = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const videos = await ctx.db
      .query("influencerVideos")
      .withIndex("by_publishedAt")
      .collect();
    return videos.sort((a, b) => b.publishedAt - a.publishedAt).slice(0, args.limit ?? 20);
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

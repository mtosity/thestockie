import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Internal queries & mutations for the influencer pipeline.
 *
 * These are called by the public httpAction endpoints in `http.ts`, which are
 * the surface the external `thestockie-influencer` Go job talks to. Keeping the
 * data logic here (and only auth + plumbing in http.ts) mirrors the existing
 * convention in `posts.ts`.
 */

// ── Shared validators ────────────────────────────────────────────────────────

const stanceV = v.union(
  v.literal("bullish"),
  v.literal("bearish"),
  v.literal("neutral")
);

const convictionV = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high")
);

const actionV = v.union(
  v.literal("buy"),
  v.literal("add"),
  v.literal("hold"),
  v.literal("trim"),
  v.literal("sell"),
  v.literal("watch")
);

const macroSentimentV = v.union(
  v.literal("risk_on"),
  v.literal("neutral"),
  v.literal("risk_off")
);

const mentionV = v.object({
  symbol: v.string(),
  companyName: v.optional(v.string()),
  stance: stanceV,
  conviction: v.optional(convictionV),
  thesis: v.string(),
  action: v.optional(actionV),
  priceTarget: v.optional(v.number()),
  timeframe: v.optional(v.string()),
});

const macroV = v.object({
  macroSummary: v.string(),
  sentiment: v.optional(macroSentimentV),
  sectorViews: v.array(
    v.object({
      sector: v.string(),
      stance: stanceV,
      note: v.optional(v.string()),
    })
  ),
  rotations: v.array(
    v.object({
      from: v.optional(v.string()),
      to: v.optional(v.string()),
      note: v.string(),
    })
  ),
});

// ── Influencers ──────────────────────────────────────────────────────────────

// Upsert an influencer by channelId (used to sync the job's config list).
export const upsertInfluencer = internalMutation({
  args: {
    name: v.string(),
    channelId: v.string(),
    handle: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    avatar: v.optional(v.string()),
    description: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("influencers")
      .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
      .first();

    const active = args.active ?? true;
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        handle: args.handle,
        youtubeUrl: args.youtubeUrl,
        avatar: args.avatar,
        description: args.description,
        active,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("influencers", {
      name: args.name,
      channelId: args.channelId,
      handle: args.handle,
      youtubeUrl: args.youtubeUrl,
      avatar: args.avatar,
      description: args.description,
      active,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// The job's scan list — all active influencers.
export const listActive = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("influencers")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return rows.map((i) => ({
      id: i._id,
      name: i.name,
      channelId: i.channelId,
      handle: i.handle,
    }));
  },
});

// ── Videos ───────────────────────────────────────────────────────────────────

// Upsert a discovered video. Idempotent on videoId — returns whether it's new
// so the job only spends transcription on unseen videos.
export const discoverVideo = internalMutation({
  args: {
    channelId: v.string(),
    videoId: v.string(),
    title: v.string(),
    url: v.string(),
    publishedAt: v.number(),
    durationSec: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const influencer = await ctx.db
      .query("influencers")
      .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
      .first();
    if (!influencer) {
      throw new Error(`No influencer for channelId ${args.channelId}`);
    }

    const existing = await ctx.db
      .query("influencerVideos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    if (existing) {
      return {
        id: existing._id,
        influencerId: influencer._id,
        isNew: false,
        status: existing.status,
      };
    }

    const now = Date.now();
    const id = await ctx.db.insert("influencerVideos", {
      influencerId: influencer._id,
      channelId: args.channelId,
      videoId: args.videoId,
      title: args.title,
      url: args.url,
      publishedAt: args.publishedAt,
      durationSec: args.durationSec,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return { id, influencerId: influencer._id, isNew: true, status: "pending" };
  },
});

export const setVideoStatus = internalMutation({
  args: {
    videoId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("transcribing"),
      v.literal("analyzing"),
      v.literal("done"),
      v.literal("error"),
      v.literal("skipped")
    ),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("influencerVideos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    if (!video) throw new Error(`Unknown videoId ${args.videoId}`);
    await ctx.db.patch(video._id, { status: args.status, updatedAt: Date.now() });
  },
});

export const markVideoError = internalMutation({
  args: { videoId: v.string(), error: v.string() },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("influencerVideos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    if (!video) throw new Error(`Unknown videoId ${args.videoId}`);
    await ctx.db.patch(video._id, {
      status: "error",
      error: args.error.slice(0, 2000),
      updatedAt: Date.now(),
    });
  },
});

// Store the full analysis for a video: transcript + summary + per-symbol
// mentions + macro note, and mark the video done. Idempotent: re-running a
// video replaces its prior mentions/macro notes.
export const saveVideoResult = internalMutation({
  args: {
    videoId: v.string(),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
    mentions: v.array(mentionV),
    macro: v.optional(macroV),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("influencerVideos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    if (!video) throw new Error(`Unknown videoId ${args.videoId}`);

    const now = Date.now();
    const { influencerId, publishedAt } = video;

    // Clear prior derived rows for idempotent re-runs.
    const oldMentions = await ctx.db
      .query("videoStockMentions")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    for (const m of oldMentions) await ctx.db.delete(m._id);
    const oldMacro = await ctx.db
      .query("macroNotes")
      .withIndex("by_video", (q) => q.eq("videoId", args.videoId))
      .collect();
    for (const m of oldMacro) await ctx.db.delete(m._id);

    for (const m of args.mentions) {
      await ctx.db.insert("videoStockMentions", {
        videoId: args.videoId,
        influencerId,
        symbol: m.symbol.toUpperCase().trim(),
        companyName: m.companyName,
        stance: m.stance,
        conviction: m.conviction,
        thesis: m.thesis,
        action: m.action,
        priceTarget: m.priceTarget,
        timeframe: m.timeframe,
        publishedAt,
        createdAt: now,
      });
    }

    if (args.macro) {
      await ctx.db.insert("macroNotes", {
        videoId: args.videoId,
        influencerId,
        macroSummary: args.macro.macroSummary,
        sentiment: args.macro.sentiment,
        sectorViews: args.macro.sectorViews,
        rotations: args.macro.rotations,
        publishedAt,
        createdAt: now,
      });
    }

    await ctx.db.patch(video._id, {
      transcript: args.transcript,
      summary: args.summary,
      status: "done",
      processedAt: now,
      error: undefined,
      updatedAt: now,
    });

    return { mentions: args.mentions.length, hasMacro: !!args.macro };
  },
});

// ── Aggregation ──────────────────────────────────────────────────────────────

type Consensus = Doc<"dailySentiment">["consensus"];

function convictionWeight(c?: "low" | "medium" | "high"): number {
  return c === "high" ? 3 : c === "low" ? 1 : 2;
}

function computeConsensus(bull: number, bear: number): Consensus {
  const total = bull + bear;
  if (total === 0) return "mixed";
  const ratio = (bull - bear) / total;
  if (ratio >= 0.6 && bull >= 2) return "strong_bullish";
  if (ratio <= -0.6 && bear >= 2) return "strong_bearish";
  if (ratio > 0.15) return "bullish";
  if (ratio < -0.15) return "bearish";
  return "mixed";
}

// Recompute per-symbol sentiment over a trailing window of mentions and store
// it under `date`. Returns the ranking + recent macro notes so the job can feed
// the LLM synthesis step in one round-trip.
export const aggregate = internalMutation({
  args: { date: v.string(), windowDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const windowDays = args.windowDays ?? 7;
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;

    const mentions = await ctx.db
      .query("videoStockMentions")
      .withIndex("by_publishedAt", (q) => q.gte("publishedAt", cutoff))
      .collect();

    type Agg = {
      symbol: string;
      companyName?: string;
      bull: number;
      bear: number;
      neutral: number;
      net: number;
      influencers: Set<string>;
      theses: { influencerId: Id<"influencers">; stance: string; thesis: string }[];
    };
    const bySymbol = new Map<string, Agg>();

    for (const m of mentions) {
      const key = m.symbol.toUpperCase();
      let a = bySymbol.get(key);
      if (!a) {
        a = {
          symbol: key,
          companyName: m.companyName,
          bull: 0,
          bear: 0,
          neutral: 0,
          net: 0,
          influencers: new Set(),
          theses: [],
        };
        bySymbol.set(key, a);
      }
      a.companyName ??= m.companyName;
      a.influencers.add(m.influencerId);
      const w = convictionWeight(m.conviction);
      if (m.stance === "bullish") {
        a.bull++;
        a.net += w;
      } else if (m.stance === "bearish") {
        a.bear++;
        a.net -= w;
      } else {
        a.neutral++;
      }
      // Keep up to 3 strongest theses (high conviction first).
      if (a.theses.length < 3 && m.thesis) {
        a.theses.push({
          influencerId: m.influencerId,
          stance: m.stance,
          thesis: m.thesis,
        });
      }
    }

    // Replace any existing rows for this date.
    const old = await ctx.db
      .query("dailySentiment")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
    for (const row of old) await ctx.db.delete(row._id);

    const now = Date.now();
    const ranking = [...bySymbol.values()].sort((a, b) => b.net - a.net);
    for (const a of ranking) {
      await ctx.db.insert("dailySentiment", {
        date: args.date,
        symbol: a.symbol,
        companyName: a.companyName,
        bullishCount: a.bull,
        bearishCount: a.bear,
        neutralCount: a.neutral,
        mentionsCount: a.bull + a.bear + a.neutral,
        netScore: a.net,
        consensus: computeConsensus(a.bull, a.bear),
        influencerIds: [...a.influencers] as Id<"influencers">[],
        topTheses: a.theses,
        windowDays,
        createdAt: now,
      });
    }

    // Recent macro notes for the synthesis step.
    const macroNotes = await ctx.db
      .query("macroNotes")
      .withIndex("by_publishedAt", (q) => q.gte("publishedAt", cutoff))
      .collect();

    const top = (arr: Agg[]) =>
      arr.slice(0, 12).map((a) => ({
        symbol: a.symbol,
        companyName: a.companyName ?? null,
        netScore: a.net,
        bullish: a.bull,
        bearish: a.bear,
        neutral: a.neutral,
        mentions: a.bull + a.bear + a.neutral,
        consensus: computeConsensus(a.bull, a.bear),
        theses: a.theses,
      }));

    // Split by sign so a symbol only appears in one column; bearish ordered
    // most-negative-first.
    const bullRanked = ranking.filter((a) => a.net > 0);
    const bearRanked = ranking.filter((a) => a.net < 0).sort((a, b) => a.net - b.net);

    return {
      date: args.date,
      windowDays,
      symbolCount: ranking.length,
      bullishLeaders: top(bullRanked),
      bearishLeaders: top(bearRanked),
      macroNotes: macroNotes.map((m) => ({
        influencerId: m.influencerId,
        macroSummary: m.macroSummary,
        sentiment: m.sentiment ?? null,
        sectorViews: m.sectorViews,
        rotations: m.rotations,
      })),
    };
  },
});

// Store (replace) the LLM-written daily macro digest for a date.
export const saveDigest = internalMutation({
  args: {
    date: v.string(),
    marketSentiment: v.string(),
    sentimentLabel: v.optional(macroSentimentV),
    keyThemes: v.array(v.string()),
    sectorRotation: v.array(
      v.object({
        from: v.optional(v.string()),
        to: v.optional(v.string()),
        rationale: v.string(),
      })
    ),
    bullishLeaders: v.array(
      v.object({
        symbol: v.string(),
        netScore: v.number(),
        mentions: v.number(),
      })
    ),
    bearishLeaders: v.array(
      v.object({
        symbol: v.string(),
        netScore: v.number(),
        mentions: v.number(),
      })
    ),
    recommendedActions: v.array(
      v.object({
        symbol: v.optional(v.string()),
        action: v.string(),
        rationale: v.string(),
      })
    ),
    videosAnalyzed: v.number(),
    influencersCount: v.number(),
    windowDays: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("macroDigest")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
    for (const row of existing) await ctx.db.delete(row._id);

    return await ctx.db.insert("macroDigest", {
      date: args.date,
      runAt: now,
      marketSentiment: args.marketSentiment,
      sentimentLabel: args.sentimentLabel,
      keyThemes: args.keyThemes,
      sectorRotation: args.sectorRotation,
      bullishLeaders: args.bullishLeaders,
      bearishLeaders: args.bearishLeaders,
      recommendedActions: args.recommendedActions,
      videosAnalyzed: args.videosAnalyzed,
      influencersCount: args.influencersCount,
      windowDays: args.windowDays,
      createdAt: now,
    });
  },
});

// ── Job run tracking ─────────────────────────────────────────────────────────

export const startRun = internalMutation({
  args: { mode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobRuns", {
      runAt: Date.now(),
      mode: args.mode,
      status: "running",
      videosDiscovered: 0,
      videosProcessed: 0,
      videosErrored: 0,
    });
  },
});

export const finishRun = internalMutation({
  args: {
    runId: v.id("jobRuns"),
    status: v.union(v.literal("success"), v.literal("error")),
    videosDiscovered: v.number(),
    videosProcessed: v.number(),
    videosErrored: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: args.status,
      videosDiscovered: args.videosDiscovered,
      videosProcessed: args.videosProcessed,
      videosErrored: args.videosErrored,
      error: args.error,
      finishedAt: Date.now(),
    });
  },
});

// ── Retention ────────────────────────────────────────────────────────────────

// Delete videos (and their mentions/macro notes) plus aggregates older than the
// retention window, so the dashboard only reflects recent creator views.
export const purgeOld = internalMutation({
  args: { olderThanDays: v.number() },
  handler: async (ctx, { olderThanDays }) => {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(cutoff).toISOString().slice(0, 10);
    let videos = 0,
      mentions = 0,
      macros = 0,
      sentiment = 0,
      digests = 0;

    const oldVideos = await ctx.db
      .query("influencerVideos")
      .withIndex("by_publishedAt", (q) => q.lt("publishedAt", cutoff))
      .collect();
    for (const vd of oldVideos) {
      const ms = await ctx.db
        .query("videoStockMentions")
        .withIndex("by_video", (q) => q.eq("videoId", vd.videoId))
        .collect();
      for (const m of ms) {
        await ctx.db.delete(m._id);
        mentions++;
      }
      const mn = await ctx.db
        .query("macroNotes")
        .withIndex("by_video", (q) => q.eq("videoId", vd.videoId))
        .collect();
      for (const m of mn) {
        await ctx.db.delete(m._id);
        macros++;
      }
      await ctx.db.delete(vd._id);
      videos++;
    }

    // Aggregates keyed by date.
    const oldDS = await ctx.db
      .query("dailySentiment")
      .withIndex("by_date", (q) => q.lt("date", cutoffDate))
      .collect();
    for (const r of oldDS) {
      await ctx.db.delete(r._id);
      sentiment++;
    }
    const oldMD = await ctx.db
      .query("macroDigest")
      .withIndex("by_date", (q) => q.lt("date", cutoffDate))
      .collect();
    for (const r of oldMD) {
      await ctx.db.delete(r._id);
      digests++;
    }

    return { videos, mentions, macros, sentiment, digests };
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Influencer sentiment tracking — mutations and queries.
 */

// ── Seed / manage influencers ───────────────────────────────────────────────

export const seedInfluencers = mutation({
  args: {
    influencers: v.array(
      v.object({
        name: v.string(),
        channelId: v.string(),
        handle: v.optional(v.string()),
        avatar: v.optional(v.string()),
        active: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, { influencers }) => {
    for (const inf of influencers) {
      const existing = await ctx.db
        .query("influencers")
        .withIndex("by_channelId", (q) => q.eq("channelId", inf.channelId))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          name: inf.name,
          handle: inf.handle,
          avatar: inf.avatar,
          active: inf.active ?? true,
        });
      } else {
        await ctx.db.insert("influencers", {
          name: inf.name,
          channelId: inf.channelId,
          handle: inf.handle,
          avatar: inf.avatar,
          active: inf.active ?? true,
        });
      }
    }
  },
});

export const getActiveInfluencers = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("influencers")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
  },
});

// ── Video discovery ─────────────────────────────────────────────────────────

export const discoverVideo = mutation({
  args: {
    channelId: v.string(),
    videoId: v.string(),
    title: v.string(),
    url: v.optional(v.string()),
    publishedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("influencerVideos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    if (existing) {
      return { id: existing._id, influencerId: existing.channelId, isNew: false, status: existing.status };
    }
    const id = await ctx.db.insert("influencerVideos", {
      videoId: args.videoId,
      channelId: args.channelId,
      title: args.title,
      status: "pending",
      publishedAt: args.publishedAt,
    });
    return { id, influencerId: args.channelId, isNew: true, status: "pending" };
  },
});

export const setVideoStatus = mutation({
  args: {
    videoId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("transcribing"),
      v.literal("analyzing"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("influencerVideos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    if (!video) throw new Error(`Video not found: ${args.videoId}`);
    await ctx.db.patch(video._id, { status: args.status as any });
  },
});

export const setVideoError = mutation({
  args: {
    videoId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("influencerVideos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    if (!video) throw new Error(`Video not found: ${args.videoId}`);
    await ctx.db.patch(video._id, { status: "failed", summary: args.error });
  },
});

// ── Save video result ───────────────────────────────────────────────────────

export const saveVideoResult = mutation({
  args: {
    videoId: v.string(),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
    mentions: v.optional(
      v.array(
        v.object({
          symbol: v.string(),
          companyName: v.optional(v.string()),
          stance: v.union(
            v.literal("bullish"),
            v.literal("bearish"),
            v.literal("neutral")
          ),
          conviction: v.union(
            v.literal("high"),
            v.literal("medium"),
            v.literal("low")
          ),
          thesis: v.string(),
          action: v.optional(v.string()),
          priceTarget: v.optional(v.number()),
          timeframe: v.optional(v.string()),
        })
      )
    ),
    macro: v.optional(
      v.object({
        macroSummary: v.string(),
        sentiment: v.optional(v.string()),
        sectorViews: v.optional(v.array(v.object({
          sector: v.string(),
          stance: v.string(),
          note: v.optional(v.string()),
        }))),
        rotations: v.optional(v.array(v.object({
          from: v.optional(v.string()),
          to: v.optional(v.string()),
          note: v.string(),
        }))),
      })
    ),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("influencerVideos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    if (!video) throw new Error(`Video not found: ${args.videoId}`);

    const patch: any = { status: "done", processedAt: Date.now() };
    if (args.transcript) patch.transcript = args.transcript;
    if (args.summary) patch.summary = args.summary;
    await ctx.db.patch(video._id, patch);

    if (args.mentions) {
      // Idempotency: drop any prior mentions for this video so re-runs
      // (e.g. re-transcribe + re-extract) don't pile up duplicate rows and
      // inflate daily sentiment counts.
      const prior = await ctx.db
        .query("videoStockMentions")
        .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
        .collect();
      for (const old of prior) await ctx.db.delete(old._id);

      for (const m of args.mentions) {
        await ctx.db.insert("videoStockMentions", {
          videoId: args.videoId,
          channelId: video.channelId,
          symbol: m.symbol,
          stance: m.stance,
          conviction: m.conviction,
          thesis: m.thesis,
          action: m.action,
          priceTarget: m.priceTarget?.toString?.(),
        });
      }
    }

    if (args.macro) {
      // Same idempotency: one macro note per video.
      const priorMacro = await ctx.db
        .query("macroNotes")
        .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
        .collect();
      for (const old of priorMacro) await ctx.db.delete(old._id);

      await ctx.db.insert("macroNotes", {
        videoId: args.videoId,
        channelId: video.channelId,
        macroSummary: args.macro.macroSummary,
        sectorViews: args.macro.sectorViews?.map((s: any) => s.sector ?? s).filter(Boolean) ?? [],
        rotations: args.macro.rotations?.map((r: any) => `${r.from ?? "?"} → ${r.to ?? "?"}: ${r.note}`).filter(Boolean) ?? [],
      });
    }

    return { ok: true };
  },
});

// ── Aggregation ───────────────────────────────────────────────────────────────

export const aggregateSentiment = mutation({
  args: {
    date: v.optional(v.string()),
    windowDays: v.number(),
  },
  handler: async (ctx, { windowDays }) => {
    const now = Date.now();
    const cutoff = now - windowDays * 24 * 60 * 60 * 1000;

    const mentions = await ctx.db.query("videoStockMentions").collect();
    const videos = await ctx.db.query("influencerVideos").collect();
    const videoInWindow = new Set(
      videos.filter((v) => v.publishedAt >= cutoff).map((v) => v.videoId)
    );
    const windowMentions = mentions.filter((m) => videoInWindow.has(m.videoId));

    // Resolve a mention to its creator. Mentions carry the creator either as a
    // channelId (UC…) or as the influencer document _id (legacy rows), so map
    // both. Fall back to the parent video's channelId when neither is set.
    const influencers = await ctx.db.query("influencers").collect();
    const nameByKey = new Map<string, string>();
    for (const inf of influencers) {
      nameByKey.set(inf._id, inf.name);
      if (inf.channelId) nameByKey.set(inf.channelId, inf.name);
    }
    const channelByVideo = new Map<string, string>();
    for (const v of videos) channelByVideo.set(v.videoId, v.channelId);

    // Stable per-creator key (used to count DISTINCT creators). Prefer the
    // channelId since it's the canonical creator key and is always set after
    // the schema tightening; fall back to the legacy influencerId / parent
    // video channel for any rows that predate the backfill.
    const actorKey = (m: any): string =>
      m.channelId || m.influencerId || channelByVideo.get(m.videoId) || "unknown";
    const nameOf = (key: string): string => nameByKey.get(key) ?? "Unknown creator";

    const bySymbol: Record<
      string,
      {
        bullish: Set<string>;
        bearish: Set<string>;
        neutral: Set<string>;
        theses: any[];
        netScore: number;
        companyName: string | null;
      }
    > = {};

    for (const m of windowMentions) {
      if (!bySymbol[m.symbol]) {
        bySymbol[m.symbol] = {
          bullish: new Set(),
          bearish: new Set(),
          neutral: new Set(),
          theses: [],
          netScore: 0,
          companyName: null,
        };
      }
      const key = actorKey(m);
      bySymbol[m.symbol]![m.stance as "bullish" | "bearish" | "neutral"].add(key);
      bySymbol[m.symbol]!.theses.push({ influencerId: key, stance: m.stance, thesis: m.thesis });
      if (!bySymbol[m.symbol]!.companyName && m.companyName) {
        bySymbol[m.symbol]!.companyName = m.companyName;
      }

      const weight = m.stance === "bullish" ? 1 : m.stance === "bearish" ? -1 : 0;
      const conv = m.conviction === "high" ? 3 : m.conviction === "medium" ? 2 : 1;
      bySymbol[m.symbol].netScore += weight * conv;
    }

    const endDate = new Date(now).toISOString().split("T")[0];

    // Clear old sentiment
    const old = await ctx.db.query("dailySentiment").collect();
    for (const row of old) await ctx.db.delete(row._id);

    const bullishLeaders: any[] = [];
    const bearishLeaders: any[] = [];

    for (const [symbol, data] of Object.entries(bySymbol)) {
      const bullish = data.bullish.size;
      const bearish = data.bearish.size;
      const neutral = data.neutral.size;
      const total = bullish + bearish;

      let consensus: any = "mixed";
      if (total > 0) {
        const ratio = bullish / total;
        if (ratio >= 0.7) consensus = "strong_bullish";
        else if (ratio >= 0.55) consensus = "bullish";
        else if (ratio <= 0.3) consensus = "strong_bearish";
        else if (ratio <= 0.45) consensus = "bearish";
      }

      const theses = data.theses.slice(0, 5);

      await ctx.db.insert("dailySentiment", {
        symbol,
        date: endDate,
        bullishCount: bullish,
        bearishCount: bearish,
        neutralCount: neutral,
        bullishCreators: Array.from(data.bullish).map(nameOf),
        bearishCreators: Array.from(data.bearish).map(nameOf),
        neutralCreators: Array.from(data.neutral).map(nameOf),
        companyName: data.companyName ?? undefined,
        netScore: data.netScore,
        consensus,
        strongestTheses: theses.map((t: any) => t.thesis),
        windowStart: new Date(cutoff).toISOString().split("T")[0],
        windowEnd: endDate,
      });

      const leader = {
        symbol,
        companyName: data.companyName,
        netScore: data.netScore,
        bullish,
        bearish,
        neutral,
        mentions: bullish + bearish + neutral,
        consensus,
        theses,
      };

      if (consensus === "bullish" || consensus === "strong_bullish") {
        bullishLeaders.push(leader);
      } else if (consensus === "bearish" || consensus === "strong_bearish") {
        bearishLeaders.push(leader);
      }
    }

    bullishLeaders.sort((a, b) => b.bullish - a.bullish);
    bearishLeaders.sort((a, b) => b.bearish - a.bearish);

    // Get macro notes
    const macroNotesRaw = await ctx.db.query("macroNotes").collect();
    const macroNotes = macroNotesRaw
      .filter((m) => videoInWindow.has(m.videoId))
      .map((m) => ({
        influencerId: m.channelId,
        macroSummary: m.macroSummary,
        sentiment: null,
        sectorViews: [] as any[],
        rotations: [] as any[],
      }));

    return {
      date: endDate,
      windowDays,
      symbolCount: Object.keys(bySymbol).length,
      bullishLeaders,
      bearishLeaders,
      macroNotes,
    };
  },
});

// ── Save digest ──────────────────────────────────────────────────────────────

export const saveDigest = mutation({
  args: {
    date: v.string(),
    marketSentiment: v.string(),
    sentimentLabel: v.optional(v.string()),
    keyThemes: v.array(v.string()),
    sectorRotation: v.optional(v.array(v.object({
      from: v.optional(v.string()),
      to: v.optional(v.string()),
      rationale: v.string(),
    }))),
    bullishLeaders: v.optional(v.array(v.object({
      symbol: v.string(),
      netScore: v.number(),
      mentions: v.number(),
    }))),
    bearishLeaders: v.optional(v.array(v.object({
      symbol: v.string(),
      netScore: v.number(),
      mentions: v.number(),
    }))),
    recommendedActions: v.optional(v.array(v.object({
      symbol: v.optional(v.string()),
      action: v.string(),
      rationale: v.string(),
    }))),
    videosAnalyzed: v.optional(v.number()),
    influencersCount: v.optional(v.number()),
    windowDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("macroDigest")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    const digest = {
      date: args.date,
      marketSentiment: args.marketSentiment,
      sentimentLabel: args.sentimentLabel,
      keyThemes: args.keyThemes,
      // Keep the structured shapes the UI renders (actions as {symbol, action,
      // rationale}; rotations as {from, to, rationale}) instead of flattening
      // them to strings — flattening was leaving the UI with empty fields.
      sectorRotation: args.sectorRotation ?? [],
      bullishLeaders: args.bullishLeaders?.map((l: any) => l.symbol) ?? [],
      bearishLeaders: args.bearishLeaders?.map((l: any) => l.symbol) ?? [],
      recommendedActions: args.recommendedActions ?? [],
      videosAnalyzed: args.videosAnalyzed,
      influencersCount: args.influencersCount,
      windowDays: args.windowDays,
      createdAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, digest);
      return { id: existing._id };
    }

    const id = await ctx.db.insert("macroDigest", digest);
    return { id };
  },
});

// ── Purge old data ──────────────────────────────────────────────────────────

export const purgeOld = mutation({
  args: {
    olderThanDays: v.number(),
  },
  handler: async (ctx, { olderThanDays }) => {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const videos = await ctx.db.query("influencerVideos").collect();
    let videosPurged = 0;
    let mentionsPurged = 0;
    let macrosPurged = 0;

    for (const v of videos) {
      if (v.publishedAt < cutoff) {
        const mentions = await ctx.db
          .query("videoStockMentions")
          .withIndex("by_videoId", (q) => q.eq("videoId", v.videoId))
          .collect();
        for (const m of mentions) {
          await ctx.db.delete(m._id);
          mentionsPurged++;
        }

        const macros = await ctx.db
          .query("macroNotes")
          .withIndex("by_videoId", (q) => q.eq("videoId", v.videoId))
          .collect();
        for (const m of macros) {
          await ctx.db.delete(m._id);
          macrosPurged++;
        }

        await ctx.db.delete(v._id);
        videosPurged++;
      }
    }

    const digests = await ctx.db.query("macroDigest").collect();
    let digestsPurged = 0;
    for (const d of digests) {
      const digestDate = new Date(d.date).getTime();
      if (digestDate < cutoff) {
        await ctx.db.delete(d._id);
        digestsPurged++;
      }
    }

    return {
      videos: videosPurged,
      mentions: mentionsPurged,
      macros: macrosPurged,
      digests: digestsPurged,
      sentiment: 0, // sentiment is cleared by aggregate
    };
  },
});

// ── Job run tracking ─────────────────────────────────────────────────────────

export const startJobRun = mutation({
  args: {
    mode: v.string(),
    startedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("jobRuns", {
      mode: args.mode,
      status: "running",
      startedAt: args.startedAt ?? Date.now(),
    });
    return { id };
  },
});

export const endJobRun = mutation({
  args: {
    runId: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    videosDiscovered: v.optional(v.number()),
    videosProcessed: v.optional(v.number()),
    videosErrored: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // runId is actually the Convex document ID string
    const run = await ctx.db.get(args.runId as any);
    if (!run) throw new Error(`Job run not found: ${args.runId}`);

    await ctx.db.patch(run._id, {
      status: args.status,
      videosDiscovered: args.videosDiscovered,
      videosProcessed: args.videosProcessed,
      videosFailed: args.videosErrored,
      endedAt: Date.now(),
      errorMessage: args.error,
    });
    return { ok: true };
  },
});

// ── Read queries ────────────────────────────────────────────────────────────

export const getInfluencers = query({
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
      .sort((a, b) => (b.bullishCount ?? 0) - (a.bullishCount ?? 0));
    const bearish = sentiments
      .filter((s) => s.consensus === "strong_bearish" || s.consensus === "bearish")
      .sort((a, b) => (b.bearishCount ?? 0) - (a.bearishCount ?? 0));
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

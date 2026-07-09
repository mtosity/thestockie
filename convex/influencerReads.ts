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

/** Normalize legacy sectorViews/rotations entries (objects) to display strings. */
function toDisplayString(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    if (o.sector)
      return `${String(o.sector)}${o.stance ? ` (${String(o.stance)})` : ""}${o.note ? `: ${String(o.note)}` : ""}`;
    if (o.from ?? o.to)
      return `${String(o.from ?? "?")} → ${String(o.to ?? "?")}${o.note ? `: ${String(o.note)}` : ""}`;
  }
  return String(item ?? "");
}

/**
 * Everything the per-creator detail page needs, in one query:
 * market-condition commentary (macroNotes), buy/add calls with theses,
 * per-symbol bullish/bearish takes, and recent analyzed videos.
 * All tables are indexed by_channelId; data spans the pipeline retention window.
 */
export const influencerSummary = query({
  args: { channelId: v.string() },
  handler: async (ctx, { channelId }) => {
    const influencer = await ctx.db
      .query("influencers")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .first();
    if (!influencer) return null;

    const allVideos = await ctx.db
      .query("influencerVideos")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .collect();
    const doneVideos = allVideos
      .filter((vid) => vid.status === "done")
      .sort((a, b) => b.publishedAt - a.publishedAt);
    const videoMeta = new Map(
      allVideos.map((vid) => [
        vid.videoId,
        { title: vid.title, publishedAt: vid.publishedAt },
      ]),
    );

    // ── Mentions (stance / thesis / action per symbol per video) ──
    const mentionRows = await ctx.db
      .query("videoStockMentions")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .collect();
    const dated = mentionRows.map((r) => {
      const meta = videoMeta.get(r.videoId);
      return {
        symbol: r.symbol,
        stance: r.stance,
        conviction: r.conviction,
        thesis: r.thesis,
        action: r.action?.toLowerCase() ?? null,
        priceTarget: r.priceTarget ?? null,
        date: meta?.publishedAt ?? r.publishedAt ?? r.createdAt ?? 0,
        videoTitle: meta?.title ?? "",
        videoId: r.videoId,
      };
    });
    dated.sort((a, b) => b.date - a.date);

    // Buy/add calls — "stocks they bought and why"
    const buys = dated.filter((m) => m.action === "buy" || m.action === "add");

    // Per-symbol takes: latest mention wins, older ones become history
    const bySymbol = new Map<string, typeof dated>();
    for (const m of dated) {
      const arr = bySymbol.get(m.symbol);
      if (arr) arr.push(m);
      else bySymbol.set(m.symbol, [m]);
    }
    const takes = [...bySymbol.entries()]
      .map(([symbol, rows]) => {
        const latest = rows[0]!;
        return {
          symbol,
          stance: latest.stance,
          conviction: latest.conviction,
          thesis: latest.thesis,
          action: latest.action,
          priceTarget: latest.priceTarget,
          mentionCount: rows.length,
          lastDate: latest.date,
          history: rows
            .slice(1, 6)
            .map((r) => ({ date: r.date, stance: r.stance })),
        };
      })
      .sort((a, b) => b.lastDate - a.lastDate);

    // ── Market-condition commentary (macro notes) ──
    const macroRows = await ctx.db
      .query("macroNotes")
      .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
      .collect();
    const marketView = macroRows
      .map((m) => {
        const meta = videoMeta.get(m.videoId);
        return {
          date: meta?.publishedAt ?? m.publishedAt ?? m.createdAt ?? 0,
          videoTitle: meta?.title ?? "",
          videoId: m.videoId,
          macroSummary: m.macroSummary,
          sentiment: m.sentiment ?? null,
          sectorViews: (m.sectorViews ?? []).map(toDisplayString).filter(Boolean),
          rotations: (m.rotations ?? []).map(toDisplayString).filter(Boolean),
        };
      })
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);

    return {
      influencer: {
        name: influencer.name,
        handle: influencer.handle ?? null,
        avatar: influencer.avatar ?? null,
        channelId: influencer.channelId,
      },
      stats: {
        videoCount: doneVideos.length,
        lastPublishedAt: doneVideos[0]?.publishedAt ?? null,
        symbolsCovered: takes.length,
      },
      marketView,
      buys,
      takes,
      videos: doneVideos.slice(0, 10).map((vid) => ({
        videoId: vid.videoId,
        title: vid.title,
        publishedAt: vid.publishedAt,
        summary: vid.summary ?? null,
      })),
    };
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
    return runs.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))[0];
  },
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // thestockie_user → users
  users: defineTable({
    supabaseId: v.optional(v.string()), // Original UUID from Supabase (for migration compat)
    name: v.optional(v.string()),
    email: v.string(),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.number()), // timestamp as ms
  })
    .index("by_supabaseId", ["supabaseId"])
    .index("by_email", ["email"]),

  // thestockie_account → accounts
  accounts: defineTable({
    userId: v.id("users"), // Convex _id of the user
    supabaseUserId: v.optional(v.string()), // FK to users.supabaseId (for migration compat)
    type: v.string(),
    provider: v.string(),
    providerAccountId: v.string(),
    refreshToken: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    tokenType: v.optional(v.string()),
    scope: v.optional(v.string()),
    idToken: v.optional(v.string()),
    sessionState: v.optional(v.string()),
  })
    .index("by_provider", ["provider", "providerAccountId"])
    .index("by_userId", ["userId"])
    .index("by_supabaseUserId", ["supabaseUserId"]),

  // thestockie_session → sessions
  sessions: defineTable({
    sessionToken: v.string(),
    userId: v.id("users"), // Convex _id of the user
    supabaseUserId: v.optional(v.string()), // for migration compat
    expires: v.number(), // timestamp as ms
  })
    .index("by_sessionToken", ["sessionToken"])
    .index("by_userId", ["userId"]),

  // thestockie_post → posts
  posts: defineTable({
    supabaseId: v.string(), // Original stock ticker ID (e.g., "NVDA")
    prompt: v.optional(v.string()),
    response: v.optional(v.string()),
    createdBy: v.string(), // FK to users.supabaseId
    recommendation: v.optional(
      v.union(
        v.literal("strong_buy"),
        v.literal("buy"),
        v.literal("hold"),
        v.literal("sell")
      )
    ),
    marketCap: v.optional(v.number()), // bigint → number (safe for JS)
    sector: v.optional(v.string()),
    createdAt: v.number(), // timestamp as ms
    updatedAt: v.optional(v.number()), // timestamp as ms
  })
    .index("by_supabaseId", ["supabaseId"])
    .index("by_createdBy", ["createdBy"])
    .index("by_recommendation", ["recommendation"])
    .index("by_sector", ["sector"])
    .index("by_createdAt", ["createdAt"]),

  // thestockie_verification_token → verificationTokens
  verificationTokens: defineTable({
    identifier: v.string(),
    token: v.string(),
    expires: v.number(), // timestamp as ms
  }).index("by_identifier_token", ["identifier", "token"]),

  // ───────────────────────────────────────────────────────────────────────────
  // Influencer pipeline (populated by the thestockie-influencer Go job)
  // ───────────────────────────────────────────────────────────────────────────

  // A YouTube stock-portfolio influencer we track.
  influencers: defineTable({
    name: v.string(),
    channelId: v.string(), // YouTube channel id, e.g. "UCxxxxxxxx"
    handle: v.optional(v.string()), // e.g. "@JosephCarlson"
    youtubeUrl: v.optional(v.string()),
    avatar: v.optional(v.string()),
    description: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_channelId", ["channelId"])
    .index("by_active", ["active"]),

  // One row per discovered video. Acts as the processing-state ledger.
  influencerVideos: defineTable({
    influencerId: v.id("influencers"),
    channelId: v.string(),
    videoId: v.string(), // YouTube video id (dedupe key)
    title: v.string(),
    url: v.string(),
    publishedAt: v.number(), // ms
    durationSec: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("transcribing"),
      v.literal("analyzing"),
      v.literal("done"),
      v.literal("error"),
      v.literal("skipped")
    ),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_videoId", ["videoId"])
    .index("by_influencer", ["influencerId"])
    .index("by_status", ["status"])
    .index("by_publishedAt", ["publishedAt"]),

  // One row per (video, ticker) — the influencer's stance on a symbol.
  videoStockMentions: defineTable({
    videoId: v.string(),
    influencerId: v.id("influencers"),
    symbol: v.string(), // uppercase ticker
    companyName: v.optional(v.string()),
    stance: v.union(
      v.literal("bullish"),
      v.literal("bearish"),
      v.literal("neutral")
    ),
    conviction: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    thesis: v.string(), // why bullish / bearish
    action: v.optional(
      v.union(
        v.literal("buy"),
        v.literal("add"),
        v.literal("hold"),
        v.literal("trim"),
        v.literal("sell"),
        v.literal("watch")
      )
    ),
    priceTarget: v.optional(v.number()),
    timeframe: v.optional(v.string()),
    publishedAt: v.number(), // denormalized from the video for time-range queries
    createdAt: v.number(),
  })
    .index("by_symbol", ["symbol"])
    .index("by_video", ["videoId"])
    .index("by_influencer", ["influencerId"])
    .index("by_symbol_publishedAt", ["symbol", "publishedAt"])
    .index("by_publishedAt", ["publishedAt"]),

  // Per-video macro / sector commentary.
  macroNotes: defineTable({
    videoId: v.string(),
    influencerId: v.id("influencers"),
    macroSummary: v.string(),
    sentiment: v.optional(
      v.union(
        v.literal("risk_on"),
        v.literal("neutral"),
        v.literal("risk_off")
      )
    ),
    sectorViews: v.array(
      v.object({
        sector: v.string(),
        stance: v.union(
          v.literal("bullish"),
          v.literal("bearish"),
          v.literal("neutral")
        ),
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
    publishedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_video", ["videoId"])
    .index("by_influencer", ["influencerId"])
    .index("by_publishedAt", ["publishedAt"]),

  // Aggregated per-symbol sentiment for a given run/date (trailing window).
  dailySentiment: defineTable({
    date: v.string(), // YYYY-MM-DD of the run
    symbol: v.string(),
    companyName: v.optional(v.string()),
    bullishCount: v.number(),
    bearishCount: v.number(),
    neutralCount: v.number(),
    mentionsCount: v.number(),
    netScore: v.number(), // conviction-weighted (bullish +, bearish −)
    consensus: v.union(
      v.literal("strong_bullish"),
      v.literal("bullish"),
      v.literal("mixed"),
      v.literal("bearish"),
      v.literal("strong_bearish")
    ),
    influencerIds: v.array(v.id("influencers")),
    topTheses: v.array(
      v.object({
        influencerId: v.id("influencers"),
        stance: v.string(),
        thesis: v.string(),
      })
    ),
    windowDays: v.number(),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_symbol", ["symbol"])
    .index("by_date_symbol", ["date", "symbol"])
    .index("by_date_netScore", ["date", "netScore"]),

  // Daily cross-influencer macro synthesis (LLM-written narrative + actions).
  macroDigest: defineTable({
    date: v.string(), // YYYY-MM-DD (unique per run)
    runAt: v.number(),
    marketSentiment: v.string(), // overall narrative
    sentimentLabel: v.optional(
      v.union(
        v.literal("risk_on"),
        v.literal("neutral"),
        v.literal("risk_off")
      )
    ),
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
    createdAt: v.number(),
  }).index("by_date", ["date"]),

  // One row per job execution, for observability + manual-trigger visibility.
  jobRuns: defineTable({
    runAt: v.number(),
    mode: v.string(), // "daily" | "manual" | "aggregate"
    status: v.union(
      v.literal("running"),
      v.literal("success"),
      v.literal("error")
    ),
    videosDiscovered: v.number(),
    videosProcessed: v.number(),
    videosErrored: v.number(),
    finishedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_runAt", ["runAt"]),
});

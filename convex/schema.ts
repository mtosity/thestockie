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

  // ── Influencer sentiment tables ─────────────────────────────────────────

  influencers: defineTable({
    name: v.string(),
    channelId: v.string(),
    handle: v.optional(v.string()),
    avatar: v.optional(v.string()),
    active: v.boolean(),
    // Legacy fields
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_channelId", ["channelId"])
    .index("by_active", ["active"]),

  influencerVideos: defineTable({
    videoId: v.string(),
    channelId: v.string(),
    title: v.string(),
    thumbnail: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("transcribing"),
      v.literal("analyzing"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("error")
    ),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
    publishedAt: v.number(), // timestamp as ms
    processedAt: v.optional(v.number()), // timestamp as ms
    // Legacy fields from previous runs
    createdAt: v.optional(v.number()),
    influencerId: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
    url: v.optional(v.string()),
    // Extra legacy field
    error: v.optional(v.string()),
  })
    .index("by_videoId", ["videoId"])
    .index("by_channelId", ["channelId"])
    .index("by_status", ["status"])
    .index("by_publishedAt", ["publishedAt"]),

  videoStockMentions: defineTable({
    videoId: v.string(),
    channelId: v.optional(v.string()),
    symbol: v.string(),
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
    priceTarget: v.optional(v.union(v.string(), v.number())),
    // Legacy fields
    companyName: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    influencerId: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    timeframe: v.optional(v.string()),
  })
    .index("by_videoId", ["videoId"])
    .index("by_symbol", ["symbol"])
    .index("by_channelId", ["channelId"]),

  macroNotes: defineTable({
    videoId: v.string(),
    channelId: v.optional(v.string()),
    macroSummary: v.string(),
    sectorViews: v.optional(v.array(v.any())),
    rotations: v.optional(v.array(v.any())),
    // Legacy fields
    createdAt: v.optional(v.number()),
    influencerId: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    sentiment: v.optional(v.string()),
  })
    .index("by_videoId", ["videoId"])
    .index("by_channelId", ["channelId"]),

  dailySentiment: defineTable({
    symbol: v.string(),
    date: v.string(), // YYYY-MM-DD
    bullishCount: v.optional(v.number()),
    bearishCount: v.optional(v.number()),
    neutralCount: v.optional(v.number()),
    bullishCreators: v.optional(v.array(v.string())),
    bearishCreators: v.optional(v.array(v.string())),
    netScore: v.optional(v.number()), // conviction-weighted
    consensus: v.optional(v.union(
      v.literal("strong_bullish"),
      v.literal("bullish"),
      v.literal("mixed"),
      v.literal("bearish"),
      v.literal("strong_bearish")
    )),
    strongestTheses: v.optional(v.array(v.string())),
    windowStart: v.optional(v.string()), // YYYY-MM-DD
    windowEnd: v.optional(v.string()), // YYYY-MM-DD
    // Legacy fields from previous runs
    companyName: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    influencerIds: v.optional(v.array(v.string())),
    mentionsCount: v.optional(v.number()),
    neutralCreators: v.optional(v.array(v.string())),
    topTheses: v.optional(v.array(v.any())),
    windowDays: v.optional(v.number()),
  })
    .index("by_symbol", ["symbol"])
    .index("by_date", ["date"])
    .index("by_symbol_date", ["symbol", "date"]),

  macroDigest: defineTable({
    date: v.string(), // YYYY-MM-DD
    marketSentiment: v.string(),
    keyThemes: v.optional(v.array(v.string())),
    sectorRotations: v.optional(v.array(v.string())),
    bullishLeaders: v.optional(v.array(v.any())),
    bearishLeaders: v.optional(v.array(v.any())),
    recommendedActions: v.optional(v.array(v.any())),
    createdAt: v.number(), // timestamp as ms
    // Legacy fields
    influencersCount: v.optional(v.number()),
    videosAnalyzed: v.optional(v.number()),
    windowDays: v.optional(v.number()),
    runAt: v.optional(v.number()),
    sentimentLabel: v.optional(v.string()),
    sectorRotation: v.optional(v.array(v.any())),
  })
    .index("by_date", ["date"])
    .index("by_createdAt", ["createdAt"]),

  jobRuns: defineTable({
    mode: v.string(),
    status: v.union(v.literal("running"), v.literal("success"), v.literal("failed")),
    videosDiscovered: v.optional(v.number()),
    videosProcessed: v.optional(v.number()),
    videosFailed: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    // Legacy fields
    finishedAt: v.optional(v.number()),
    runAt: v.optional(v.number()),
    videosErrored: v.optional(v.number()),
  })
    .index("by_startedAt", ["startedAt"]),

  // ── Super investor (13F) tables ─────────────────────────────────────────────

  superInvestors: defineTable({
    cik: v.string(),
    name: v.string(),
    slug: v.string(),
    firm: v.optional(v.string()),
    style: v.optional(v.string()),
    why: v.optional(v.string()),
    avatar: v.optional(v.string()),
    active: v.boolean(),
    lastFilingDate: v.optional(v.number()),
    lastPeriod: v.optional(v.string()),
    // Legacy fields
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_cik", ["cik"])
    .index("by_slug", ["slug"])
    .index("by_active", ["active"]),

  secFilings: defineTable({
    cik: v.string(),
    period: v.string(),
    reportDate: v.number(),
    filingDate: v.number(),
    totalValue: v.number(),
    positionCount: v.number(),
  })
    .index("by_cik", ["cik"])
    .index("by_period", ["period"])
    .index("by_cik_period", ["cik", "period"]),

  investorPositions: defineTable({
    cik: v.optional(v.string()),
    investorId: v.optional(v.string()), // Legacy field
    period: v.string(),
    cusip: v.string(),
    ticker: v.optional(v.string()),
    name: v.string(),
    shares: v.number(),
    value: v.number(),
    pctPortfolio: v.number(),
    changeType: v.union(
      v.literal("new"),
      v.literal("added"),
      v.literal("reduced"),
      v.literal("hold"),
      v.literal("sold")
    ),
    changePct: v.optional(v.number()),
    prevShares: v.optional(v.number()),
    isOption: v.optional(v.boolean()),
    // Legacy fields
    createdAt: v.optional(v.number()),
  })
    .index("by_cik_period", ["cik", "period"])
    .index("by_cusip", ["cusip"])
    .index("by_ticker", ["ticker"]),

  cusipCache: defineTable({
    cusip: v.string(),
    ticker: v.optional(v.string()),
    name: v.optional(v.string()),
  })
    .index("by_cusip", ["cusip"]),

  investorConsensus: defineTable({
    period: v.string(),
    ticker: v.string(),
    totalInvestors: v.optional(v.number()),
    totalShares: v.optional(v.number()),
    totalValue: v.optional(v.number()),
    topHolders: v.optional(v.array(v.string())),
    actions: v.optional(v.array(v.string())),
    avgPortfolioPct: v.optional(v.number()),
    // Legacy fields from existing data
    name: v.optional(v.string()),
    consensus: v.optional(v.string()),
    buyers: v.optional(v.number()),
    sellers: v.optional(v.number()),
    net: v.optional(v.number()),
    buyerNames: v.optional(v.array(v.string())),
    sellerNames: v.optional(v.array(v.string())),
    holders: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  })
    .index("by_period", ["period"])
    .index("by_ticker", ["ticker"])
    .index("by_period_ticker", ["period", "ticker"]),
});

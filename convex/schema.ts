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
    userId: v.string(), // Convex _id of the user (after migration: supabaseId lookup)
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
    userId: v.string(), // Convex _id of the user
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
});

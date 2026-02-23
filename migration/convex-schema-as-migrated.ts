import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex schema for thestockie - migrated from Supabase/PostgreSQL
 *
 * Key differences from Supabase:
 * - Convex auto-generates `_id` (Id<"tableName">) and `_creationTime` (number)
 * - Original Supabase IDs are stored as `supabaseId` for backward compatibility
 * - Foreign keys become string references (supabaseUserId) pointing to the original IDs
 * - Timestamps are stored as numbers (ms since epoch) instead of ISO strings
 * - Enums become union validators
 */
export default defineSchema({
  // thestockie_user → users
  users: defineTable({
    supabaseId: v.string(), // Original UUID from Supabase
    name: v.optional(v.string()),
    email: v.string(),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.number()), // timestamp as ms
  })
    .index("by_supabaseId", ["supabaseId"])
    .index("by_email", ["email"]),

  // thestockie_account → accounts
  accounts: defineTable({
    supabaseUserId: v.string(), // FK to users.supabaseId
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
    .index("by_supabaseUserId", ["supabaseUserId"]),

  // thestockie_session → sessions
  sessions: defineTable({
    sessionToken: v.string(),
    supabaseUserId: v.string(), // FK to users.supabaseId
    expires: v.number(), // timestamp as ms
  })
    .index("by_sessionToken", ["sessionToken"])
    .index("by_supabaseUserId", ["supabaseUserId"]),

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
  })
    .index("by_identifier_token", ["identifier", "token"]),
});
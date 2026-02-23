import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Migration mutations for importing Supabase data into Convex.
 * ⚠️  TEMPORARY FILE - Delete after migration is complete!
 * These are public mutations so the migration script can call them
 * via ConvexHttpClient.
 */

// Insert users in batch
export const insertUsers = mutation({
  args: {
    users: v.array(
      v.object({
        supabaseId: v.string(),
        name: v.optional(v.string()),
        email: v.string(),
        image: v.optional(v.string()),
        emailVerified: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { users }) => {
    const results = [];
    for (const user of users) {
      const id = await ctx.db.insert("users", user);
      results.push(id);
    }
    return { inserted: results.length };
  },
});

// Insert accounts in batch
export const insertAccounts = mutation({
  args: {
    accounts: v.array(
      v.object({
        supabaseUserId: v.string(),
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
    ),
  },
  handler: async (ctx, { accounts }) => {
    const results = [];
    for (const account of accounts) {
      const id = await ctx.db.insert("accounts", account);
      results.push(id);
    }
    return { inserted: results.length };
  },
});

// Insert sessions in batch
export const insertSessions = mutation({
  args: {
    sessions: v.array(
      v.object({
        sessionToken: v.string(),
        supabaseUserId: v.string(),
        expires: v.number(),
      })
    ),
  },
  handler: async (ctx, { sessions }) => {
    const results = [];
    for (const session of sessions) {
      const id = await ctx.db.insert("sessions", session);
      results.push(id);
    }
    return { inserted: results.length };
  },
});

// Insert a single post (posts can be large due to prompt/response fields)
export const insertPost = mutation({
  args: {
    supabaseId: v.string(),
    prompt: v.optional(v.string()),
    response: v.optional(v.string()),
    createdBy: v.string(),
    recommendation: v.optional(
      v.union(
        v.literal("strong_buy"),
        v.literal("buy"),
        v.literal("hold"),
        v.literal("sell")
      )
    ),
    marketCap: v.optional(v.number()),
    sector: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("posts", args);
    return id;
  },
});

// Insert posts in batch (for smaller posts)
export const insertPosts = mutation({
  args: {
    posts: v.array(
      v.object({
        supabaseId: v.string(),
        prompt: v.optional(v.string()),
        response: v.optional(v.string()),
        createdBy: v.string(),
        recommendation: v.optional(
          v.union(
            v.literal("strong_buy"),
            v.literal("buy"),
            v.literal("hold"),
            v.literal("sell")
          )
        ),
        marketCap: v.optional(v.number()),
        sector: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { posts }) => {
    const results = [];
    for (const post of posts) {
      const id = await ctx.db.insert("posts", post);
      results.push(id);
    }
    return { inserted: results.length };
  },
});

// Insert verification tokens in batch
export const insertVerificationTokens = mutation({
  args: {
    tokens: v.array(
      v.object({
        identifier: v.string(),
        token: v.string(),
        expires: v.number(),
      })
    ),
  },
  handler: async (ctx, { tokens }) => {
    const results = [];
    for (const token of tokens) {
      const id = await ctx.db.insert("verificationTokens", token);
      results.push(id);
    }
    return { inserted: results.length };
  },
});
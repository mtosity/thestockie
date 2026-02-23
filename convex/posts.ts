import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Convex queries and mutations for posts (stock analyses).
 */

// Get a single post by stock symbol (supabaseId field stores the ticker)
export const getBySymbol = query({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_supabaseId", (q) => q.eq("supabaseId", symbol))
      .first();
  },
});

// Paginated, filtered list of posts
export const getAll = query({
  args: {
    symbol: v.optional(v.string()),
    sector: v.optional(v.string()),
    recommendation: v.optional(
      v.union(
        v.literal("strong_buy"),
        v.literal("buy"),
        v.literal("hold"),
        v.literal("sell")
      )
    ),
    marketCapMin: v.optional(v.number()),
    marketCapMax: v.optional(v.number()),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 20;
    const offset = (page - 1) * limit;

    // Get all posts (Convex doesn't support complex multi-field filtering natively,
    // so we fetch with base index and filter in-memory for now)
    let postsQuery = ctx.db.query("posts").withIndex("by_createdAt");

    const allPosts = await postsQuery.collect();

    // Apply filters in memory
    const filtered = allPosts.filter((post) => {
      if (args.symbol && post.supabaseId !== args.symbol.toUpperCase()) {
        return false;
      }
      if (args.sector && post.sector !== args.sector) {
        return false;
      }
      if (args.recommendation && post.recommendation !== args.recommendation) {
        return false;
      }
      if (args.marketCapMin !== undefined && (post.marketCap ?? 0) < args.marketCapMin) {
        return false;
      }
      if (args.marketCapMax !== undefined && (post.marketCap ?? Infinity) > args.marketCapMax) {
        return false;
      }
      return true;
    });

    // Sort by createdAt desc
    const sorted = [...filtered].sort((a, b) => b.createdAt - a.createdAt);

    const total = sorted.length;
    const totalPages = Math.ceil(total / limit);
    const data = sorted.slice(offset, offset + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },
});

// Create or update a post (upsert by symbol)
export const createOrUpdate = mutation({
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_supabaseId", (q) => q.eq("supabaseId", args.supabaseId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("posts", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

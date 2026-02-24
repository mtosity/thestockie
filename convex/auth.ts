import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { type Id } from "./_generated/dataModel";

/**
 * Auth-related Convex mutations and queries used by the custom NextAuth adapter.
 * These map directly to the NextAuth adapter interface methods.
 */

// ── User ────────────────────────────────────────────────────────────────────

export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});

export const getUser = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

export const getUserByAccount = query({
  args: {
    provider: v.string(),
    providerAccountId: v.string(),
  },
  handler: async (ctx, { provider, providerAccountId }) => {
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_provider", (q) =>
        q.eq("provider", provider).eq("providerAccountId", providerAccountId)
      )
      .first();
    if (!account) return null;
    return await ctx.db.get(account.userId as Id<"users">);
  },
});

export const updateUser = mutation({
  args: {
    id: v.id("users"),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await ctx.db.patch(id, rest);
  },
});

export const deleteUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    // Delete associated accounts and sessions first
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .collect();
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
    await ctx.db.delete(id);
  },
});

// ── Account ─────────────────────────────────────────────────────────────────

export const linkAccount = mutation({
  args: {
    userId: v.id("users"),
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("accounts", {
      userId: args.userId,
      type: args.type,
      provider: args.provider,
      providerAccountId: args.providerAccountId,
      refreshToken: args.refreshToken,
      accessToken: args.accessToken,
      expiresAt: args.expiresAt,
      tokenType: args.tokenType,
      scope: args.scope,
      idToken: args.idToken,
      sessionState: args.sessionState,
    });
  },
});

export const unlinkAccount = mutation({
  args: {
    provider: v.string(),
    providerAccountId: v.string(),
  },
  handler: async (ctx, { provider, providerAccountId }) => {
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_provider", (q) =>
        q.eq("provider", provider).eq("providerAccountId", providerAccountId)
      )
      .first();
    if (account) {
      await ctx.db.delete(account._id);
    }
  },
});

// ── Session ──────────────────────────────────────────────────────────────────

export const createSession = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    expires: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", args);
  },
});

export const getSessionAndUser = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionToken", (q) => q.eq("sessionToken", sessionToken))
      .first();
    if (!session) return null;
    const user = await ctx.db.get(session.userId as Id<"users">);
    if (!user) return null;
    return { session, user };
  },
});

export const updateSession = mutation({
  args: {
    sessionToken: v.string(),
    expires: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { sessionToken, expires, userId }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionToken", (q) => q.eq("sessionToken", sessionToken))
      .first();
    if (!session) return null;
    const patch: Record<string, unknown> = {};
    if (expires !== undefined) patch.expires = expires;
    if (userId !== undefined) patch.userId = userId;
    await ctx.db.patch(session._id, patch);
  },
});

export const deleteSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionToken", (q) => q.eq("sessionToken", sessionToken))
      .first();
    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

// ── Verification Token ───────────────────────────────────────────────────────

export const createVerificationToken = mutation({
  args: {
    identifier: v.string(),
    token: v.string(),
    expires: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("verificationTokens", args);
  },
});

export const useVerificationToken = mutation({
  args: {
    identifier: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { identifier, token }) => {
    const vt = await ctx.db
      .query("verificationTokens")
      .withIndex("by_identifier_token", (q) =>
        q.eq("identifier", identifier).eq("token", token)
      )
      .first();
    if (!vt) return null;
    await ctx.db.delete(vt._id);
    return vt;
  },
});

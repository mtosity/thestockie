import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Lookup cache for "How to say" (home.mtosity.com/spell). The home API (sonos-api,
 * apps/api/src/spell.ts in the sonos repo) checks here before asking an LLM and stores
 * every new answer, so a word is only ever paid for once.
 *
 * Not used by thestockie itself. Calls carry `secret`, which must equal the
 * SPELL_CACHE_SECRET env var on this deployment (separate from CONVEX_SERVER_SECRET so
 * the home API can't call thestockie's server functions and vice versa).
 */

function assertSpellSecret(secret: string): void {
  const expected = process.env.SPELL_CACHE_SECRET;
  let diff = expected && expected.length === secret.length ? 0 : 1;
  if (expected) for (let i = 0; i < Math.min(secret.length, expected.length); i++) diff |= secret.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) throw new Error("Unauthorized");
}

export const get = query({
  args: { secret: v.string(), key: v.string() },
  handler: async (ctx, { secret, key }) => {
    assertSpellSecret(secret);
    const row = await ctx.db.query("spellCache").withIndex("by_key", (q) => q.eq("key", key)).unique();
    return row ? { result: row.result, model: row.model, createdAt: row.createdAt } : null;
  },
});

export const put = mutation({
  args: {
    secret: v.string(),
    key: v.string(),
    text: v.string(),
    language: v.string(),
    model: v.string(),
    result: v.any(),
  },
  handler: async (ctx, { secret, key, text, language, model, result }) => {
    assertSpellSecret(secret);
    const now = Date.now();
    const row = await ctx.db.query("spellCache").withIndex("by_key", (q) => q.eq("key", key)).unique();
    if (row) await ctx.db.patch(row._id, { result, model, updatedAt: now });
    else await ctx.db.insert("spellCache", { key, text, language, model, result, hits: 0, createdAt: now, updatedAt: now });
  },
});

/** Count a cache hit (the API calls this without waiting, so reads stay fast). */
export const hit = mutation({
  args: { secret: v.string(), key: v.string() },
  handler: async (ctx, { secret, key }) => {
    assertSpellSecret(secret);
    const row = await ctx.db.query("spellCache").withIndex("by_key", (q) => q.eq("key", key)).unique();
    if (row) await ctx.db.patch(row._id, { hits: row.hits + 1, lastHitAt: Date.now() });
  },
});

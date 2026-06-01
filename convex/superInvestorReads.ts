import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Public read queries for the thestockie.com/influencers page.
 * These are called directly from the frontend (not via HTTP).
 */

export const investors = query({
  handler: async (ctx) => {
    return await ctx.db.query("superInvestors").collect();
  },
});

export const consensus = query({
  args: {
    period: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get latest period if not provided
    let targetPeriod = args.period;
    if (!targetPeriod) {
      const filings = await ctx.db.query("secFilings").collect();
      if (filings.length === 0) return { period: null, rankings: { mostHeld: [], biggestBets: [] } };
      targetPeriod = filings.sort((a, b) => b.filingDate - a.filingDate)[0].period;
    }

    const consensus = await ctx.db
      .query("investorConsensus")
      .withIndex("by_period", (q) => q.eq("period", targetPeriod))
      .collect();

    const mostHeld = consensus
      .filter((c) => c.totalInvestors && c.totalInvestors >= 2)
      .sort((a, b) => (b.totalInvestors ?? 0) - (a.totalInvestors ?? 0));

    const biggestBets = consensus
      .sort((a, b) => (b.totalValue ?? 0) - (a.totalValue ?? 0))
      .slice(0, args.limit ?? 20);

    return {
      period: targetPeriod,
      rankings: { mostHeld, biggestBets },
    };
  },
});

export const latestFilings = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const filings = await ctx.db.query("secFilings").collect();
    const sorted = filings.sort((a, b) => b.filingDate - a.filingDate);
    return sorted.slice(0, args.limit ?? 20);
  },
});

export const investorPortfolio = query({
  args: {
    cik: v.string(),
    period: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const investor = await ctx.db
      .query("superInvestors")
      .withIndex("by_cik", (q) => q.eq("cik", args.cik))
      .first();
    if (!investor) return null;

    let targetPeriod = args.period;
    if (!targetPeriod) {
      const filings = await ctx.db
        .query("secFilings")
        .withIndex("by_cik", (q) => q.eq("cik", args.cik))
        .collect();
      if (filings.length === 0) return null;
      targetPeriod = filings.sort((a, b) => b.filingDate - a.filingDate)[0].period;
    }

    const positions = await ctx.db
      .query("investorPositions")
      .withIndex("by_cik_period", (q) =>
        q.eq("cik", args.cik).eq("period", targetPeriod)
      )
      .collect();

    return {
      investor,
      period: targetPeriod,
      positions: positions.sort((a, b) => b.value - a.value),
    };
  },
});

export const investorBySlug = query({
  args: {
    slug: v.string(),
    period: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const investor = await ctx.db
      .query("superInvestors")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!investor) return null;

    let targetPeriod = args.period;
    if (!targetPeriod) {
      const filings = await ctx.db
        .query("secFilings")
        .withIndex("by_cik", (q) => q.eq("cik", investor.cik))
        .collect();
      if (filings.length === 0) return null;
      targetPeriod = filings.sort((a, b) => b.filingDate - a.filingDate)[0].period;
    }

    const positions = await ctx.db
      .query("investorPositions")
      .withIndex("by_cik_period", (q) =>
        q.eq("cik", investor.cik).eq("period", targetPeriod)
      )
      .collect();

    return {
      investor,
      period: targetPeriod,
      positions: positions.sort((a, b) => b.value - a.value),
    };
  },
});

export const notableMoves = query({
  args: {
    period: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get latest period if not provided
    let targetPeriod = args.period;
    if (!targetPeriod) {
      const filings = await ctx.db.query("secFilings").collect();
      if (filings.length === 0) return { period: null, moves: [] };
      targetPeriod = filings.sort((a, b) => b.filingDate - a.filingDate)[0].period;
    }

    // Get all positions for target period
    const positions = await ctx.db
      .query("investorPositions")
      .withIndex("by_cik_period")
      .collect();

    const latestPositions = positions.filter((p) => p.period === targetPeriod);

    // Filter for notable moves (new, added, reduced, sold)
    const notable = latestPositions
      .filter((p) => p.changeType === "new" || p.changeType === "added" || p.changeType === "reduced" || p.changeType === "sold")
      .sort((a, b) => {
        const aScore = Math.abs(a.changePct || 0) * a.value;
        const bScore = Math.abs(b.changePct || 0) * b.value;
        return bScore - aScore;
      })
      .slice(0, args.limit ?? 50);

    return {
      period: targetPeriod,
      moves: notable,
    };
  },
});

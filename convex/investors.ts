import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Super investor (13F) tracking — mutations and queries.
 */

// ── Seed / manage investors ─────────────────────────────────────────────────

export const seedInvestor = mutation({
  args: {
    name: v.string(),
    firm: v.optional(v.string()),
    style: v.optional(v.string()),
    why: v.optional(v.string()),
    cik: v.string(),
    slug: v.string(),
    avatar: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("superInvestors")
      .withIndex("by_cik", (q) => q.eq("cik", args.cik))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        firm: args.firm,
        style: args.style,
        why: args.why,
        slug: args.slug,
        avatar: args.avatar,
        active: args.active ?? true,
      });
    } else {
      await ctx.db.insert("superInvestors", {
        name: args.name,
        cik: args.cik,
        slug: args.slug,
        firm: args.firm,
        style: args.style,
        why: args.why,
        avatar: args.avatar,
        active: args.active ?? true,
      });
    }
  },
});

export const getActiveInvestors = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("superInvestors")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
  },
});

export const getInvestors = query({
  handler: async (ctx) => {
    return await ctx.db.query("superInvestors").collect();
  },
});

// ── CUSIP cache ─────────────────────────────────────────────────────────────

export const cusipLookup = query({
  args: {
    cusips: v.array(v.string()),
  },
  handler: async (ctx, { cusips }) => {
    const result: Record<string, { ticker?: string; name?: string }> = {};
    for (const cusip of cusips) {
      const cached = await ctx.db
        .query("cusipCache")
        .withIndex("by_cusip", (q) => q.eq("cusip", cusip))
        .first();
      if (cached) {
        result[cusip] = {
          ticker: cached.ticker ?? undefined,
          name: cached.name ?? undefined,
        };
      }
    }
    return result;
  },
});

export const cusipSave = mutation({
  args: {
    entries: v.array(
      v.object({
        cusip: v.string(),
        ticker: v.optional(v.string()),
        name: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { entries }) => {
    for (const e of entries) {
      const existing = await ctx.db
        .query("cusipCache")
        .withIndex("by_cusip", (q) => q.eq("cusip", e.cusip))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          ticker: e.ticker,
          name: e.name,
        });
      } else {
        await ctx.db.insert("cusipCache", {
          cusip: e.cusip,
          ticker: e.ticker,
          name: e.name,
        });
      }
    }
  },
});

// ── Save filing ─────────────────────────────────────────────────────────────

export const saveFiling = mutation({
  args: {
    cik: v.string(),
    period: v.string(),
    reportDate: v.number(),
    filingDate: v.number(),
    totalValue: v.number(),
    positions: v.array(
      v.object({
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
        isOption: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete old filing for this CIK+period
    const old = await ctx.db
      .query("secFilings")
      .withIndex("by_cik_period", (q) =>
        q.eq("cik", args.cik).eq("period", args.period)
      )
      .collect();
    for (const o of old) {
      // Delete positions
      const positions = await ctx.db
        .query("investorPositions")
        .withIndex("by_cik_period", (q) =>
          q.eq("cik", args.cik).eq("period", args.period)
        )
        .collect();
      for (const p of positions) await ctx.db.delete(p._id);
      await ctx.db.delete(o._id);
    }

    // Insert new filing
    await ctx.db.insert("secFilings", {
      cik: args.cik,
      period: args.period,
      reportDate: args.reportDate,
      filingDate: args.filingDate,
      totalValue: args.totalValue,
      positionCount: args.positions.length,
    });

    // Insert positions
    for (const p of args.positions) {
      await ctx.db.insert("investorPositions", {
        cik: args.cik,
        period: args.period,
        cusip: p.cusip,
        ticker: p.ticker,
        name: p.name,
        shares: p.shares,
        value: p.value,
        pctPortfolio: p.pctPortfolio,
        changeType: p.changeType,
        changePct: p.changePct,
        prevShares: p.prevShares,
        isOption: p.isOption,
      });
    }

    // Update investor last filing
    const investor = await ctx.db
      .query("superInvestors")
      .withIndex("by_cik", (q) => q.eq("cik", args.cik))
      .first();
    if (investor) {
      await ctx.db.patch(investor._id, {
        lastFilingDate: args.filingDate,
        lastPeriod: args.period,
      });
    }

    return { ok: true };
  },
});

// ── Aggregate consensus ─────────────────────────────────────────────────────

export const aggregateConsensus = mutation({
  args: {
    period: v.string(),
  },
  handler: async (ctx, { period }) => {
    const positions = await ctx.db
      .query("investorPositions")
      .collect();
    const periodPositions = positions.filter((p) => p.period === period);

    // Group by ticker
    const byTicker: Record<string, any[]> = {};
    for (const p of periodPositions) {
      const t = p.ticker || p.cusip;
      if (!byTicker[t]) byTicker[t] = [];
      byTicker[t].push(p);
    }

    // Clear old consensus for this period
    const old = await ctx.db
      .query("investorConsensus")
      .withIndex("by_period", (q) => q.eq("period", period))
      .collect();
    for (const o of old) await ctx.db.delete(o._id);

    // Build consensus
    for (const [ticker, ps] of Object.entries(byTicker)) {
      const ciks = new Set(ps.map((p: any) => p.cik).filter((c: any) => c && c !== "undefined"));
      const totalShares = ps.reduce((s, p) => s + p.shares, 0);
      const totalValue = ps.reduce((s, p) => s + p.value, 0);
      const avgPct = ps.reduce((s, p) => s + p.pctPortfolio, 0) / ps.length;

      const actions = ps.map((p: any) => {
        const change = p.changePct ? ` (${p.changePct > 0 ? "+" : ""}${p.changePct.toFixed(1)}%)` : "";
        return `${p.changeType}${change}`;
      });

      let topHolders = Array.from(ciks).slice(0, 5);
      if (topHolders.length === 0) { topHolders = ["unknown"]; }

      await ctx.db.insert("investorConsensus", {
        period,
        ticker,
        totalInvestors: ciks.size || 1,
        totalShares,
        totalValue,
        topHolders,
        actions,
        avgPortfolioPct: avgPct,
      });
    }

    return { symbols: Object.keys(byTicker).length };
  },
});

// ── Read queries ──────────────────────────────────────────────────────────────

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
  handler: async (ctx, { cik, period }) => {
    const investor = await ctx.db
      .query("superInvestors")
      .withIndex("by_cik", (q) => q.eq("cik", cik))
      .first();
    if (!investor) return null;

    let targetPeriod = period;
    if (!targetPeriod) {
      const filings = await ctx.db
        .query("secFilings")
        .withIndex("by_cik", (q) => q.eq("cik", cik))
        .collect();
      if (filings.length === 0) return null;
      targetPeriod = filings.sort((a, b) => b.filingDate - a.filingDate)[0]!.period;
    }

    const positions = await ctx.db
      .query("investorPositions")
      .withIndex("by_cik_period", (q) =>
        q.eq("cik", cik).eq("period", targetPeriod)
      )
      .collect();

    return {
      investor,
      period: targetPeriod,
      positions: positions.sort((a, b) => b.value - a.value),
    };
  },
});

export const consensusRanking = query({
  args: {
    period: v.string(),
  },
  handler: async (ctx, { period }) => {
    const consensus = await ctx.db
      .query("investorConsensus")
      .withIndex("by_period", (q) => q.eq("period", period))
      .collect();

    const mostHeld = consensus
      .filter((c) => (c.totalInvestors ?? 0) >= 2)
      .sort((a, b) => (b.totalInvestors ?? 0) - (a.totalInvestors ?? 0));

    const biggestBets = consensus
      .sort((a, b) => (b.totalValue ?? 0) - (a.totalValue ?? 0))
      .slice(0, 20);

    return { mostHeld, biggestBets };
  },
});

export const positionHistory = query({
  args: {
    ticker: v.string(),
  },
  handler: async (ctx, { ticker }) => {
    const positions = await ctx.db
      .query("investorPositions")
      .withIndex("by_ticker", (q) => q.eq("ticker", ticker))
      .collect();
    return positions.sort((a, b) => b.period.localeCompare(a.period));
  },
});

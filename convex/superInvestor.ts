import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Internal queries & mutations for the super-investor (13F) feature, called by
 * the external `superinvestor-job` via the HTTP endpoints in `http.ts`.
 * Mirrors the influencer pipeline conventions.
 */

const changeTypeV = v.union(
  v.literal("new"),
  v.literal("added"),
  v.literal("reduced"),
  v.literal("sold"),
  v.literal("hold")
);

// ── Investors ────────────────────────────────────────────────────────────────

export const upsertInvestor = internalMutation({
  args: {
    name: v.string(),
    firm: v.string(),
    style: v.optional(v.string()),
    why: v.optional(v.string()),
    cik: v.string(),
    slug: v.string(),
    avatar: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("superInvestors")
      .withIndex("by_cik", (q) => q.eq("cik", args.cik))
      .first();
    const active = args.active ?? true;
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        firm: args.firm,
        style: args.style,
        why: args.why,
        slug: args.slug,
        avatar: args.avatar,
        active,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("superInvestors", { ...args, active, createdAt: now, updatedAt: now });
  },
});

export const listActiveInvestors = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("superInvestors")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const out = [];
    for (const i of rows) {
      // Latest already-stored filing, so the job can skip when EDGAR has nothing newer.
      const filings = await ctx.db
        .query("investor13fFilings")
        .withIndex("by_investor", (q) => q.eq("investorId", i._id))
        .collect();
      let lastFilingDate = 0;
      let lastPeriod = "";
      for (const f of filings) if (f.filingDate > lastFilingDate) { lastFilingDate = f.filingDate; lastPeriod = f.period; }
      out.push({ id: i._id, cik: i.cik, name: i.name, slug: i.slug, lastFilingDate, lastPeriod });
    }
    return out;
  },
});

// ── CUSIP→ticker cache ───────────────────────────────────────────────────────

export const cusipLookup = internalQuery({
  args: { cusips: v.array(v.string()) },
  handler: async (ctx, { cusips }) => {
    const out: Record<string, { ticker: string | null; name: string | null }> = {};
    for (const c of cusips) {
      const row = await ctx.db
        .query("cusipTickers")
        .withIndex("by_cusip", (q) => q.eq("cusip", c))
        .first();
      if (row) out[c] = { ticker: row.ticker ?? null, name: row.name ?? null };
    }
    return out;
  },
});

export const cusipSave = internalMutation({
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
    const now = Date.now();
    for (const e of entries) {
      const existing = await ctx.db
        .query("cusipTickers")
        .withIndex("by_cusip", (q) => q.eq("cusip", e.cusip))
        .first();
      if (existing) await ctx.db.patch(existing._id, { ticker: e.ticker, name: e.name });
      else await ctx.db.insert("cusipTickers", { cusip: e.cusip, ticker: e.ticker, name: e.name, createdAt: now });
    }
  },
});

// ── Filings + positions ──────────────────────────────────────────────────────

export const saveFiling = internalMutation({
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
        changeType: changeTypeV,
        changePct: v.optional(v.number()),
        prevShares: v.optional(v.number()),
        isOption: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const inv = await ctx.db
      .query("superInvestors")
      .withIndex("by_cik", (q) => q.eq("cik", args.cik))
      .first();
    if (!inv) throw new Error(`unknown investor cik ${args.cik}`);

    // Replace any existing filing + positions for this (investor, period).
    const oldF = await ctx.db
      .query("investor13fFilings")
      .withIndex("by_investor_period", (q) => q.eq("investorId", inv._id).eq("period", args.period))
      .collect();
    for (const f of oldF) await ctx.db.delete(f._id);
    const oldP = await ctx.db
      .query("investorPositions")
      .withIndex("by_investor_period", (q) => q.eq("investorId", inv._id).eq("period", args.period))
      .collect();
    for (const p of oldP) await ctx.db.delete(p._id);

    const now = Date.now();
    await ctx.db.insert("investor13fFilings", {
      investorId: inv._id,
      cik: args.cik,
      period: args.period,
      reportDate: args.reportDate,
      filingDate: args.filingDate,
      totalValue: args.totalValue,
      holdingsCount: args.positions.length,
      createdAt: now,
    });
    for (const p of args.positions) {
      await ctx.db.insert("investorPositions", { investorId: inv._id, period: args.period, ...p, createdAt: now });
    }
    return { positions: args.positions.length };
  },
});

// ── Cross-investor consensus ─────────────────────────────────────────────────

type Consensus =
  | "strong_buy"
  | "buy"
  | "mixed"
  | "sell"
  | "strong_sell";

function consensusLabel(buy: number, sell: number): Consensus {
  const total = buy + sell;
  if (total === 0) return "mixed";
  const ratio = (buy - sell) / total;
  if (ratio >= 0.6 && buy >= 2) return "strong_buy";
  if (ratio <= -0.6 && sell >= 2) return "strong_sell";
  if (ratio > 0.15) return "buy";
  if (ratio < -0.15) return "sell";
  return "mixed";
}

export const aggregateConsensus = internalMutation({
  args: { period: v.string() },
  handler: async (ctx, { period }) => {
    const positions = await ctx.db
      .query("investorPositions")
      .withIndex("by_period", (q) => q.eq("period", period))
      .collect();

    const nameCache = new Map<string, string>();
    const nameOf = async (id: Id<"superInvestors">) => {
      let n = nameCache.get(id as string);
      if (n === undefined) {
        const inv = await ctx.db.get(id);
        n = inv?.name ?? "Unknown";
        nameCache.set(id as string, n);
      }
      return n;
    };

    type Agg = { ticker: string; name?: string; buyers: Set<string>; sellers: Set<string>; holders: Set<string> };
    const byTicker = new Map<string, Agg>();
    for (const p of positions) {
      if (!p.ticker) continue; // consensus board is ticker-keyed
      let a = byTicker.get(p.ticker);
      if (!a) {
        a = { ticker: p.ticker, name: p.name, buyers: new Set(), sellers: new Set(), holders: new Set() };
        byTicker.set(p.ticker, a);
      }
      const iname = await nameOf(p.investorId);
      a.holders.add(iname);
      if (p.changeType === "new" || p.changeType === "added") a.buyers.add(iname);
      else if (p.changeType === "reduced" || p.changeType === "sold") a.sellers.add(iname);
    }

    const old = await ctx.db
      .query("investorConsensus")
      .withIndex("by_period", (q) => q.eq("period", period))
      .collect();
    for (const r of old) await ctx.db.delete(r._id);

    const now = Date.now();
    let stored = 0;
    for (const a of byTicker.values()) {
      const buy = a.buyers.size;
      const sell = a.sellers.size;
      if (buy === 0 && sell === 0) continue; // no moves this quarter
      await ctx.db.insert("investorConsensus", {
        period,
        ticker: a.ticker,
        name: a.name,
        buyers: buy,
        sellers: sell,
        holders: a.holders.size,
        net: buy - sell,
        consensus: consensusLabel(buy, sell),
        buyerNames: [...a.buyers],
        sellerNames: [...a.sellers],
        createdAt: now,
      });
      stored++;
    }
    return { tickers: stored };
  },
});

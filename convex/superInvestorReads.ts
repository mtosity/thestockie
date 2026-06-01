import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/** Public read queries for the super-investor feature (consumed by tRPC). */

async function latestFilingPeriod(ctx: QueryCtx): Promise<string | null> {
  const f = await ctx.db.query("investor13fFilings").withIndex("by_period").order("desc").first();
  return f?.period ?? null;
}

async function investorNamer(ctx: QueryCtx) {
  const cache = new Map<string, { name: string; slug: string }>();
  return async (id: Id<"superInvestors">) => {
    let v = cache.get(id as string);
    if (!v) {
      const inv = await ctx.db.get(id);
      v = { name: inv?.name ?? "Unknown", slug: inv?.slug ?? "" };
      cache.set(id as string, v);
    }
    return v;
  };
}

// Roster of investors with their latest-quarter move summary.
export const investors = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db
      .query("superInvestors")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const out = [];
    for (const inv of list) {
      const filings = await ctx.db
        .query("investor13fFilings")
        .withIndex("by_investor", (q) => q.eq("investorId", inv._id))
        .collect();
      filings.sort((a, b) => b.period.localeCompare(a.period));
      const latest = filings[0] ?? null;
      const moves = { new: 0, added: 0, reduced: 0, sold: 0 };
      if (latest) {
        const pos = await ctx.db
          .query("investorPositions")
          .withIndex("by_investor_period", (q) => q.eq("investorId", inv._id).eq("period", latest.period))
          .collect();
        for (const p of pos) if (p.changeType in moves) moves[p.changeType as keyof typeof moves]++;
      }
      out.push({
        _id: inv._id,
        name: inv.name,
        firm: inv.firm,
        style: inv.style ?? null,
        why: inv.why ?? null,
        slug: inv.slug,
        avatar: inv.avatar ?? null,
        period: latest?.period ?? null,
        totalValue: latest?.totalValue ?? null,
        holdingsCount: latest?.holdingsCount ?? 0,
        moves,
      });
    }
    out.sort((a, b) => (b.totalValue ?? 0) - (a.totalValue ?? 0));
    return out;
  },
});

// "Most bought / Most sold" consensus leaderboard — same net-leaning + >2 + fill
// rules as the influencer sentiment board.
export const consensus = query({
  args: { period: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { period, limit }) => {
    const theP = period ?? (await latestFilingPeriod(ctx));
    if (!theP) return { period: null, bought: [], sold: [] };
    const rows = await ctx.db
      .query("investorConsensus")
      .withIndex("by_period", (q) => q.eq("period", theP))
      .collect();
    const n = limit ?? 12;
    type R = (typeof rows)[number];
    const pick = (mine: (r: R) => number, theirs: (r: R) => number) => {
      const ranked = rows
        .filter((r) => mine(r) > theirs(r))
        .sort(
          (a, b) =>
            mine(b) - mine(a) || mine(b) - theirs(b) - (mine(a) - theirs(a)) || b.holders - a.holders
        );
      const strong = ranked.filter((r) => mine(r) > 2);
      return strong.length >= n ? strong : ranked.slice(0, n);
    };
    return {
      period: theP,
      bought: pick(
        (r) => r.buyers,
        (r) => r.sellers
      ),
      sold: pick(
        (r) => r.sellers,
        (r) => r.buyers
      ),
    };
  },
});

// Biggest individual moves this quarter (new buys, full exits, adds, trims).
export const notableMoves = query({
  args: { period: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { period, limit }) => {
    const theP = period ?? (await latestFilingPeriod(ctx));
    if (!theP) return { period: null, newBuys: [], exits: [], adds: [], trims: [] };
    const pos = await ctx.db
      .query("investorPositions")
      .withIndex("by_period", (q) => q.eq("period", theP))
      .collect();
    const namer = await investorNamer(ctx);
    const n = limit ?? 8;
    const enrich = async (p: Doc<"investorPositions">) => {
      const who = await namer(p.investorId);
      return {
        ticker: p.ticker ?? null,
        name: p.name,
        investor: who.name,
        slug: who.slug,
        value: p.value,
        pctPortfolio: p.pctPortfolio,
        changePct: p.changePct ?? null,
      };
    };
    const top = async (type: string, sortVal: (p: Doc<"investorPositions">) => number) => {
      const rows = pos.filter((p) => p.changeType === type).sort((a, b) => sortVal(b) - sortVal(a)).slice(0, n);
      return Promise.all(rows.map(enrich));
    };
    return {
      period: theP,
      newBuys: await top("new", (p) => p.value),
      exits: await top("sold", (p) => p.value), // value = prior stake size for exits
      adds: await top("added", (p) => p.value),
      trims: await top("reduced", (p) => Math.abs(p.changePct ?? 0)),
    };
  },
});

// One investor's latest 13F: holdings + moves, with period switching.
export const investorBySlug = query({
  args: { slug: v.string(), period: v.optional(v.string()) },
  handler: async (ctx, { slug, period }) => {
    const inv = await ctx.db
      .query("superInvestors")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!inv) return null;
    const filings = await ctx.db
      .query("investor13fFilings")
      .withIndex("by_investor", (q) => q.eq("investorId", inv._id))
      .collect();
    filings.sort((a, b) => b.period.localeCompare(a.period));
    const theP = period ?? filings[0]?.period ?? null;
    const filing = filings.find((f) => f.period === theP) ?? null;
    let positions: Doc<"investorPositions">[] = [];
    if (theP) {
      positions = await ctx.db
        .query("investorPositions")
        .withIndex("by_investor_period", (q) => q.eq("investorId", inv._id).eq("period", theP))
        .collect();
    }
    return {
      investor: {
        name: inv.name,
        firm: inv.firm,
        style: inv.style ?? null,
        why: inv.why ?? null,
        slug: inv.slug,
        avatar: inv.avatar ?? null,
        cik: inv.cik,
      },
      period: theP,
      periods: filings.map((f) => f.period),
      filing: filing
        ? {
            filingDate: filing.filingDate,
            reportDate: filing.reportDate,
            totalValue: filing.totalValue,
            holdingsCount: filing.holdingsCount,
          }
        : null,
      positions: positions
        .map((p) => ({
          ticker: p.ticker ?? null,
          name: p.name,
          shares: p.shares,
          value: p.value,
          pctPortfolio: p.pctPortfolio,
          changeType: p.changeType,
          changePct: p.changePct ?? null,
          prevShares: p.prevShares ?? null,
          isOption: p.isOption ?? false,
        }))
        .sort((a, b) => b.value - a.value),
    };
  },
});

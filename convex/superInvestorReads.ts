import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  latestFiling,
  makeNamer,
  notableMoves as computeNotableMoves,
  pickConsensus,
  rankConsensus,
  rosterEntry,
  sortRoster,
} from "./lib/superInvestorCompute";

/**
 * Public read queries for the super-investor (13F) feature (consumed by tRPC).
 * Data is produced by the external `superinvestor-job` and keyed by `cik`:
 *   superInvestors · secFilings · investorPositions
 * The cross-investor consensus is reconstructed from `investorPositions`
 * (distinct investors buying vs. selling each ticker), so it stays in sync with
 * the per-investor moves even though the raw consensus table is sparse.
 *
 * investors / consensus / notableMoves serve the precomputed snapshot for the period
 * (see superInvestorSnapshot.ts) and only scan positions when none exists yet.
 */

async function latestPeriod(ctx: QueryCtx): Promise<string | null> {
  const filings = await ctx.db.query("secFilings").collect();
  return latestFiling(filings)?.period ?? null;
}

async function snapshotFor(ctx: QueryCtx, period: string) {
  return await ctx.db
    .query("superInvestorSnapshots")
    .withIndex("by_period", (q) => q.eq("period", period))
    .first();
}

async function periodPositions(ctx: QueryCtx, period: string) {
  return (
    await ctx.db.query("investorPositions").withIndex("by_cik_period").collect()
  ).filter((p) => p.period === period);
}

async function namerFor(ctx: QueryCtx) {
  return makeNamer(await ctx.db.query("superInvestors").collect());
}

// Roster of investors with their latest-quarter move summary.
export const investors = query({
  args: {},
  handler: async (ctx) => {
    const theP = await latestPeriod(ctx);
    const snapshot = theP ? await snapshotFor(ctx, theP) : null;
    if (snapshot) return snapshot.roster;

    const list = await ctx.db
      .query("superInvestors")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const out = [];
    for (const inv of list) {
      const filings = await ctx.db
        .query("secFilings")
        .withIndex("by_cik", (q) => q.eq("cik", inv.cik))
        .collect();
      const latest = latestFiling(filings);
      if (!latest) continue; // skip seeds with no real 13F yet (e.g. test records)
      const pos = await ctx.db
        .query("investorPositions")
        .withIndex("by_cik_period", (q) =>
          q.eq("cik", inv.cik).eq("period", latest.period),
        )
        .collect();
      out.push(rosterEntry(inv, latest, pos));
    }
    return sortRoster(out);
  },
});

// "Most bought / Most sold" consensus leaderboard, reconstructed from positions:
// per ticker, how many distinct investors are buying (new/added) vs. selling
// (reduced/sold). Same net-leaning + >2 + fill-to-N rules as the influencer board.
export const consensus = query({
  args: { period: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { period, limit }) => {
    const theP = period ?? (await latestPeriod(ctx));
    if (!theP) return { period: null, bought: [], sold: [] };
    const n = limit ?? 12;

    const snapshot = await snapshotFor(ctx, theP);
    const ranked = snapshot
      ? { bought: snapshot.consensusBought, sold: snapshot.consensusSold }
      : rankConsensus(await periodPositions(ctx, theP), await namerFor(ctx));

    return {
      period: theP,
      bought: pickConsensus(ranked.bought, "bought", n),
      sold: pickConsensus(ranked.sold, "sold", n),
    };
  },
});

// Biggest individual moves this quarter (new buys, full exits, adds, trims).
export const notableMoves = query({
  args: { period: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { period, limit }) => {
    const theP = period ?? (await latestPeriod(ctx));
    if (!theP) return { period: null, newBuys: [], exits: [], adds: [], trims: [] };
    const n = limit ?? 8;

    const snapshot = await snapshotFor(ctx, theP);
    if (snapshot) {
      return {
        period: theP,
        newBuys: snapshot.newBuys.slice(0, n),
        exits: snapshot.exits.slice(0, n),
        adds: snapshot.adds.slice(0, n),
        trims: snapshot.trims.slice(0, n),
      };
    }
    return {
      period: theP,
      ...computeNotableMoves(await periodPositions(ctx, theP), await namerFor(ctx), n),
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
      .query("secFilings")
      .withIndex("by_cik", (q) => q.eq("cik", inv.cik))
      .collect();
    filings.sort((a, b) => b.filingDate - a.filingDate);
    const theP = period ?? filings[0]?.period ?? null;
    const filing = filings.find((f) => f.period === theP) ?? null;

    let positions: Doc<"investorPositions">[] = [];
    if (theP) {
      positions = await ctx.db
        .query("investorPositions")
        .withIndex("by_cik_period", (q) =>
          q.eq("cik", inv.cik).eq("period", theP),
        )
        .collect();
    }

    return {
      investor: {
        name: inv.name,
        firm: inv.firm ?? null,
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
            holdingsCount: filing.positionCount,
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

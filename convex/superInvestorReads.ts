import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/**
 * Public read queries for the super-investor (13F) feature (consumed by tRPC).
 * Data is produced by the external `superinvestor-job` and keyed by `cik`:
 *   superInvestors · secFilings · investorPositions
 * The cross-investor consensus is reconstructed here from `investorPositions`
 * (distinct investors buying vs. selling each ticker), so it stays in sync with
 * the per-investor moves even though the raw consensus table is sparse.
 */

async function latestPeriod(ctx: QueryCtx): Promise<string | null> {
  const filings = await ctx.db.query("secFilings").collect();
  if (filings.length === 0) return null;
  filings.sort((a, b) => b.filingDate - a.filingDate);
  return filings[0]?.period ?? null;
}

/** cik -> investor identity, resolved once per request. Returns null for ciks
 *  not in the roster (junk/test positions), so callers can skip them. */
async function investorNamer(ctx: QueryCtx) {
  const list = await ctx.db.query("superInvestors").collect();
  const map = new Map<string, { name: string; slug: string }>();
  for (const inv of list) map.set(inv.cik, { name: inv.name, slug: inv.slug });
  return (cik: string | undefined) =>
    (cik ? map.get(cik) : undefined) ?? null;
}

function consensusLabel(buyers: number, sellers: number): string {
  if (buyers + sellers === 0) return "mixed";
  const net = buyers - sellers;
  if (net >= 2) return "strong_buy";
  if (net >= 1) return "buy";
  if (net <= -2) return "strong_sell";
  if (net <= -1) return "sell";
  return "mixed";
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
        .query("secFilings")
        .withIndex("by_cik", (q) => q.eq("cik", inv.cik))
        .collect();
      filings.sort((a, b) => b.filingDate - a.filingDate);
      const latest = filings[0] ?? null;
      if (!latest) continue; // skip seeds with no real 13F yet (e.g. test records)
      const moves = { new: 0, added: 0, reduced: 0, sold: 0 };
      const pos = await ctx.db
        .query("investorPositions")
        .withIndex("by_cik_period", (q) =>
          q.eq("cik", inv.cik).eq("period", latest.period),
        )
        .collect();
      for (const p of pos)
        if (p.changeType in moves) moves[p.changeType as keyof typeof moves]++;
      out.push({
        _id: inv._id,
        name: inv.name,
        firm: inv.firm ?? null,
        style: inv.style ?? null,
        why: inv.why ?? null,
        slug: inv.slug,
        avatar: inv.avatar ?? null,
        period: latest.period,
        totalValue: latest.totalValue,
        holdingsCount: latest.positionCount,
        moves,
      });
    }
    out.sort((a, b) => (b.totalValue ?? 0) - (a.totalValue ?? 0));
    return out;
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

    const positions = (
      await ctx.db.query("investorPositions").withIndex("by_cik_period").collect()
    ).filter((p) => p.period === theP);
    const namer = await investorNamer(ctx);

    // Aggregate by ticker, counting DISTINCT investors (by cik) — not position
    // rows — so duplicate filings can't inflate the consensus.
    type Agg = {
      ticker: string;
      name: string;
      buyers: Set<string>;
      sellers: Set<string>;
      holders: Set<string>;
    };
    const byTicker = new Map<string, Agg>();
    for (const p of positions) {
      const who = namer(p.cik);
      if (!who || !p.cik) continue; // skip junk/test positions with no known investor
      const key = p.ticker ?? p.name;
      if (!key) continue;
      let a = byTicker.get(key);
      if (!a) {
        a = {
          ticker: p.ticker ?? key,
          name: p.name,
          buyers: new Set(),
          sellers: new Set(),
          holders: new Set(),
        };
        byTicker.set(key, a);
      }
      a.holders.add(p.cik);
      if (p.changeType === "new" || p.changeType === "added") a.buyers.add(p.cik);
      else if (p.changeType === "reduced" || p.changeType === "sold")
        a.sellers.add(p.cik);
    }

    const nameOf = (cik: string) => namer(cik)?.name;
    const names = (s: Set<string>) =>
      [...s].map(nameOf).filter((x): x is string => !!x);
    const rows = [...byTicker.values()].map((a) => ({
      ticker: a.ticker,
      name: a.name,
      buyers: a.buyers.size,
      sellers: a.sellers.size,
      holders: a.holders.size,
      buyerNames: names(a.buyers),
      sellerNames: names(a.sellers),
      consensus: consensusLabel(a.buyers.size, a.sellers.size),
    }));
    const n = limit ?? 12;
    type R = (typeof rows)[number];
    const pick = (mine: (r: R) => number, theirs: (r: R) => number) => {
      const ranked = rows
        .filter((r) => mine(r) > theirs(r))
        .sort(
          (a, b) =>
            mine(b) - mine(a) ||
            mine(b) - theirs(b) - (mine(a) - theirs(a)) ||
            b.holders - a.holders,
        );
      const strong = ranked.filter((r) => mine(r) > 2);
      return strong.length >= n ? strong : ranked.slice(0, n);
    };

    return {
      period: theP,
      bought: pick(
        (r) => r.buyers,
        (r) => r.sellers,
      ),
      sold: pick(
        (r) => r.sellers,
        (r) => r.buyers,
      ),
    };
  },
});

// Biggest individual moves this quarter (new buys, full exits, adds, trims).
export const notableMoves = query({
  args: { period: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { period, limit }) => {
    const theP = period ?? (await latestPeriod(ctx));
    if (!theP) return { period: null, newBuys: [], exits: [], adds: [], trims: [] };

    const positions = (
      await ctx.db.query("investorPositions").withIndex("by_cik_period").collect()
    ).filter((p) => p.period === theP);
    const namer = await investorNamer(ctx);
    const n = limit ?? 8;

    const enrich = (p: Doc<"investorPositions">) => {
      const who = namer(p.cik)!; // non-null: unresolved positions filtered out below
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
    const top = (type: string, sortVal: (p: Doc<"investorPositions">) => number) =>
      positions
        .filter((p) => p.changeType === type && namer(p.cik) !== null)
        .sort((a, b) => sortVal(b) - sortVal(a))
        .slice(0, n)
        .map(enrich);

    return {
      period: theP,
      newBuys: top("new", (p) => p.value),
      exits: top("sold", (p) => p.value), // value = prior stake size for exits
      adds: top("added", (p) => p.value),
      trims: top("reduced", (p) => Math.abs(p.changePct ?? 0)),
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

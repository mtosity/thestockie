import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  NOTABLE_MAX_LIMIT,
  consensusRowValidator,
  latestFiling,
  makeNamer,
  notableMoveValidator,
  notableMoves,
  rankConsensus,
  rosterEntry,
  rosterEntryValidator,
  sortRoster,
  trimRankedForSnapshot,
} from "./lib/superInvestorCompute";

/**
 * Precomputed super-investor (13F) reads.
 *
 * The roster, consensus board and notable moves all derive from ~25k
 * `investorPositions` rows. Computing them inside a query reads every row on each
 * cache miss (seconds on Convex Cloud, much longer self-hosted). Instead the 13F job's
 * /investor/aggregate call schedules `rebuild`, which pages through the positions in
 * small transactions and stores one snapshot per period. superInvestorReads serves
 * from the snapshot and only falls back to the live computation when none exists.
 *
 * Manual rebuild: npx convex run superInvestorSnapshot:rebuild
 */

const PAGE_SIZE = 1000;

type PositionRow = Pick<
  Doc<"investorPositions">,
  "cik" | "ticker" | "name" | "value" | "pctPortfolio" | "changeType" | "changePct"
>;
type PositionsPage = { page: PositionRow[]; isDone: boolean; continueCursor: string };

export const inputs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const investors = await ctx.db.query("superInvestors").collect();
    const active = await ctx.db
      .query("superInvestors")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const filings = await ctx.db.query("secFilings").collect();
    return { investors, active, filings };
  },
});

export const positionsPage = internalQuery({
  args: {
    cik: v.string(),
    period: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { cik, period, paginationOpts }) => {
    const res = await ctx.db
      .query("investorPositions")
      .withIndex("by_cik_period", (q) => q.eq("cik", cik).eq("period", period))
      .paginate(paginationOpts);
    return {
      ...res,
      page: res.page.map((p): PositionRow => ({
        cik: p.cik,
        ticker: p.ticker,
        name: p.name,
        value: p.value,
        pctPortfolio: p.pctPortfolio,
        changeType: p.changeType,
        changePct: p.changePct,
      })),
    };
  },
});

export const save = internalMutation({
  args: {
    period: v.string(),
    builtAt: v.number(),
    positionsRead: v.number(),
    roster: v.array(rosterEntryValidator),
    consensusBought: v.array(consensusRowValidator),
    consensusSold: v.array(consensusRowValidator),
    newBuys: v.array(notableMoveValidator),
    exits: v.array(notableMoveValidator),
    adds: v.array(notableMoveValidator),
    trims: v.array(notableMoveValidator),
  },
  handler: async (ctx, snapshot) => {
    const old = await ctx.db
      .query("superInvestorSnapshots")
      .withIndex("by_period", (q) => q.eq("period", snapshot.period))
      .collect();
    for (const o of old) await ctx.db.delete(o._id);
    await ctx.db.insert("superInvestorSnapshots", snapshot);
  },
});

export const rebuild = internalAction({
  args: {},
  handler: async (ctx): Promise<{ period: string | null; positionsRead: number }> => {
    const { investors, active, filings } = await ctx.runQuery(
      internal.superInvestorSnapshot.inputs,
      {},
    );
    const period = latestFiling(filings)?.period ?? null;
    if (!period) return { period: null, positionsRead: 0 };

    let positionsRead = 0;
    const cache = new Map<string, PositionRow[]>();
    const positionsFor = async (cik: string, p: string) => {
      const key = `${cik}|${p}`;
      const hit = cache.get(key);
      if (hit) return hit;
      const rows: PositionRow[] = [];
      let cursor: string | null = null;
      for (;;) {
        const res: PositionsPage = await ctx.runQuery(
          internal.superInvestorSnapshot.positionsPage,
          { cik, period: p, paginationOpts: { numItems: PAGE_SIZE, cursor } },
        );
        rows.push(...res.page);
        if (res.isDone) break;
        cursor = res.continueCursor;
      }
      positionsRead += rows.length;
      cache.set(key, rows);
      return rows;
    };

    // Roster: active investors with their own latest filing.
    const roster = [];
    for (const inv of active) {
      const latest = latestFiling(filings.filter((f) => f.cik === inv.cik));
      if (!latest) continue; // skip seeds with no real 13F yet (e.g. test records)
      roster.push(rosterEntry(inv, latest, await positionsFor(inv.cik, latest.period)));
    }

    // Consensus + notable moves for the latest period, across every known investor.
    // Ascending cik matches the by_cik_period index order the live queries iterate in.
    const ciks = [...new Set(investors.map((i) => i.cik))].sort();
    const positions = [];
    for (const cik of ciks) positions.push(...(await positionsFor(cik, period)));
    const namer = makeNamer(investors);
    const ranked = rankConsensus(positions, namer);
    const moves = notableMoves(positions, namer, NOTABLE_MAX_LIMIT);

    await ctx.runMutation(internal.superInvestorSnapshot.save, {
      period,
      builtAt: Date.now(),
      positionsRead,
      roster: sortRoster(roster),
      consensusBought: trimRankedForSnapshot(ranked.bought, "bought"),
      consensusSold: trimRankedForSnapshot(ranked.sold, "sold"),
      ...moves,
    });
    return { period, positionsRead };
  },
});

/** Called from the /investor/aggregate HTTP route after the 13F job saves filings. */
export const requestRebuild = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.superInvestorSnapshot.rebuild, {});
    return { scheduled: true };
  },
});

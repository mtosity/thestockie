import { v, type Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";

/**
 * Pure super-investor (13F) aggregations, shared by the live read queries and the
 * snapshot builder (convex/superInvestorSnapshot.ts) so both produce identical output.
 * Inputs are plain arrays; callers decide how to load them.
 */

type Position = Pick<
  Doc<"investorPositions">,
  "cik" | "ticker" | "name" | "value" | "pctPortfolio" | "changeType" | "changePct"
>;
type Investor = Pick<
  Doc<"superInvestors">,
  "_id" | "cik" | "name" | "slug" | "firm" | "style" | "why" | "avatar"
>;
type Filing = Pick<
  Doc<"secFilings">,
  "period" | "filingDate" | "totalValue" | "positionCount"
>;

// Largest `limit` the tRPC routers accept; snapshots keep enough rows for it.
export const CONSENSUS_MAX_LIMIT = 50;
export const NOTABLE_MAX_LIMIT = 20;

export const consensusRowValidator = v.object({
  ticker: v.string(),
  name: v.string(),
  buyers: v.number(),
  sellers: v.number(),
  holders: v.number(),
  buyerNames: v.array(v.string()),
  sellerNames: v.array(v.string()),
  consensus: v.string(),
});
export type ConsensusRow = Infer<typeof consensusRowValidator>;

export const notableMoveValidator = v.object({
  ticker: v.union(v.string(), v.null()),
  name: v.string(),
  investor: v.string(),
  slug: v.string(),
  value: v.number(),
  pctPortfolio: v.number(),
  changePct: v.union(v.number(), v.null()),
});
export type NotableMove = Infer<typeof notableMoveValidator>;

export const rosterEntryValidator = v.object({
  _id: v.id("superInvestors"),
  name: v.string(),
  firm: v.union(v.string(), v.null()),
  style: v.union(v.string(), v.null()),
  why: v.union(v.string(), v.null()),
  slug: v.string(),
  avatar: v.union(v.string(), v.null()),
  period: v.string(),
  totalValue: v.number(),
  holdingsCount: v.number(),
  moves: v.object({
    new: v.number(),
    added: v.number(),
    reduced: v.number(),
    sold: v.number(),
  }),
});
export type RosterEntry = Infer<typeof rosterEntryValidator>;

/** Most recent filing first (by filing date). */
export function latestFiling<F extends Filing>(filings: F[]): F | null {
  return [...filings].sort((a, b) => b.filingDate - a.filingDate)[0] ?? null;
}

/** cik -> investor identity. Returns null for ciks not in the roster (junk/test
 *  positions), so callers can skip them. */
export function makeNamer(investors: Pick<Investor, "cik" | "name" | "slug">[]) {
  const map = new Map<string, { name: string; slug: string }>();
  for (const inv of investors) map.set(inv.cik, { name: inv.name, slug: inv.slug });
  return (cik: string | undefined) => (cik ? map.get(cik) : undefined) ?? null;
}
export type Namer = ReturnType<typeof makeNamer>;

function consensusLabel(buyers: number, sellers: number): string {
  if (buyers + sellers === 0) return "mixed";
  const net = buyers - sellers;
  if (net >= 2) return "strong_buy";
  if (net >= 1) return "buy";
  if (net <= -2) return "strong_sell";
  if (net <= -1) return "sell";
  return "mixed";
}

/** One roster entry: the investor's latest filing plus its move counts. */
export function rosterEntry(
  inv: Investor,
  latest: Filing,
  positions: Pick<Position, "changeType">[],
): RosterEntry {
  const moves = { new: 0, added: 0, reduced: 0, sold: 0 };
  for (const p of positions)
    if (p.changeType in moves) moves[p.changeType as keyof typeof moves]++;
  return {
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
  };
}

export function sortRoster(entries: RosterEntry[]): RosterEntry[] {
  return entries.sort((a, b) => (b.totalValue ?? 0) - (a.totalValue ?? 0));
}

/**
 * Per ticker, how many DISTINCT investors (by cik) are buying (new/added) vs.
 * selling (reduced/sold), so duplicate filings can't inflate the consensus.
 * Returns the bought and sold sides fully ranked.
 */
export function rankConsensus(positions: Position[], namer: Namer) {
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
    else if (p.changeType === "reduced" || p.changeType === "sold") a.sellers.add(p.cik);
  }

  const nameOf = (cik: string) => namer(cik)?.name;
  const names = (s: Set<string>) =>
    [...s].map(nameOf).filter((x): x is string => !!x);
  const rows: ConsensusRow[] = [...byTicker.values()].map((a) => ({
    ticker: a.ticker,
    name: a.name,
    buyers: a.buyers.size,
    sellers: a.sellers.size,
    holders: a.holders.size,
    buyerNames: names(a.buyers),
    sellerNames: names(a.sellers),
    consensus: consensusLabel(a.buyers.size, a.sellers.size),
  }));

  const rank = (mine: (r: ConsensusRow) => number, theirs: (r: ConsensusRow) => number) =>
    rows
      .filter((r) => mine(r) > theirs(r))
      .sort(
        (a, b) =>
          mine(b) - mine(a) ||
          mine(b) - theirs(b) - (mine(a) - theirs(a)) ||
          b.holders - a.holders,
      );
  return {
    bought: rank((r) => r.buyers, (r) => r.sellers),
    sold: rank((r) => r.sellers, (r) => r.buyers),
  };
}

/** Prefer strong-consensus rows (>2 investors on one side), but ALWAYS cap at n. */
export function pickConsensus(ranked: ConsensusRow[], side: "bought" | "sold", n: number) {
  const mine = (r: ConsensusRow) => (side === "bought" ? r.buyers : r.sellers);
  // `ranked` is sorted by `mine` descending, so the strong rows are a prefix.
  const strong = ranked.filter((r) => mine(r) > 2);
  const fill = ranked.filter((r) => mine(r) <= 2);
  return [...strong, ...fill].slice(0, n);
}

/** Keep only what pickConsensus can return for any n <= CONSENSUS_MAX_LIMIT. */
export function trimRankedForSnapshot(ranked: ConsensusRow[], side: "bought" | "sold") {
  const mine = (r: ConsensusRow) => (side === "bought" ? r.buyers : r.sellers);
  const strong = ranked.filter((r) => mine(r) > 2).length;
  return ranked.slice(0, Math.max(strong, CONSENSUS_MAX_LIMIT));
}

/** Biggest individual moves this quarter (new buys, full exits, adds, trims). */
export function notableMoves(positions: Position[], namer: Namer, n: number) {
  const enrich = (p: Position): NotableMove => {
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
  const top = (type: string, sortVal: (p: Position) => number) =>
    positions
      .filter((p) => p.changeType === type && namer(p.cik) !== null)
      .sort((a, b) => sortVal(b) - sortVal(a))
      .slice(0, n)
      .map(enrich);

  return {
    newBuys: top("new", (p) => p.value),
    exits: top("sold", (p) => p.value), // value = prior stake size for exits
    adds: top("added", (p) => p.value),
    trims: top("reduced", (p) => Math.abs(p.changePct ?? 0)),
  };
}

import { z } from "zod";
import axios from "axios";
import { createTRPCRouter, publicProcedure } from "../trpc";
import type {
  FMPPoliticianTrade,
  FMPPoliticianTradeResponse,
  PoliticianTrade,
  PoliticianConsensus,
  PoliticianConsensusRow,
} from "../schema/FMP/FMPPoliticianTrading";

// FMP API client (same instance pattern as assets.ts)
const fmp = axios.create({
  baseURL: "https://financialmodelingprep.com",
  headers: { "Content-Type": "application/json" },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse FMP amount range string ("$1,001 - $15,000") into [min, max]. */
function parseAmountRange(raw: string): [number, number] {
  if (!raw) return [0, 0];
  const cleaned = raw.replace(/[$,\s]/g, "");
  // Handle ranges like "1001-15000"
  const rangeMatch = cleaned.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    return [parseInt(rangeMatch[1]!, 10), parseInt(rangeMatch[2]!, 10)];
  }
  // Handle single values like "15000"
  const single = parseInt(cleaned, 10);
  if (!isNaN(single)) return [single, single];
  // Handle ranges with "Over" e.g. "Over50000000"
  const overMatch = cleaned.match(/^over(\d+)$/i);
  if (overMatch) return [parseInt(overMatch[1]!, 10), Infinity];
  return [0, 0];
}

/** Normalise the FMP `type` field into a canonical trade type. */
function normaliseTradeType(raw: string): PoliticianTrade["tradeType"] {
  const lower = raw.toLowerCase();
  if (lower.includes("purchase") || lower.includes("buy")) return "buy";
  if (lower.includes("sale")) return "sell";
  if (lower.includes("exchange")) return "exchange";
  return "other";
}

/** Extract a clean state abbreviation from the `district` field. */
function parseState(district: string): string {
  if (!district) return "";
  // Senate: "WV" → already a state
  // House: "TX02" → extract "TX"
  const match = district.match(/^([A-Z]{2})/);
  return match ? match[1]! : district;
}

/** Compute disclosure lag in days between transaction and disclosure. */
function disclosureLag(transactionDate: string, disclosureDate: string): number {
  if (!transactionDate || !disclosureDate) return 0;
  const diff = new Date(disclosureDate).getTime() - new Date(transactionDate).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/** Convert an FMP trade row to the normalised PoliticianTrade shape. */
function normalizeTrade(
  raw: FMPPoliticianTrade,
  chamber: "senate" | "house",
): PoliticianTrade {
  const [amountMin, amountMax] = parseAmountRange(raw.amount ?? "");
  return {
    symbol: raw.symbol ?? "",
    politicianId: raw.senateID ?? "",
    politicianName: `${raw.firstName ?? ""} ${raw.lastName ?? ""}`.trim() || (raw.office ?? ""),
    chamber,
    party: null,
    state: parseState(raw.district ?? ""),
    district: raw.district ?? "",
    owner: raw.owner || "Self",
    assetDescription: raw.assetDescription ?? "",
    assetType: raw.assetType ?? "",
    tradeType: normaliseTradeType(raw.type ?? ""),
    amountRange: raw.amount ?? "",
    amountMin,
    amountMax,
    transactionDate: raw.transactionDate ?? "",
    disclosureDate: raw.disclosureDate ?? "",
    disclosureLagDays: disclosureLag(raw.transactionDate ?? "", raw.disclosureDate ?? ""),
    link: raw.link ?? "",
    comment: raw.comment ?? "",
  };
}

/** Fetch recent trades from both Senate + House using the /stable/ endpoints. */
async function fetchAllPoliticianTrades(
  pages = 3,
): Promise<PoliticianTrade[]> {
  const results: PoliticianTrade[] = [];

  // Fetch multiple pages in parallel for each chamber
  const pagePromises: Promise<PoliticianTrade[]>[] = [];
  for (let p = 0; p < pages; p++) {
    const params = { apikey: process.env.FMP_API_KEY!, page: p };

    // Senate trades (latest, no symbol required)
    pagePromises.push(
      fmp
        .get<FMPPoliticianTradeResponse>("/stable/senate-latest", { params })
        .then((res) => (res.data ?? []).map((t) => normalizeTrade(t, "senate")))
        .catch(() => [] as PoliticianTrade[]),
    );

    // House trades (latest, no symbol required)
    pagePromises.push(
      fmp
        .get<FMPPoliticianTradeResponse>("/stable/house-latest", { params })
        .then((res) => (res.data ?? []).map((t) => normalizeTrade(t, "house")))
        .catch(() => [] as PoliticianTrade[]),
    );
  }

  const allPages = await Promise.all(pagePromises);
  for (const page of allPages) results.push(...page);

  // Deduplicate by symbol + politicianId + transactionDate + type
  const seen = new Set<string>();
  return results.filter((t) => {
    const key = `${t.symbol}-${t.politicianId}-${t.transactionDate}-${t.tradeType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Fetch trades for a specific symbol using the /api/v4/ endpoints (symbol required). */
async function fetchTradesBySymbol(
  symbol: string,
  pages = 5,
): Promise<PoliticianTrade[]> {
  const results: PoliticianTrade[] = [];

  const pagePromises: Promise<PoliticianTrade[]>[] = [];
  for (let p = 0; p < pages; p++) {
    const params = { apikey: process.env.FMP_API_KEY!, symbol, page: p };

    pagePromises.push(
      fmp
        .get<FMPPoliticianTradeResponse>("/api/v4/senate-trading", { params })
        .then((res) => (res.data ?? []).map((t) => normalizeTrade(t, "senate")))
        .catch(() => [] as PoliticianTrade[]),
    );

    pagePromises.push(
      fmp
        .get<FMPPoliticianTradeResponse>("/api/v4/house-trading", { params })
        .then((res) => (res.data ?? []).map((t) => normalizeTrade(t, "house")))
        .catch(() => [] as PoliticianTrade[]),
    );
  }

  const allPages = await Promise.all(pagePromises);
  for (const page of allPages) results.push(...page);

  // Deduplicate
  const seen = new Set<string>();
  return results.filter((t) => {
    const key = `${t.symbol}-${t.politicianId}-${t.transactionDate}-${t.tradeType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Build consensus from raw trades: most bought / most sold by distinct politicians. */
function buildConsensus(
  trades: PoliticianTrade[],
  limit = 12,
): PoliticianConsensus {
  const byTicker = new Map<
    string,
    {
      name: string;
      buyers: Set<string>;
      sellers: Set<string>;
      totalTrades: number;
    }
  >();

  for (const t of trades) {
    if (!t.symbol) continue;
    const key = t.symbol;
    if (!byTicker.has(key)) {
      byTicker.set(key, {
        name: t.assetDescription || t.symbol,
        buyers: new Set(),
        sellers: new Set(),
        totalTrades: 0,
      });
    }
    const entry = byTicker.get(key)!;
    entry.totalTrades++;
    if (t.tradeType === "buy") {
      entry.buyers.add(t.politicianName);
    } else if (t.tradeType === "sell") {
      entry.sellers.add(t.politicianName);
    }
  }

  const rows: PoliticianConsensusRow[] = [...byTicker.entries()].map(
    ([ticker, data]) => {
      const buyers = data.buyers.size;
      const sellers = data.sellers.size;
      let consensus: PoliticianConsensusRow["consensus"] = "mixed";
      const net = buyers - sellers;
      if (net >= 2) consensus = "strong_buy";
      else if (net >= 1) consensus = "buy";
      else if (net <= -2) consensus = "strong_sell";
      else if (net <= -1) consensus = "sell";

      return {
        ticker,
        name: data.name,
        buyers,
        sellers,
        buyerNames: [...data.buyers],
        sellerNames: [...data.sellers],
        totalTrades: data.totalTrades,
        consensus,
      };
    },
  );

  const pick = (mine: (r: PoliticianConsensusRow) => number, theirs: (r: PoliticianConsensusRow) => number) => {
    const ranked = rows
      .filter((r) => mine(r) > theirs(r))
      .sort(
        (a, b) =>
          mine(b) - mine(a) ||
          mine(b) - theirs(b) - (mine(a) - theirs(a)) ||
          b.totalTrades - a.totalTrades,
      );
    const strong = ranked.filter((r) => mine(r) > 2);
    return strong.length >= limit ? strong : ranked.slice(0, limit);
  };

  return {
    bought: pick((r) => r.buyers, (r) => r.sellers),
    sold: pick((r) => r.sellers, (r) => r.buyers),
  };
}

// ── Router ───────────────────────────────────────────────────────────────────

export const politicianRouter = createTRPCRouter({
  /**
   * Recent trades from both Senate + House.
   * Fetches the latest N pages from FMP /stable/ endpoints and returns normalised trades.
   */
  recentTrades: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
          pages: z.number().min(1).max(10).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const trades = await fetchAllPoliticianTrades(input?.pages ?? 3);
      // Sort by disclosure date descending
      trades.sort(
        (a, b) =>
          new Date(b.disclosureDate).getTime() - new Date(a.disclosureDate).getTime(),
      );
      return trades.slice(0, input?.limit ?? 50);
    }),

  /**
   * Consensus board: stocks with the most politicians buying vs selling.
   * Aggregates across all fetched trades.
   */
  consensus: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).optional(),
          pages: z.number().min(1).max(10).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const trades = await fetchAllPoliticianTrades(input?.pages ?? 5);
      return buildConsensus(trades, input?.limit ?? 12);
    }),

  /**
   * Trades for a specific stock symbol.
   */
  bySymbol: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        limit: z.number().min(1).max(100).optional(),
      }),
    )
    .query(async ({ input }) => {
      const trades = await fetchTradesBySymbol(input.symbol, 5);
      trades.sort(
        (a, b) =>
          new Date(b.disclosureDate).getTime() - new Date(a.disclosureDate).getTime(),
      );
      return trades.slice(0, input.limit ?? 50);
    }),
});
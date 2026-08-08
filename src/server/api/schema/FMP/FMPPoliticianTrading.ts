/**
 * FMP Senate & House Trading API response shapes.
 * Both endpoints return the same structure — the only difference is
 * `senateID` maps to the politician's BioGuide/committee ID.
 *
 * Endpoints:
 *   /api/v4/senate-trading          — Senator transactions (STOCK Act)
 *   /api/v4/house-trading           — House Representative transactions
 *
 * Optional params: symbol, page (pagination)
 */
export interface FMPPoliticianTrade {
  symbol?: string;
  senateID?: string;
  disclosureDate?: string; // YYYY-MM-DD
  transactionDate?: string; // YYYY-MM-DD
  firstName?: string;
  lastName?: string;
  office?: string;
  district?: string; // state abbreviation (e.g. "WV") or state+district (e.g. "TX02")
  owner?: string; // "Self", "Spouse", "Joint", etc.
  assetDescription?: string;
  assetType?: string; // "Stock", "Bond", etc.
  type?: string; // "Purchase", "Sale", "Sale (Full)", "Exchange", etc.
  amount?: string; // range string e.g. "$1,001 - $15,000"
  capitalGainsOver200USD?: string; // "True" / "False"
  comment?: string;
  link?: string;
}

export type FMPPoliticianTradeResponse = FMPPoliticianTrade[];

/**
 * Normalised trade shape used by the tRPC router and frontend.
 */
export interface PoliticianTrade {
  symbol: string;
  politicianId: string;
  politicianName: string;
  chamber: "senate" | "house";
  party: string | null; // FMP doesn't return party; left for future enrichment
  state: string;
  district: string;
  owner: string;
  assetDescription: string;
  assetType: string;
  tradeType: "buy" | "sell" | "exchange" | "other";
  amountRange: string;
  amountMin: number; // parsed lower bound in USD
  amountMax: number; // parsed upper bound in USD
  transactionDate: string;
  disclosureDate: string;
  disclosureLagDays: number;
  link: string;
  comment: string;
}

/**
 * Consensus row: how many distinct politicians are buying vs selling a ticker.
 */
export interface PoliticianConsensusRow {
  ticker: string;
  name: string;
  buyers: number;
  sellers: number;
  buyerNames: string[];
  sellerNames: string[];
  totalTrades: number;
  consensus: "strong_buy" | "buy" | "mixed" | "sell" | "strong_sell";
}

export interface PoliticianConsensus {
  bought: PoliticianConsensusRow[];
  sold: PoliticianConsensusRow[];
}
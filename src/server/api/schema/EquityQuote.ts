/**
 * Represents real-time and historical market data for an equity
 */
export interface EquityQuoteItem {
  // Company identifiers
  symbol: string;
  name: string;
  exchange: string;

  // Price data
  price: number;
  open: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;

  // Price averages
  priceAvg50: number;
  priceAvg200: number;

  // Change metrics
  change: number;
  changesPercentage: number;

  // Volume metrics
  volume: number;
  avgVolume: number;

  // Valuation metrics
  marketCap: number;
  eps: number;
  pe: number;
  sharesOutstanding: number;

  // Timestamps
  earningsAnnouncement?: string;
  timestamp: number;
}

export type EquityQuoteResponse = EquityQuoteItem[];

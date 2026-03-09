import type GridLayout from "react-grid-layout";

export const DEFAULT_LAYOUT: GridLayout.Layout[] = [
  { i: "main-chart", x: 0, y: 0, w: 14, h: 12 },
  { i: "news", x: 14, y: 0, w: 7, h: 18 },
  { i: "fundamental-pillars", x: 0, y: 12, w: 14, h: 6 },

  { i: "live-quote", x: 0, y: 18, w: 7, h: 16 },
  { i: "ai", x: 7, y: 18, w: 14, h: 16 },

  // Row 1: Income statement
  { i: "eps", x: 0, y: 34, w: 7, h: 14 },
  { i: "revenue", x: 7, y: 34, w: 7, h: 14 },
  { i: "ebitda", x: 14, y: 34, w: 7, h: 14 },

  // Row 2: Income statement cont.
  { i: "net-income", x: 0, y: 48, w: 7, h: 14 },
  { i: "expenses", x: 7, y: 48, w: 7, h: 14 },
  { i: "balance-growth", x: 14, y: 48, w: 7, h: 14 },

  // Row 3: Cash flow & capital
  { i: "cash-growth", x: 0, y: 62, w: 7, h: 14 },
  { i: "cash-debt", x: 7, y: 62, w: 7, h: 14 },
  { i: "dividends", x: 14, y: 62, w: 7, h: 14 },

  // Row 4: Structure & valuation
  { i: "shares-outstanding", x: 0, y: 76, w: 7, h: 14 },
  { i: "valuation", x: 7, y: 76, w: 7, h: 14 },
  { i: "margin-trends", x: 14, y: 76, w: 7, h: 14 },

  // Row 5: Competitive & Risk analysis
  { i: "stock-peers", x: 0, y: 90, w: 7, h: 22 },
  { i: "analyst-ratings", x: 7, y: 90, w: 7, h: 22 },
  { i: "insider-trading", x: 14, y: 90, w: 7, h: 22 },
];

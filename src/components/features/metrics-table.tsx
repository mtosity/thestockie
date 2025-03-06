"use client";

import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

// Metric categories and their associated fields
const metricCategories: Record<
  string,
  { key: string; label: string; format?: string }[]
> = {
  "Market & Size": [
    { key: "market_cap", label: "Market Cap", format: "currency" },
    { key: "enterprise_value", label: "Enterprise Value", format: "currency" },
    { key: "dividend_yield", label: "Dividend Yield", format: "percentage" },
  ],
  Valuation: [
    { key: "pe_ratio", label: "P/E Ratio" },
    { key: "price_to_sales", label: "P/S Ratio" },
    { key: "price_to_book", label: "P/B Ratio" },
    { key: "price_to_tangible_book", label: "P/TB Ratio" },
    { key: "price_to_operating_cash_flow", label: "P/OCF" },
    { key: "price_to_free_cash_flow", label: "P/FCF" },
    { key: "ev_to_sales", label: "EV/Sales" },
    { key: "ev_to_ebitda", label: "EV/EBITDA" },
    { key: "ev_to_operating_cash_flow", label: "EV/OCF" },
    { key: "ev_to_free_cash_flow", label: "EV/FCF" },
    { key: "earnings_yield", label: "Earnings Yield", format: "percentage" },
    { key: "graham_number", label: "Graham Number", format: "currency" },
    { key: "graham_net_net", label: "Graham Net-Net", format: "currency" },
  ],
  "Per Share": [
    { key: "revenue_per_share", label: "Revenue/Share", format: "currency" },
    { key: "net_income_per_share", label: "EPS", format: "currency" },
    {
      key: "book_value_per_share",
      label: "Book Value/Share",
      format: "currency",
    },
    {
      key: "tangible_book_value_per_share",
      label: "Tangible Book/Share",
      format: "currency",
    },
    {
      key: "operating_cash_flow_per_share",
      label: "OCF/Share",
      format: "currency",
    },
    { key: "free_cash_flow_per_share", label: "FCF/Share", format: "currency" },
    { key: "cash_per_share", label: "Cash/Share", format: "currency" },
    { key: "capex_per_share", label: "Capex/Share", format: "currency" },
    {
      key: "shareholders_equity_per_share",
      label: "Equity/Share",
      format: "currency",
    },
    { key: "interest_debt_per_share", label: "Debt/Share", format: "currency" },
  ],
  Efficiency: [
    { key: "days_sales_outstanding", label: "DSO" },
    { key: "days_payables_outstanding", label: "DPO" },
    { key: "days_of_inventory_on_hand", label: "DIO" },
    { key: "receivables_turnover", label: "Receivables Turnover" },
    { key: "payables_turnover", label: "Payables Turnover" },
    { key: "inventory_turnover", label: "Inventory Turnover" },
  ],
  Profitability: [
    { key: "return_on_equity", label: "ROE", format: "percentage" },
    { key: "return_on_invested_capital", label: "ROIC", format: "percentage" },
    { key: "return_on_tangible_assets", label: "ROTA", format: "percentage" },
    { key: "income_quality", label: "Income Quality" },
    { key: "payout_ratio", label: "Payout Ratio", format: "percentage" },
  ],
  "Liquidity & Solvency": [
    { key: "current_ratio", label: "Current Ratio" },
    { key: "debt_to_equity", label: "Debt/Equity" },
    { key: "debt_to_assets", label: "Debt/Assets" },
    { key: "debt_to_market_cap", label: "Debt/Market Cap" },
    { key: "net_debt_to_ebitda", label: "Net Debt/EBITDA" },
    { key: "interest_coverage", label: "Interest Coverage" },
  ],
  "Cash Flow": [
    { key: "capex_to_operating_cash_flow", label: "Capex/OCF" },
    { key: "capex_to_revenue", label: "Capex/Revenue" },
    { key: "capex_to_depreciation", label: "Capex/Depreciation" },
    { key: "free_cash_flow_yield", label: "FCF Yield", format: "percentage" },
  ],
  Operating: [
    {
      key: "sales_general_and_administrative_to_revenue",
      label: "SG&A/Revenue",
      format: "percentage",
    },
    {
      key: "research_and_development_to_revenue",
      label: "R&D/Revenue",
      format: "percentage",
    },
    {
      key: "stock_based_compensation_to_revenue",
      label: "Stock Comp/Revenue",
      format: "percentage",
    },
  ],
  Asset: [
    { key: "working_capital", label: "Working Capital", format: "currency" },
    {
      key: "tangible_asset_value",
      label: "Tangible Asset Value",
      format: "currency",
    },
    {
      key: "net_current_asset_value",
      label: "Net Current Asset Value",
      format: "currency",
    },
    { key: "invested_capital", label: "Invested Capital", format: "currency" },
    {
      key: "intangibles_to_total_assets",
      label: "Intangibles/Assets",
      format: "percentage",
    },
  ],
};

const formatLargeNumber = (num: number): string => {
  const absNum = Math.abs(num);

  if (absNum >= 1e12) {
    return `${(num / 1e12).toFixed(2)}T`;
  } else if (absNum >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  } else if (absNum >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  } else if (absNum >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`;
  }
  return num.toFixed(2);
};

const formatValue = (value: number | null | undefined, format?: string) => {
  if (value === null || value === undefined) return "N/A";

  switch (format) {
    case "percentage":
      return `${(value * 100).toFixed(2)}%`;
    case "currency":
      return `$${formatLargeNumber(value)}`;
    default:
      return value.toFixed(2);
  }
};

export const MetricsTable = () => {
  const [symbol] = useSymbol();
  const { data, isLoading } = api.asset.equityFundamentalMetrics.useQuery(
    symbol ?? "",
    {
      enabled: !!symbol,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  if (isLoading) {
    return (
      <div className="h-full w-full animate-pulse space-y-4 p-4">
        <div className="h-8 w-48 rounded bg-gray-700" />
        <div className="h-64 rounded bg-gray-700" />
      </div>
    );
  }

  if (!data?.results?.length) {
    return <div>No metrics data available</div>;
  }

  const sortedResults = [...data.results].sort(
    (a, b) =>
      new Date(b.period_ending).getTime() - new Date(a.period_ending).getTime(),
  );

  const formatQuarter = (date: string) => {
    const d = new Date(date);
    return `Q${Math.floor((d.getMonth() + 3) / 3)} ${d.getFullYear()}`;
  };

  return (
    <div className="w-full overflow-x-auto px-2 py-4">
      <div className="overflow-x-auto">
        {Object.entries(metricCategories).map(([category, metrics]) => (
          <div key={category} className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-gray-200">
              {category} Metrics (TTM)
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-20 min-w-[150px] bg-[#15162c]">
                    Metric
                  </TableHead>
                  {sortedResults.map((result) => (
                    <TableHead
                      key={result.period_ending}
                      className="min-w-[100px]"
                    >
                      {formatQuarter(result.period_ending)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric) => (
                  <TableRow key={metric.key}>
                    <TableCell className="sticky left-0 z-20 bg-[#15162c] font-medium">
                      {metric.label}
                    </TableCell>
                    {sortedResults.map((result) => (
                      <TableCell key={result.period_ending}>
                        {formatValue(
                          result[metric.key as keyof typeof result] as number,
                          metric.format,
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    </div>
  );
};

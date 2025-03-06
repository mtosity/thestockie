interface FundamentalMetric {
  symbol: string;
  market_cap: number;
  pe_ratio: number;
  period_ending: string;
  fiscal_period: string;
  calendar_year: number;
  revenue_per_share: number;
  capex_per_share: number;
  net_income_per_share: number;
  operating_cash_flow_per_share: number;
  free_cash_flow_per_share: number;
  cash_per_share: number;
  book_value_per_share: number;
  tangible_book_value_per_share: number;
  shareholders_equity_per_share: number;
  interest_debt_per_share: number;
  price_to_sales: number;
  price_to_operating_cash_flow: number;
  price_to_free_cash_flow: number;
  price_to_book: number;
  price_to_tangible_book: number;
  ev_to_sales: number;
  ev_to_ebitda: number;
  ev_to_operating_cash_flow: number;
  ev_to_free_cash_flow: number;
  earnings_yield: number;
  free_cash_flow_yield: number;
  debt_to_market_cap?: number;
  debt_to_equity: number;
  debt_to_assets: number;
  net_debt_to_ebitda: number;
  current_ratio: number;
  interest_coverage: number;
  income_quality: number;
  payout_ratio: number;
  sales_general_and_administrative_to_revenue: number;
  research_and_development_to_revenue: number;
  intangibles_to_total_assets: number;
  capex_to_operating_cash_flow: number;
  capex_to_revenue: number;
  capex_to_depreciation: number;
  stock_based_compensation_to_revenue: number;
  working_capital: number;
  tangible_asset_value: number;
  net_current_asset_value: number;
  enterprise_value: number;
  invested_capital: number;
  average_receivables: number;
  average_payables: number;
  average_inventory: number;
  days_sales_outstanding: number;
  days_payables_outstanding: number;
  days_of_inventory_on_hand: number;
  receivables_turnover: number;
  payables_turnover: number;
  inventory_turnover: number;
  return_on_equity: number;
  return_on_invested_capital: number;
  return_on_tangible_assets: number;
  dividend_yield: number;
  graham_number: number;
  graham_net_net: number;
}

interface MetadataArguments {
  provider_choices: {
    provider: string;
  };
  standard_params: {
    symbol: string;
    limit: number;
  };
  extra_params: {
    period: string;
    with_ttm: boolean;
  };
}

interface Metadata {
  arguments: MetadataArguments;
  duration: number;
  route: string;
  timestamp: string;
}

interface Extra {
  metadata: Metadata;
}

export interface EquityFundamentalMetricsResponse {
  results: FundamentalMetric[];
  provider: string;
  warnings: null | string[];
  chart: null;
  extra: Extra;
}

export interface EquityFundamentalsMultipleResponse {
  results: FundamentalMultiple[];
  provider: string;
  warnings: unknown;
  chart: unknown;
  extra: Extra;
}

interface FundamentalMultiple {
  symbol: string;
  revenue_per_share_ttm: number;
  net_income_per_share_ttm: number;
  operating_cash_flow_per_share_ttm: number;
  free_cash_flow_per_share_ttm: number;
  cash_per_share_ttm: number;
  book_value_per_share_ttm: number;
  tangible_book_value_per_share_ttm: number;
  shareholders_equity_per_share_ttm: number;
  interest_debt_per_share_ttm: number;
  market_cap_ttm: number;
  enterprise_value_ttm: number;
  pe_ratio_ttm: number;
  price_to_sales_ratio_ttm: number;
  pocf_ratio_ttm: number;
  pfcf_ratio_ttm: number;
  pb_ratio_ttm: number;
  ptb_ratio_ttm: number;
  ev_to_sales_ttm: number;
  enterprise_value_over_ebitda_ttm: number;
  ev_to_operating_cash_flow_ttm: number;
  ev_to_free_cash_flow_ttm: number;
  earnings_yield_ttm: number;
  free_cash_flow_yield_ttm: number;
  debt_to_equity_ttm: number;
  debt_to_assets_ttm: number;
  net_debt_to_ebitda_ttm: number;
  current_ratio_ttm: number;
  interest_coverage_ttm: number;
  income_quality_ttm: number;
  dividend_yield_ttm: number;
  dividend_yield_percentage_ttm: number;
  dividend_to_market_cap_ttm: number;
  dividend_per_share_ttm: number;
  payout_ratio_ttm: number;
  sales_general_and_administrative_to_revenue_ttm: number;
  research_and_development_to_revenue_ttm: number;
  intangibles_to_total_assets_ttm: number;
  capex_to_operating_cash_flow_ttm: number;
  capex_to_revenue_ttm: number;
  capex_to_depreciation_ttm: number;
  stock_based_compensation_to_revenue_ttm: number;
  graham_number_ttm: number;
  roic_ttm: number;
  return_on_tangible_assets_ttm: number;
  graham_net_net_ttm: number;
  working_capital_ttm: number;
  tangible_asset_value_ttm: number;
  net_current_asset_value_ttm: number;
  invested_capital_ttm: number;
  average_receivables_ttm: number;
  average_payables_ttm: number;
  average_inventory_ttm: number;
  days_sales_outstanding_ttm: number;
  days_payables_outstanding_ttm: number;
  days_of_inventory_on_hand_ttm: number;
  receivables_turnover_ttm: number;
  payables_turnover_ttm: number;
  inventory_turnover_ttm: number;
  roe_ttm: number;
  capex_per_share_ttm: number;
}

interface Extra {
  metadata: Metadata;
}

interface Metadata {
  arguments: Arguments;
  duration: number;
  route: string;
  timestamp: string;
}

interface Arguments {
  provider_choices: ProviderChoices;
  standard_params: StandardParams;
  extra_params: Record<string, never>;
}

interface ProviderChoices {
  provider: string;
}

interface StandardParams {
  symbol: string;
}

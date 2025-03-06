interface CashResult {
  link: string;
  final_link: string;
  // Period identifiers
  period_ending: string;
  fiscal_period: string;
  fiscal_year: number;
  symbol: string;

  // Cash flow metrics
  net_income: number;
  depreciation_and_amortization: number;
  deferred_income_tax: number;
  stock_based_compensation: number;

  // Working capital metrics
  change_in_working_capital: number;
  account_receivables: number;
  inventory: number;
  account_payable: number;
  other_working_capital: number;
  other_non_cash_items: number;

  // Operating activities
  net_cash_from_operating_activities: number;
  operating_cash_flow: number;

  // Investing activities
  purchase_of_property_plant_and_equipment: number;
  acquisitions: number;
  purchase_of_investment_securities: number;
  sale_and_maturity_of_investments: number;
  other_investing_activities: number;
  net_cash_from_investing_activities: number;
  capital_expenditure: number;

  // Financing activities
  repayment_of_debt: number;
  common_stock_issued: number;
  common_stock_repurchased: number;
  dividends_paid: number;
  other_financing_activities: number;
  growthNetCashUsedProvidedByFinancingActivities: number;

  // Cash positions
  effect_of_exchange_rate_changes_on_cash: number;
  net_change_in_cash_and_equivalents: number;
  cash_at_beginning_of_period: number;
  cash_at_end_of_period: number;
  free_cash_flow: number;
}

interface MetadataArgs {
  provider_choices: {
    provider: string;
  };
  standard_params: {
    symbol: string;
    limit: number;
  };
  extra_params: {
    period: string;
  };
}

interface Metadata {
  arguments: MetadataArgs;
  duration: number;
  route: string;
  timestamp: string;
}

export interface EquityFundamentalCashResponse {
  results: CashResult[];
  provider: string;
  warnings: null;
  chart: null;
  extra: {
    metadata: Metadata;
  };
}

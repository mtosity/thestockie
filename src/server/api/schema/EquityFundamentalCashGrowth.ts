interface CashGrowthResult {
  // Period identifiers
  period_ending: string;
  fiscal_period: string;
  fiscal_year: number;
  symbol: string;

  // Cash flow metrics
  growth_net_income: number;
  growth_depreciation_and_amortization: number;
  growth_deferred_income_tax: number;
  growth_stock_based_compensation: number;

  // Working capital metrics
  growth_change_in_working_capital: number;
  growth_account_receivables: number;
  growth_inventory: number;
  growth_account_payable: number;
  growth_other_working_capital: number;
  growth_other_non_cash_items: number;

  // Operating activities
  growth_net_cash_from_operating_activities: number;
  growth_operating_cash_flow: number;

  // Investing activities
  growth_purchase_of_property_plant_and_equipment: number;
  growth_acquisitions: number;
  growth_purchase_of_investment_securities: number;
  growth_sale_and_maturity_of_investments: number;
  growth_other_investing_activities: number;
  growth_net_cash_from_investing_activities: number;
  growth_capital_expenditure: number;

  // Financing activities
  growth_repayment_of_debt: number;
  growth_common_stock_issued: number;
  growth_common_stock_repurchased: number;
  growth_dividends_paid: number;
  growth_other_financing_activities: number;
  growthNetCashUsedProvidedByFinancingActivities: number;

  // Cash positions
  growth_effect_of_exchange_rate_changes_on_cash: number;
  growth_net_change_in_cash_and_equivalents: number;
  growth_cash_at_beginning_of_period: number;
  growth_cash_at_end_of_period: number;
  growth_free_cash_flow: number;
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

export interface EquityFundamentalCashGrowthResponse {
  results: CashGrowthResult[];
  provider: string;
  warnings: null;
  chart: null;
  extra: {
    metadata: Metadata;
  };
}

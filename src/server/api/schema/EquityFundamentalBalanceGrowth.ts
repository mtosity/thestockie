export interface EquityFundamentalBalanceGrowthResponse {
  results: BalanceGrowthData[];
  provider: string;
  warnings: null;
  chart: null;
  extra: {
    metadata: Metadata;
  };
}

interface ProviderChoices {
  provider: string;
}

interface StandardParams {
  symbol: string;
  limit: number;
}

interface ExtraParams {
  period: string;
}

interface Metadata {
  arguments: {
    provider_choices: ProviderChoices;
    standard_params: StandardParams;
    extra_params: ExtraParams;
  };
  duration: number;
  route: string;
  timestamp: string;
}

interface BalanceGrowthData {
  period_ending: string;
  fiscal_period: string;
  fiscal_year: number;
  symbol: string;
  growth_cash_and_cash_equivalents: number | null;
  growth_short_term_investments: number | null;
  growth_cash_and_short_term_investments: number | null;
  growth_net_receivables: number | null;
  growth_inventory: number | null;
  growth_other_current_assets: number | null;
  growth_total_current_assets: number | null;
  growth_property_plant_equipment_net: number | null;
  growth_goodwill: number | null;
  growth_intangible_assets: number | null;
  growth_goodwill_and_intangible_assets: number | null;
  growth_long_term_investments: number | null;
  growth_tax_assets: number | null;
  growth_other_non_current_assets: number | null;
  growth_total_non_current_assets: number | null;
  growth_other_assets: number | null;
  growth_total_assets: number | null;
  growth_account_payables: number | null;
  growth_short_term_debt: number | null;
  growth_tax_payables: number | null;
  growth_deferred_revenue: number | null;
  growth_other_current_liabilities: number | null;
  growth_total_current_liabilities: number | null;
  growth_long_term_debt: number | null;
  growth_deferred_revenue_non_current: number | null;
  growth_deferrred_tax_liabilities_non_current: number | null;
  growth_other_non_current_liabilities: number | null;
  growth_total_non_current_liabilities: number | null;
  growth_other_liabilities: number | null;
  growth_total_liabilities: number | null;
  growth_common_stock: number | null;
  growth_retained_earnings: number | null;
  growth_accumulated_other_comprehensive_income: number | null;
  growth_total_shareholders_equity: number | null;
  growth_total_liabilities_and_shareholders_equity: number | null;
  growth_total_investments: number | null;
  growth_total_debt: number | null;
  growth_net_debt: number | null;
  growthOthertotalStockholdersEquity: number | null;
}

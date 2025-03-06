export interface EquityFundamentalBalanceResponse {
  results: BalanceData[];
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

interface BalanceData {
  link: string;
  final_link: string;
  period_ending: string;
  fiscal_period: string;
  fiscal_year: number;
  symbol: string;
  cash_and_cash_equivalents: number | null;
  short_term_investments: number | null;
  cash_and_short_term_investments: number | null;
  net_receivables: number | null;
  inventory: number | null;
  other_current_assets: number | null;
  total_current_assets: number | null;
  property_plant_equipment_net: number | null;
  goodwill: number | null;
  intangible_assets: number | null;
  goodwill_and_intangible_assets: number | null;
  long_term_investments: number | null;
  tax_assets: number | null;
  other_non_current_assets: number | null;
  total_non_current_assets: number | null;
  other_assets: number | null;
  total_assets: number | null;
  account_payables: number | null;
  short_term_debt: number | null;
  tax_payables: number | null;
  deferred_revenue: number | null;
  other_current_liabilities: number | null;
  total_current_liabilities: number | null;
  long_term_debt: number | null;
  deferred_revenue_non_current: number | null;
  deferrred_tax_liabilities_non_current: number | null;
  other_non_current_liabilities: number | null;
  total_non_current_liabilities: number | null;
  other_liabilities: number | null;
  total_liabilities: number | null;
  common_stock: number | null;
  retained_earnings: number | null;
  accumulated_other_comprehensive_income: number | null;
  total_shareholders_equity: number | null;
  total_liabilities_and_shareholders_equity: number | null;
  total_investments: number | null;
  total_debt: number | null;
  net_debt: number | null;
  growthOthertotalStockholdersEquity: number | null;
}

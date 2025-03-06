export interface EquityScreener {
  results: Result[];
  provider: string;
  warnings: unknown;
  chart: unknown;
  extra: Extra;
}

interface Result {
  symbol: string;
  name: string;
  market_cap: number;
  sector: string;
  industry: string;
  beta: number;
  price: number;
  last_annual_dividend: number;
  volume: number;
  exchange: string;
  exchange_name: string;
  country: string;
  is_etf: boolean;
  actively_trading: boolean;
  isFund: boolean;
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
  standard_params: Record<string, unknown>;
  extra_params: ExtraParams;
}

interface ProviderChoices {
  provider: string;
}

interface ExtraParams {
  metric: string;
  exchange: string;
  index: string;
  sector: string;
  industry: string;
  mktcap: string;
  recommendation: string;
  signal: unknown;
  preset: unknown;
  filters_dict: unknown;
  limit: unknown;
  mktcap_min: number;
  mktcap_max: unknown;
  price_min: unknown;
  price_max: unknown;
  beta_min: unknown;
  beta_max: unknown;
  volume_min: unknown;
  volume_max: unknown;
  dividend_min: unknown;
  dividend_max: unknown;
  is_etf: boolean;
  is_active: boolean;
  country: unknown;
  exsubcategory: string;
  region: string;
}

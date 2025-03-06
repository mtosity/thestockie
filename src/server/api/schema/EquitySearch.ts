export interface EquitySearchResult {
  symbol: string;
  name: string;
  nasdaq_traded: string;
  exchange: string;
  market_category: string;
  etf: string;
  round_lot_size: number;
  test_issue: string;
  financial_status: string;
  cqs_symbol: string | null;
  nasdaq_symbol: string;
  next_shares: string;
}

interface Warning {
  category: string;
  message: string;
}

interface ProviderChoices {
  provider: string;
}

interface StandardParams {
  query: string;
  is_symbol: boolean;
}

interface ExtraParams {
  use_cache: boolean;
  active: boolean;
  limit: number;
  is_etf: boolean;
  is_fund: boolean;
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

export interface EquitySearchResponse {
  results: EquitySearchResult[];
  provider: string;
  warnings: Warning[];
  chart: null;
  extra: {
    metadata: Metadata;
  };
}

export interface EquitySearch {
  results: EquitySearchResult[];
  provider: string;
  warnings: unknown;
  chart: unknown;
  // extra: Extra;
}

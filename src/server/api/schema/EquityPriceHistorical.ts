export interface EquityPriceHistoricalResponse {
  results: Result[];
  provider: string;
  warnings: unknown;
  chart: unknown;
  extra: Extra;
}

interface Result {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  split_ratio: number;
  dividend: number;
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
  extra_params: ExtraParams;
}

interface ProviderChoices {
  provider: string;
}

interface StandardParams {
  symbol: string;
  start_date: unknown;
  end_date: unknown;
}

interface ExtraParams {
  interval: string;
  adjustment: string;
  extended_hours: boolean;
  use_cache: boolean;
  start_time: unknown;
  end_time: unknown;
  timezone: string;
  source: string;
  sort: string;
  limit: number;
  include_actions: boolean;
}

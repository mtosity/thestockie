interface EPSResult {
  date: string;
  symbol: string;
  eps_actual: number | null;
  eps_estimated: number | null;
  revenue_estimated: number | null;
  revenue_actual: number | null;
  reporting_time: string;
  updated_at: string;
  period_ending: string;
}

interface Metadata {
  arguments: {
    provider_choices: {
      provider: string;
    };
    standard_params: {
      symbol: string;
    };
    extra_params: {
      period: string;
      limit: number;
    };
  };
  duration: number;
  route: string;
  timestamp: string;
}

export interface EquityFundamentalHistoricalEPSResponse {
  results: EPSResult[];
  provider: string;
  warnings: null;
  chart: null;
  extra: {
    metadata: Metadata;
  };
}

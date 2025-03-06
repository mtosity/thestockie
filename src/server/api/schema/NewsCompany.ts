export interface NewsCompanyResponse {
  results: NewsItem[];
  provider: string;
  warnings: unknown;
  chart: unknown;
  extra: Extra;
}

interface NewsItem {
  date: string;
  title: string;
  text: string;
  images: NewsImage[];
  url: string;
  symbols: string;
  source: string;
}

interface NewsImage {
  url: string;
  width: string;
  height: string;
  tag: string;
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
  limit: number;
}

interface ExtraParams {
  date: unknown;
  display: string;
  updated_since: unknown;
  published_since: unknown;
  sort: string;
  order: string;
  isin: unknown;
  cusip: unknown;
  channels: unknown;
  topics: unknown;
  authors: unknown;
  content_types: unknown;
  page: number;
  source: unknown;
  sentiment: unknown;
  language: unknown;
  topic: unknown;
  word_count_greater_than: unknown;
  word_count_less_than: unknown;
  is_spam: unknown;
  business_relevance_greater_than: unknown;
  business_relevance_less_than: unknown;
  offset: number;
}

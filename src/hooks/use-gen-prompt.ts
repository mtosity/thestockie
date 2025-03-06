import { api } from "~/trpc/react";
import { useSymbol } from "./use-symbol";
import { jsonToCsv } from "~/lib/jsonToCSV";

export const useGenPrompt = () => {
  const [symbol] = useSymbol();
  const { data: equityQuote } = api.asset.equityQuote.useQuery(symbol);
  const { data: fundamentalMetrics } =
    api.asset.equityFundamentalMetrics.useQuery(symbol ?? "", {
      enabled: !!symbol,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    });
  const { data: news } = api.asset.newsCompany.useQuery(symbol ?? "", {
    enabled: !!symbol,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
  const { data: currentFundamentals } =
    api.asset.equityFundamentalMultiples.useQuery(symbol ?? "", {
      enabled: !!symbol,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    });

  const equityQuoteCSV = jsonToCsv(equityQuote ?? []);
  const fundamentalMetricsCSV = jsonToCsv(fundamentalMetrics?.results ?? []);
  const newsCSV = jsonToCsv(
    news?.results.map((n) => ({
      title: n.title,
      text: n.text,
    })) ?? [],
  );
  const currentFundamentalsCSV = jsonToCsv(currentFundamentals?.results ?? []);

  return `Company: ${symbol} \n
  Equity Quote:
  ${equityQuoteCSV} \n
  Current Fundamentals (TTM):
  ${currentFundamentalsCSV} \n
  Historical Fundamental Metrics:
  ${fundamentalMetricsCSV} \n
  News:
  ${newsCSV} \n
  END
  `;
};

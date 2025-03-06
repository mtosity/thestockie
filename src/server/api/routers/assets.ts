import { type EquityFundamentalBalanceResponse } from "../schema/EquityFundamentalBalance";
import { type EquityFundamentalBalanceGrowthResponse } from "../schema/EquityFundamentalBalanceGrowth";
import { type EquityFundamentalCashResponse } from "../schema/EquityFundamentalCash";
import { type EquityFundamentalHistoricalEPSResponse } from "../schema/EquityFundamentalHistoricalEPSResponse";
import { type EquityFundamentalMetricsResponse } from "../schema/EquityFundamentalMetrics";
import { type EquityFundamentalsMultipleResponse } from "../schema/EquityFundamentalsMultiple";
import { type EquityPriceHistoricalResponse } from "../schema/EquityPriceHistorical";
import { type EquityQuoteResponse } from "../schema/EquityQuote";
import { type EquityScreener } from "../schema/EquityScreener";
import { type EquitySearch } from "../schema/EquitySearch";
import { type FMPHistoricalPriceFull } from "../schema/FMP/FMPHistoricalPriceFull";
import { type NewsCompanyResponse } from "../schema/NewsCompany";
import { createTRPCRouter, publicProcedure } from "../trpc";
import axios from "axios";

const instance = axios.create({
  baseURL: "https://openbb.thestockie.com",
  headers: {
    "Content-Type": "application/json",
    Authorization: process.env.OPENBB_AUTH_TOKEN,
  },
});

const fmp = axios.create({
  baseURL: "https://financialmodelingprep.com",
  headers: {
    "Content-Type": "application/json",
    Authorization: process.env.FMP_API_KEY,
  },
});

export const assetsRouter = createTRPCRouter({
  equityQuote: publicProcedure.input(String).query(async ({ input }) => {
    const res = await fmp.get<EquityQuoteResponse>(`/api/v3/quote/${input}`, {
      params: {
        apikey: process.env.FMP_API_KEY,
      },
    });

    return res?.data;
  }),
  equitySearch: publicProcedure.input(String).query(async ({ input }) => {
    const res = await instance.get<EquitySearch>("/api/v1/equity/search", {
      params: {
        query: input,
        provider: "nasdaq",
        limit: 50,
        is_etf: false,
        is_symbol: true,
      },
    });

    return res?.data;
  }),
  equityScreener: publicProcedure.query(async ({}) => {
    const res = await instance.get<EquityScreener>("/api/v1/equity/screener", {
      params: {
        provider: "fmp",
        metric: "overview",
        exchange: "nasdaq",
        index: "sp500",
        sector: "all",
        industry: "all",
        mktcap: "all",
        recommendation: "all",
        mktcap_min: 500000000,
        is_etf: false,
        is_active: true,
        exsubcategory: "all",
        region: "all",
        country: "US",
      },
    });

    return res?.data;
  }),
  equityPriceHistoricalFMP: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await fmp.get<FMPHistoricalPriceFull>(
        `/api/v3/historical-price-full/${input}`,
        {
          params: {
            apikey: process.env.FMP_API_KEY,
          },
        },
      );

      return res?.data;
    }),
  equityPriceHistorical: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const today = new Date(Date.now()).toISOString().split("T")[0];

      const res = await instance.get<EquityPriceHistoricalResponse>(
        `/api/v1/equity/price/historical`,
        {
          params: {
            symbol: input,
            chart: false,
            provider: "cboe",
            interval: "1m",
            end_date: today,
            extended_hours: false,
            use_cache: true,
            timezone: "America/New_York",
            source: "realtime",
            sort: "asc",
            limit: 252,
          },
        },
      );

      return res?.data;
    }),
  equityFundamentalMultiples: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await instance.get<EquityFundamentalsMultipleResponse>(
        `/api/v1/equity/fundamental/multiples`,
        {
          params: {
            symbol: input,
            provider: "fmp",
          },
        },
      );

      return res?.data;
    }),
  equityFundamentalBalanceGrowth: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await instance.get<EquityFundamentalBalanceGrowthResponse>(
        `/api/v1/equity/fundamental/balance_growth`,
        {
          params: {
            symbol: input,
            provider: "fmp",
            limit: "12",
            period: "quarter",
          },
        },
      );

      return res?.data;
    }),
  equityFundamentalBalance: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await instance.get<EquityFundamentalBalanceResponse>(
        `/api/v1/equity/fundamental/balance`,
        {
          params: {
            symbol: input,
            provider: "fmp",
            limit: "12",
            period: "quarter",
          },
        },
      );

      return res?.data;
    }),
  equityFundamentalCashGrowth: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await instance.get<EquityFundamentalCashResponse>(
        `/api/v1/equity/fundamental/cash_growth`,
        {
          params: {
            symbol: input,
            provider: "fmp",
            limit: "12",
            period: "quarter",
          },
        },
      );

      return res?.data;
    }),
  equityFundamentalCash: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await instance.get<EquityFundamentalBalanceResponse>(
        `/api/v1/equity/fundamental/cash`,
        {
          params: {
            symbol: input,
            provider: "fmp",
            limit: "12",
            period: "quarter",
          },
        },
      );

      return res?.data;
    }),
  equityFundamentalHistoricalEPS: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await instance.get<EquityFundamentalHistoricalEPSResponse>(
        `/api/v1/equity/fundamental/historical_eps`,
        {
          params: {
            symbol: input,
            provider: "fmp",
            limit: "12",
            period: "quarter",
          },
        },
      );

      return res?.data;
    }),

  newsCompany: publicProcedure.input(String).query(async ({ input }) => {
    const res = await instance.get<NewsCompanyResponse>(
      `/api/v1/news/company`,
      {
        params: {
          symbol: input,
          provider: "fmp",
          limit: 20,
          display: "full",
          sort: "created",
          order: "desc",
          page: 0,
          offset: 0,
        },
      },
    );

    return res?.data;
  }),
  equityFundamentalMetrics: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await instance.get<EquityFundamentalMetricsResponse>(
        `/api/v1/equity/fundamental/metrics`,
        {
          params: {
            provider: "fmp",
            symbol: input,
            limit: 12,
            period: "quarter",
            with_ttm: true,
          },
        },
      );

      return res?.data;
    }),
});

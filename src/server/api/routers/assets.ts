import { type EquityFundamentalBalanceResponse } from "../schema/EquityFundamentalBalance";
import { type EquityFundamentalBalanceGrowthResponse } from "../schema/EquityFundamentalBalanceGrowth";
import { type EquityFundamentalCashResponse } from "../schema/EquityFundamentalCash";
import { type EquityFundamentalCashGrowthResponse } from "../schema/EquityFundamentalCashGrowth";
import { type EquityFundamentalHistoricalEPSResponse } from "../schema/EquityFundamentalHistoricalEPSResponse";
import { type EquityFundamentalMetricsResponse } from "../schema/EquityFundamentalMetrics";
import { type EquityFundamentalsMultipleResponse } from "../schema/EquityFundamentalsMultiple";
import { type EquityPriceHistoricalResponse } from "../schema/EquityPriceHistorical";
import { type EquityQuoteResponse } from "../schema/EquityQuote";
import { type EquityScreener } from "../schema/EquityScreener";
import { type EquitySearch } from "../schema/EquitySearch";
import { type FMPHistoricalPriceFull } from "../schema/FMP/FMPHistoricalPriceFull";
import { type FMPSearchResponse } from "../schema/FMP/FMPSearch";
import { type FMPStockScreenerResponse } from "../schema/FMP/FMPStockScreener";
import { type FMPHistoricalChartResponse } from "../schema/FMP/FMPHistoricalChart";
import { type FMPRatiosTTMResponse } from "../schema/FMP/FMPRatiosTTM";
import { type FMPBalanceSheetResponse } from "../schema/FMP/FMPBalanceSheet";
import { type FMPBalanceSheetGrowthResponse } from "../schema/FMP/FMPBalanceSheetGrowth";
import { type FMPCashFlowResponse } from "../schema/FMP/FMPCashFlow";
import { type FMPCashFlowGrowthResponse } from "../schema/FMP/FMPCashFlowGrowth";
import { type FMPEarningsResponse } from "../schema/FMP/FMPEarnings";
import { type FMPKeyMetricsResponse } from "../schema/FMP/FMPKeyMetrics";
import { type FMPStockNewsResponse } from "../schema/FMP/FMPStockNews";
import { type NewsCompanyResponse } from "../schema/NewsCompany";
import { createTRPCRouter, publicProcedure } from "../trpc";
import axios from "axios";

// FMP API client
const fmp = axios.create({
  baseURL: "https://financialmodelingprep.com",
  headers: {
    "Content-Type": "application/json",
  },
});

// Log FMP API key status on startup (only first 4 chars for security)
const apiKey = process.env.FMP_API_KEY;
console.log("[FMP] API Key configured:", apiKey ? `${apiKey.substring(0, 4)}...` : "NOT SET");


export const assetsRouter = createTRPCRouter({
  // Already using FMP - no changes needed
  equityQuote: publicProcedure.input(String).query(async ({ input }) => {
    try {
      console.log("[equityQuote] Input:", input);
      console.log("[equityQuote] API Key:", process.env.FMP_API_KEY ? "SET" : "NOT SET");
      const res = await fmp.get<EquityQuoteResponse>(`/api/v3/quote/${input}`, {
        params: {
          apikey: process.env.FMP_API_KEY,
        },
      });
      console.log("[equityQuote] Response status:", res.status);
      console.log("[equityQuote] Response data length:", res?.data?.length);
      return res?.data;
    } catch (error) {
      console.error("[equityQuote] Error:", error);
      throw error;
    }
  }),

  // Migrate from OpenBB to FMP
  equitySearch: publicProcedure.input(String).query(async ({ input }) => {
    console.log("[equitySearch] Input:", input);
    const res = await fmp.get<FMPSearchResponse>(`/api/v3/search`, {
      params: {
        query: input,
        limit: 50,
        apikey: process.env.FMP_API_KEY,
      },
    });
    console.log("[equitySearch] Response length:", res?.data?.length);

    // Transform FMP response to match existing EquitySearch interface
    const transformedResults = res?.data?.map((r) => ({
      symbol: r.symbol,
      name: r.name,
      nasdaq_traded: "Y",
      exchange: r.exchangeShortName ?? "",
      market_category: "",
      etf: "N", // FMP search doesn't have ETF indicator, default to non-ETF
      round_lot_size: 100,
      test_issue: "N",
      financial_status: "",
      cqs_symbol: null,
      nasdaq_symbol: r.symbol,
      next_shares: "",
    }));

    return {
      results: transformedResults ?? [],
      provider: "fmp",
      warnings: null,
      chart: null,
    } as EquitySearch;
  }),

  // Migrate from OpenBB to FMP
  equityScreener: publicProcedure.query(async () => {
    const res = await fmp.get<FMPStockScreenerResponse>(
      `/api/v3/stock-screener`,
      {
        params: {
          marketCapMoreThan: 500000000,
          isEtf: false,
          isActivelyTrading: true,
          country: "US",
          exchange: "nasdaq",
          limit: 500,
          apikey: process.env.FMP_API_KEY,
        },
      },
    );

    // Transform FMP response to match existing EquityScreener interface
    const transformedResults = res?.data?.map((r) => ({
      symbol: r.symbol,
      name: r.companyName,
      market_cap: r.marketCap,
      sector: r.sector ?? "",
      industry: r.industry ?? "",
      beta: r.beta ?? 0,
      price: r.price ?? 0,
      last_annual_dividend: r.lastAnnualDividend ?? 0,
      volume: r.volume ?? 0,
      exchange: r.exchange ?? "",
      exchange_name: r.exchangeShortName ?? "",
      country: r.country ?? "",
      is_etf: r.isEtf ?? false,
      actively_trading: r.isActivelyTrading ?? true,
      isFund: r.isFund ?? false,
    }));

    return {
      results: transformedResults ?? [],
      provider: "fmp",
      warnings: null,
      chart: null,
      extra: { metadata: {} },
    } as EquityScreener;
  }),

  // Already using FMP - no changes needed
  equityPriceHistoricalFMP: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      try {
        console.log("[equityPriceHistoricalFMP] Input:", input);
        const res = await fmp.get<FMPHistoricalPriceFull>(
          `/api/v3/historical-price-full/${input}`,
          {
            params: {
              apikey: process.env.FMP_API_KEY,
            },
          },
        );
        console.log("[equityPriceHistoricalFMP] Response status:", res.status);
        console.log("[equityPriceHistoricalFMP] Historical length:", res?.data?.historical?.length);
        return res?.data;
      } catch (error) {
        console.error("[equityPriceHistoricalFMP] Error:", error);
        throw error;
      }
    }),

  // Migrate from OpenBB to FMP - intraday 1min chart
  equityPriceHistorical: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await fmp.get<FMPHistoricalChartResponse>(
        `/api/v3/historical-chart/1min/${input}`,
        {
          params: {
            apikey: process.env.FMP_API_KEY,
          },
        },
      );

      // Transform FMP response to match existing EquityPriceHistoricalResponse interface
      const transformedResults = res?.data?.map((r) => ({
        date: r.date,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
        split_ratio: 0,
        dividend: 0,
      }));

      return {
        results: transformedResults ?? [],
        provider: "fmp",
        warnings: null,
        chart: null,
        extra: { metadata: {} },
      } as EquityPriceHistoricalResponse;
    }),

  // Migrate from OpenBB to FMP - ratios TTM
  equityFundamentalMultiples: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await fmp.get<FMPRatiosTTMResponse>(
        `/api/v3/ratios-ttm/${input}`,
        {
          params: {
            apikey: process.env.FMP_API_KEY,
          },
        },
      );

      // Transform FMP response to match existing EquityFundamentalsMultipleResponse interface
      const fmpData = res?.data?.[0];
      const transformedResults = fmpData
        ? [
            {
              symbol: input,
              revenue_per_share_ttm: 0,
              net_income_per_share_ttm: 0,
              operating_cash_flow_per_share_ttm:
                fmpData.operatingCashFlowPerShareTTM ?? 0,
              free_cash_flow_per_share_ttm:
                fmpData.freeCashFlowPerShareTTM ?? 0,
              cash_per_share_ttm: fmpData.cashPerShareTTM ?? 0,
              book_value_per_share_ttm: 0,
              tangible_book_value_per_share_ttm: 0,
              shareholders_equity_per_share_ttm: 0,
              interest_debt_per_share_ttm: 0,
              market_cap_ttm: 0,
              enterprise_value_ttm: 0,
              pe_ratio_ttm: fmpData.peRatioTTM ?? 0,
              price_to_sales_ratio_ttm: fmpData.priceToSalesRatioTTM ?? 0,
              pocf_ratio_ttm: fmpData.priceToOperatingCashFlowsRatioTTM ?? 0,
              pfcf_ratio_ttm: fmpData.priceToFreeCashFlowsRatioTTM ?? 0,
              pb_ratio_ttm: fmpData.priceBookValueRatioTTM ?? 0,
              ptb_ratio_ttm: fmpData.priceToBookRatioTTM ?? 0,
              ev_to_sales_ttm: 0,
              enterprise_value_over_ebitda_ttm:
                fmpData.enterpriseValueMultipleTTM ?? 0,
              ev_to_operating_cash_flow_ttm: 0,
              ev_to_free_cash_flow_ttm: 0,
              earnings_yield_ttm: 0,
              free_cash_flow_yield_ttm: 0,
              debt_to_equity_ttm: fmpData.debtEquityRatioTTM ?? 0,
              debt_to_assets_ttm: fmpData.debtRatioTTM ?? 0,
              net_debt_to_ebitda_ttm: 0,
              current_ratio_ttm: fmpData.currentRatioTTM ?? 0,
              interest_coverage_ttm: fmpData.interestCoverageTTM ?? 0,
              income_quality_ttm: 0,
              dividend_yield_ttm: fmpData.dividendYieldTTM ?? 0,
              dividend_yield_percentage_ttm:
                fmpData.dividendYielPercentageTTM ?? 0,
              dividend_to_market_cap_ttm: 0,
              dividend_per_share_ttm: fmpData.dividendPerShareTTM ?? 0,
              payout_ratio_ttm: fmpData.payoutRatioTTM ?? 0,
              sales_general_and_administrative_to_revenue_ttm: 0,
              research_and_development_to_revenue_ttm: 0,
              intangibles_to_total_assets_ttm: 0,
              capex_to_operating_cash_flow_ttm: 0,
              capex_to_revenue_ttm: 0,
              capex_to_depreciation_ttm: 0,
              stock_based_compensation_to_revenue_ttm: 0,
              graham_number_ttm: 0,
              roic_ttm: 0,
              return_on_tangible_assets_ttm: fmpData.returnOnAssetsTTM ?? 0,
              graham_net_net_ttm: 0,
              working_capital_ttm: 0,
              tangible_asset_value_ttm: 0,
              net_current_asset_value_ttm: 0,
              invested_capital_ttm: 0,
              average_receivables_ttm: 0,
              average_payables_ttm: 0,
              average_inventory_ttm: 0,
              days_sales_outstanding_ttm: fmpData.daysOfSalesOutstandingTTM ?? 0,
              days_payables_outstanding_ttm:
                fmpData.daysOfPayablesOutstandingTTM ?? 0,
              days_of_inventory_on_hand_ttm:
                fmpData.daysOfInventoryOutstandingTTM ?? 0,
              receivables_turnover_ttm: fmpData.receivablesTurnoverTTM ?? 0,
              payables_turnover_ttm: fmpData.payablesTurnoverTTM ?? 0,
              inventory_turnover_ttm: fmpData.inventoryTurnoverTTM ?? 0,
              roe_ttm: fmpData.returnOnEquityTTM ?? 0,
              capex_per_share_ttm: 0,
            },
          ]
        : [];

      return {
        results: transformedResults,
        provider: "fmp",
        warnings: null,
        chart: null,
        extra: { metadata: {} },
      } as EquityFundamentalsMultipleResponse;
    }),

  // Migrate from OpenBB to FMP - balance sheet growth
  equityFundamentalBalanceGrowth: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await fmp.get<FMPBalanceSheetGrowthResponse>(
        `/api/v3/balance-sheet-statement-growth/${input}`,
        {
          params: {
            limit: 12,
            period: "quarter",
            apikey: process.env.FMP_API_KEY,
          },
        },
      );

      // Transform FMP response to match existing interface
      const transformedResults = res?.data?.map((r) => ({
        period_ending: r.date,
        fiscal_period: r.period ?? "Q",
        fiscal_year: parseInt(r.calendarYear) || new Date().getFullYear(),
        symbol: r.symbol ?? input,
        growth_cash_and_cash_equivalents: r.growthCashAndCashEquivalents ?? null,
        growth_short_term_investments: r.growthShortTermInvestments ?? null,
        growth_cash_and_short_term_investments:
          r.growthCashAndShortTermInvestments ?? null,
        growth_net_receivables: r.growthNetReceivables ?? null,
        growth_inventory: r.growthInventory ?? null,
        growth_other_current_assets: r.growthOtherCurrentAssets ?? null,
        growth_total_current_assets: r.growthTotalCurrentAssets ?? null,
        growth_property_plant_equipment_net:
          r.growthPropertyPlantEquipmentNet ?? null,
        growth_goodwill: r.growthGoodwill ?? null,
        growth_intangible_assets: r.growthIntangibleAssets ?? null,
        growth_goodwill_and_intangible_assets:
          r.growthGoodwillAndIntangibleAssets ?? null,
        growth_long_term_investments: r.growthLongTermInvestments ?? null,
        growth_tax_assets: r.growthTaxAssets ?? null,
        growth_other_non_current_assets: r.growthOtherNonCurrentAssets ?? null,
        growth_total_non_current_assets: r.growthTotalNonCurrentAssets ?? null,
        growth_other_assets: r.growthOtherAssets ?? null,
        growth_total_assets: r.growthTotalAssets ?? null,
        growth_account_payables: r.growthAccountPayables ?? null,
        growth_short_term_debt: r.growthShortTermDebt ?? null,
        growth_tax_payables: r.growthTaxPayables ?? null,
        growth_deferred_revenue: r.growthDeferredRevenue ?? null,
        growth_other_current_liabilities: r.growthOtherCurrentLiabilities ?? null,
        growth_total_current_liabilities: r.growthTotalCurrentLiabilities ?? null,
        growth_long_term_debt: r.growthLongTermDebt ?? null,
        growth_deferred_revenue_non_current:
          r.growthDeferredRevenueNonCurrent ?? null,
        growth_deferrred_tax_liabilities_non_current:
          r.growthDeferredTaxLiabilitiesNonCurrent ?? null,
        growth_other_non_current_liabilities:
          r.growthOtherNonCurrentLiabilities ?? null,
        growth_total_non_current_liabilities:
          r.growthTotalNonCurrentLiabilities ?? null,
        growth_other_liabilities: r.growthOtherLiabilities ?? null,
        growth_total_liabilities: r.growthTotalLiabilities ?? null,
        growth_common_stock: r.growthCommonStock ?? null,
        growth_retained_earnings: r.growthRetainedEarnings ?? null,
        growth_accumulated_other_comprehensive_income:
          r.growthAccumulatedOtherComprehensiveIncomeLoss ?? null,
        growth_total_shareholders_equity: r.growthTotalStockholdersEquity ?? null,
        growth_total_liabilities_and_shareholders_equity:
          r.growthTotalLiabilitiesAndStockholdersEquity ?? null,
        growth_total_investments: r.growthTotalInvestments ?? null,
        growth_total_debt: r.growthTotalDebt ?? null,
        growth_net_debt: r.growthNetDebt ?? null,
        growthOthertotalStockholdersEquity:
          r.growthOthertotalStockholdersEquity ?? null,
      }));

      return {
        results: transformedResults ?? [],
        provider: "fmp",
        warnings: null,
        chart: null,
        extra: { metadata: {} },
      } as EquityFundamentalBalanceGrowthResponse;
    }),

  // Migrate from OpenBB to FMP - balance sheet
  equityFundamentalBalance: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await fmp.get<FMPBalanceSheetResponse>(
        `/api/v3/balance-sheet-statement/${input}`,
        {
          params: {
            limit: 12,
            period: "quarter",
            apikey: process.env.FMP_API_KEY,
          },
        },
      );

      // Transform FMP response to match existing interface
      const transformedResults = res?.data?.map((r) => ({
        link: r.link ?? "",
        final_link: r.finalLink ?? "",
        period_ending: r.date,
        fiscal_period: r.period ?? "Q",
        fiscal_year: parseInt(r.calendarYear) || new Date().getFullYear(),
        symbol: r.symbol ?? input,
        cash_and_cash_equivalents: r.cashAndCashEquivalents ?? null,
        short_term_investments: r.shortTermInvestments ?? null,
        cash_and_short_term_investments: r.cashAndShortTermInvestments ?? null,
        net_receivables: r.netReceivables ?? null,
        inventory: r.inventory ?? null,
        other_current_assets: r.otherCurrentAssets ?? null,
        total_current_assets: r.totalCurrentAssets ?? null,
        property_plant_equipment_net: r.propertyPlantEquipmentNet ?? null,
        goodwill: r.goodwill ?? null,
        intangible_assets: r.intangibleAssets ?? null,
        goodwill_and_intangible_assets: r.goodwillAndIntangibleAssets ?? null,
        long_term_investments: r.longTermInvestments ?? null,
        tax_assets: r.taxAssets ?? null,
        other_non_current_assets: r.otherNonCurrentAssets ?? null,
        total_non_current_assets: r.totalNonCurrentAssets ?? null,
        other_assets: r.otherAssets ?? null,
        total_assets: r.totalAssets ?? null,
        account_payables: r.accountPayables ?? null,
        short_term_debt: r.shortTermDebt ?? null,
        tax_payables: r.taxPayables ?? null,
        deferred_revenue: r.deferredRevenue ?? null,
        other_current_liabilities: r.otherCurrentLiabilities ?? null,
        total_current_liabilities: r.totalCurrentLiabilities ?? null,
        long_term_debt: r.longTermDebt ?? null,
        deferred_revenue_non_current: r.deferredRevenueNonCurrent ?? null,
        deferrred_tax_liabilities_non_current:
          r.deferredTaxLiabilitiesNonCurrent ?? null,
        other_non_current_liabilities: r.otherNonCurrentLiabilities ?? null,
        total_non_current_liabilities: r.totalNonCurrentLiabilities ?? null,
        other_liabilities: r.otherLiabilities ?? null,
        total_liabilities: r.totalLiabilities ?? null,
        common_stock: r.commonStock ?? null,
        retained_earnings: r.retainedEarnings ?? null,
        accumulated_other_comprehensive_income:
          r.accumulatedOtherComprehensiveIncomeLoss ?? null,
        total_shareholders_equity: r.totalStockholdersEquity ?? null,
        total_liabilities_and_shareholders_equity:
          r.totalLiabilitiesAndStockholdersEquity ?? null,
        total_investments: r.totalInvestments ?? null,
        total_debt: r.totalDebt ?? null,
        net_debt: r.netDebt ?? null,
        growthOthertotalStockholdersEquity: r.othertotalStockholdersEquity ?? null,
      }));

      return {
        results: transformedResults ?? [],
        provider: "fmp",
        warnings: null,
        chart: null,
        extra: { metadata: {} },
      } as EquityFundamentalBalanceResponse;
    }),

  // Migrate from OpenBB to FMP - cash flow growth
  equityFundamentalCashGrowth: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await fmp.get<FMPCashFlowGrowthResponse>(
        `/api/v3/cash-flow-statement-growth/${input}`,
        {
          params: {
            limit: 12,
            period: "quarter",
            apikey: process.env.FMP_API_KEY,
          },
        },
      );

      // Transform FMP response to match existing interface
      const transformedResults = res?.data?.map((r) => ({
        period_ending: r.date,
        fiscal_period: r.period ?? "Q",
        fiscal_year: parseInt(r.calendarYear) || new Date().getFullYear(),
        symbol: r.symbol ?? input,
        growth_net_income: r.growthNetIncome ?? 0,
        growth_depreciation_and_amortization:
          r.growthDepreciationAndAmortization ?? 0,
        growth_deferred_income_tax: r.growthDeferredIncomeTax ?? 0,
        growth_stock_based_compensation: r.growthStockBasedCompensation ?? 0,
        growth_change_in_working_capital: r.growthChangeInWorkingCapital ?? 0,
        growth_account_receivables: r.growthAccountsReceivables ?? 0,
        growth_inventory: r.growthInventory ?? 0,
        growth_account_payable: r.growthAccountsPayables ?? 0,
        growth_other_working_capital: r.growthOtherWorkingCapital ?? 0,
        growth_other_non_cash_items: r.growthOtherNonCashItems ?? 0,
        growth_net_cash_from_operating_activities:
          r.growthNetCashProvidedByOperatingActivites ?? 0,
        growth_operating_cash_flow: r.growthOperatingCashFlow ?? 0,
        growth_purchase_of_property_plant_and_equipment:
          r.growthInvestmentsInPropertyPlantAndEquipment ?? 0,
        growth_acquisitions: r.growthAcquisitionsNet ?? 0,
        growth_purchase_of_investment_securities:
          r.growthPurchasesOfInvestments ?? 0,
        growth_sale_and_maturity_of_investments:
          r.growthSalesMaturitiesOfInvestments ?? 0,
        growth_other_investing_activities: r.growthOtherInvestingActivites ?? 0,
        growth_net_cash_from_investing_activities:
          r.growthNetCashUsedForInvestingActivites ?? 0,
        growth_capital_expenditure: r.growthCapitalExpenditure ?? 0,
        growth_repayment_of_debt: r.growthDebtRepayment ?? 0,
        growth_common_stock_issued: r.growthCommonStockIssued ?? 0,
        growth_common_stock_repurchased: r.growthCommonStockRepurchased ?? 0,
        growth_dividends_paid: r.growthDividendsPaid ?? 0,
        growth_other_financing_activities: r.growthOtherFinancingActivites ?? 0,
        growthNetCashUsedProvidedByFinancingActivities:
          r.growthNetCashUsedProvidedByFinancingActivities ?? 0,
        growth_effect_of_exchange_rate_changes_on_cash:
          r.growthEffectOfForexChangesOnCash ?? 0,
        growth_net_change_in_cash_and_equivalents: r.growthNetChangeInCash ?? 0,
        growth_cash_at_beginning_of_period:
          r.growthCashAtBeginningOfPeriod ?? 0,
        growth_cash_at_end_of_period: r.growthCashAtEndOfPeriod ?? 0,
        growth_free_cash_flow: r.growthFreeCashFlow ?? 0,
      }));

      return {
        results: transformedResults ?? [],
        provider: "fmp",
        warnings: null,
        chart: null,
        extra: { metadata: {} },
      } as EquityFundamentalCashGrowthResponse;
    }),

  // Migrate from OpenBB to FMP - cash flow statement
  equityFundamentalCash: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await fmp.get<FMPCashFlowResponse>(
        `/api/v3/cash-flow-statement/${input}`,
        {
          params: {
            limit: 12,
            period: "quarter",
            apikey: process.env.FMP_API_KEY,
          },
        },
      );

      // Transform FMP response to match existing interface
      const transformedResults = res?.data?.map((r) => ({
        link: r.link ?? "",
        final_link: r.finalLink ?? "",
        period_ending: r.date,
        fiscal_period: r.period ?? "Q",
        fiscal_year: parseInt(r.calendarYear) || new Date().getFullYear(),
        symbol: r.symbol ?? input,
        net_income: r.netIncome ?? 0,
        depreciation_and_amortization: r.depreciationAndAmortization ?? 0,
        deferred_income_tax: r.deferredIncomeTax ?? 0,
        stock_based_compensation: r.stockBasedCompensation ?? 0,
        change_in_working_capital: r.changeInWorkingCapital ?? 0,
        account_receivables: r.accountsReceivables ?? 0,
        inventory: r.inventory ?? 0,
        account_payable: r.accountsPayables ?? 0,
        other_working_capital: r.otherWorkingCapital ?? 0,
        other_non_cash_items: r.otherNonCashItems ?? 0,
        net_cash_from_operating_activities:
          r.netCashProvidedByOperatingActivities ?? 0,
        operating_cash_flow: r.operatingCashFlow ?? 0,
        purchase_of_property_plant_and_equipment:
          r.investmentsInPropertyPlantAndEquipment ?? 0,
        acquisitions: r.acquisitionsNet ?? 0,
        purchase_of_investment_securities: r.purchasesOfInvestments ?? 0,
        sale_and_maturity_of_investments: r.salesMaturitiesOfInvestments ?? 0,
        other_investing_activities: r.otherInvestingActivites ?? 0,
        net_cash_from_investing_activities:
          r.netCashUsedForInvestingActivites ?? 0,
        capital_expenditure: r.capitalExpenditure ?? 0,
        repayment_of_debt: r.debtRepayment ?? 0,
        common_stock_issued: r.commonStockIssued ?? 0,
        common_stock_repurchased: r.commonStockRepurchased ?? 0,
        dividends_paid: r.dividendsPaid ?? 0,
        other_financing_activities: r.otherFinancingActivites ?? 0,
        growthNetCashUsedProvidedByFinancingActivities:
          r.netCashUsedProvidedByFinancingActivities ?? 0,
        effect_of_exchange_rate_changes_on_cash:
          r.effectOfForexChangesOnCash ?? 0,
        net_change_in_cash_and_equivalents: r.netChangeInCash ?? 0,
        cash_at_beginning_of_period: r.cashAtBeginningOfPeriod ?? 0,
        cash_at_end_of_period: r.cashAtEndOfPeriod ?? 0,
        free_cash_flow: r.freeCashFlow ?? 0,
      }));

      return {
        results: transformedResults ?? [],
        provider: "fmp",
        warnings: null,
        chart: null,
        extra: { metadata: {} },
      } as EquityFundamentalCashResponse;
    }),

  // Migrate from OpenBB to FMP - historical EPS
  equityFundamentalHistoricalEPS: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      const res = await fmp.get<FMPEarningsResponse>(
        `/api/v3/historical/earning_calendar/${input}`,
        {
          params: {
            limit: 12,
            apikey: process.env.FMP_API_KEY,
          },
        },
      );

      // Transform FMP response to match existing interface
      const transformedResults = res?.data?.map((r) => ({
        date: r.date,
        symbol: r.symbol ?? input,
        eps_actual: r.eps ?? null,
        eps_estimated: r.epsEstimated ?? null,
        revenue_estimated: r.revenueEstimated ?? null,
        revenue_actual: r.revenue ?? null,
        reporting_time: r.time ?? "",
        updated_at: r.updatedFromDate ?? "",
        period_ending: r.fiscalDateEnding ?? r.date,
      }));

      return {
        results: transformedResults ?? [],
        provider: "fmp",
        warnings: null,
        chart: null,
        extra: { metadata: {} },
      } as EquityFundamentalHistoricalEPSResponse;
    }),

  // Migrate from OpenBB to FMP - stock news
  newsCompany: publicProcedure.input(String).query(async ({ input }) => {
    console.log("[newsCompany] Input:", input);
    const res = await fmp.get<FMPStockNewsResponse>(`/api/v3/stock_news`, {
      params: {
        tickers: input,
        limit: 20,
        apikey: process.env.FMP_API_KEY,
      },
    });
    console.log("[newsCompany] Response length:", res?.data?.length);

    // Transform FMP response to match existing interface
    const transformedResults = res?.data?.map((n) => ({
      date: n.publishedDate,
      title: n.title,
      text: n.text,
      images: n.image ? [{ url: n.image, width: "", height: "", tag: "" }] : [],
      url: n.url,
      symbols: n.symbol,
      source: n.site,
    }));

    return {
      results: transformedResults ?? [],
      provider: "fmp",
      warnings: null,
      chart: null,
      extra: { metadata: {} },
    } as NewsCompanyResponse;
  }),

  // Migrate from OpenBB to FMP - key metrics
  equityFundamentalMetrics: publicProcedure
    .input(String)
    .query(async ({ input }) => {
      console.log("[equityFundamentalMetrics] Input:", input);
      const res = await fmp.get<FMPKeyMetricsResponse>(
        `/api/v3/key-metrics/${input}`,
        {
          params: {
            limit: 12,
            period: "quarter",
            apikey: process.env.FMP_API_KEY,
          },
        },
      );
      console.log("[equityFundamentalMetrics] Response length:", res?.data?.length);

      // Transform FMP response to match existing interface
      const transformedResults = res?.data?.map((r) => ({
        symbol: r.symbol ?? input,
        market_cap: r.marketCap ?? 0,
        pe_ratio: r.peRatio ?? 0,
        period_ending: r.date,
        fiscal_period: r.period ?? "Q",
        calendar_year: parseInt(r.calendarYear) || new Date().getFullYear(),
        revenue_per_share: r.revenuePerShare ?? 0,
        capex_per_share: r.capexPerShare ?? 0,
        net_income_per_share: r.netIncomePerShare ?? 0,
        operating_cash_flow_per_share: r.operatingCashFlowPerShare ?? 0,
        free_cash_flow_per_share: r.freeCashFlowPerShare ?? 0,
        cash_per_share: r.cashPerShare ?? 0,
        book_value_per_share: r.bookValuePerShare ?? 0,
        tangible_book_value_per_share: r.tangibleBookValuePerShare ?? 0,
        shareholders_equity_per_share: r.shareholdersEquityPerShare ?? 0,
        interest_debt_per_share: r.interestDebtPerShare ?? 0,
        price_to_sales: r.priceToSalesRatio ?? 0,
        price_to_operating_cash_flow: r.pocfratio ?? 0,
        price_to_free_cash_flow: r.pfcfRatio ?? 0,
        price_to_book: r.pbRatio ?? 0,
        price_to_tangible_book: r.ptbRatio ?? 0,
        ev_to_sales: r.evToSales ?? 0,
        ev_to_ebitda: r.enterpriseValueOverEBITDA ?? 0,
        ev_to_operating_cash_flow: r.evToOperatingCashFlow ?? 0,
        ev_to_free_cash_flow: r.evToFreeCashFlow ?? 0,
        earnings_yield: r.earningsYield ?? 0,
        free_cash_flow_yield: r.freeCashFlowYield ?? 0,
        debt_to_market_cap: 0,
        debt_to_equity: r.debtToEquity ?? 0,
        debt_to_assets: r.debtToAssets ?? 0,
        net_debt_to_ebitda: r.netDebtToEBITDA ?? 0,
        current_ratio: r.currentRatio ?? 0,
        interest_coverage: r.interestCoverage ?? 0,
        income_quality: r.incomeQuality ?? 0,
        payout_ratio: r.payoutRatio ?? 0,
        sales_general_and_administrative_to_revenue:
          r.salesGeneralAndAdministrativeToRevenue ?? 0,
        research_and_development_to_revenue:
          r.researchAndDdevelopementToRevenue ?? 0,
        intangibles_to_total_assets: r.intangiblesToTotalAssets ?? 0,
        capex_to_operating_cash_flow: r.capexToOperatingCashFlow ?? 0,
        capex_to_revenue: r.capexToRevenue ?? 0,
        capex_to_depreciation: r.capexToDepreciation ?? 0,
        stock_based_compensation_to_revenue:
          r.stockBasedCompensationToRevenue ?? 0,
        working_capital: r.workingCapital ?? 0,
        tangible_asset_value: r.tangibleAssetValue ?? 0,
        net_current_asset_value: r.netCurrentAssetValue ?? 0,
        enterprise_value: r.enterpriseValue ?? 0,
        invested_capital: r.investedCapital ?? 0,
        average_receivables: r.averageReceivables ?? 0,
        average_payables: r.averagePayables ?? 0,
        average_inventory: r.averageInventory ?? 0,
        days_sales_outstanding: r.daysSalesOutstanding ?? 0,
        days_payables_outstanding: r.daysPayablesOutstanding ?? 0,
        days_of_inventory_on_hand: r.daysOfInventoryOnHand ?? 0,
        receivables_turnover: r.receivablesTurnover ?? 0,
        payables_turnover: r.payablesTurnover ?? 0,
        inventory_turnover: r.inventoryTurnover ?? 0,
        return_on_equity: r.roe ?? 0,
        return_on_invested_capital: r.roic ?? 0,
        return_on_tangible_assets: r.returnOnTangibleAssets ?? 0,
        dividend_yield: r.dividendYield ?? 0,
        graham_number: r.grahamNumber ?? 0,
        graham_net_net: r.grahamNetNet ?? 0,
      }));

      return {
        results: transformedResults ?? [],
        provider: "fmp",
        warnings: null,
        chart: null,
        extra: { metadata: {} },
      } as EquityFundamentalMetricsResponse;
    }),
});

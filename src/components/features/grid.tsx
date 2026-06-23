"use client";
import GridLayout from "react-grid-layout";
import React from "react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useWindowSize } from "react-use";
import { Chart } from "./chart";
import { Fundamentals } from "./fundamentals";
import { News } from "./news";
import { BalanceGrowth } from "./balance_growth";
import dynamic from "next/dynamic";
import { CashGrowth } from "./cash_growth";
import { DEFAULT_LAYOUT } from "~/hooks/use-layout";
import { useIsMobile } from "~/hooks/use-mobile";

import { CompanyProfile } from "./company-profile";
import { GPT } from "./gpt";
import {
  Revenue,
  EBITDA,
  NetIncome,
  EPS,
  Expenses,
  SharesOutstanding,
  MarginTrends,
} from "./income-statement-charts";
import { CashDebt } from "./cash-debt";
import { Dividends } from "./dividends";
import { ValuationChart } from "./valuation-chart";
import { StockPeers } from "./stock-peers";
import { InsiderTrading } from "./insider-trading";
import { AnalystRatings } from "./analyst-ratings";
import { DeferredMount } from "./deferred-mount";

const Grid = () => {
  const { width, height } = useWindowSize();
  const isMobile = useIsMobile(1200);

  if (!width || !height) return null;

  const clx = "border border-sm border-border bg-background";

  return (
    <>
      <GridLayout
        layout={
          isMobile
            ? DEFAULT_LAYOUT.map((l) => ({ ...l, x: 0, w: 14 }))
            : DEFAULT_LAYOUT
        }
        cols={isMobile ? 14 : 21}
        rowHeight={30}
        maxRows={height / 15}
        width={width}
        autoSize={true}
        isResizable={false}
        isDraggable={false}
        resizeHandles={["se", "sw", "ne", "nw"]}
      >
        {/* Priority widgets — load first (main chart, news, company profile).
            Market indices (DOW/S&P/NASDAQ) live in the navbar and load eagerly
            too. Everything else is deferred until it scrolls into view or the
            browser is idle, so the critical content isn't starved on load. */}
        <div key="main-chart" className={clx}>
          <Chart />
        </div>
        <div key="news" className={clx}>
          <News />
        </div>
        <div key="live-quote" className={clx}>
          <CompanyProfile />
        </div>

        <div key="fundamental-pillars" className={clx}>
          <DeferredMount>
            <Fundamentals />
          </DeferredMount>
        </div>
        <div key="ai" className={clx}>
          <DeferredMount>
            <GPT />
          </DeferredMount>
        </div>

        {/* Income Statement */}
        <div key="revenue" className={clx}>
          <DeferredMount>
            <Revenue />
          </DeferredMount>
        </div>
        <div key="ebitda" className={clx}>
          <DeferredMount>
            <EBITDA />
          </DeferredMount>
        </div>
        <div key="net-income" className={clx}>
          <DeferredMount>
            <NetIncome />
          </DeferredMount>
        </div>
        <div key="eps" className={clx}>
          <DeferredMount>
            <EPS />
          </DeferredMount>
        </div>
        <div key="expenses" className={clx}>
          <DeferredMount>
            <Expenses />
          </DeferredMount>
        </div>

        {/* Balance Sheet */}
        <div key="balance-growth" className={clx}>
          <DeferredMount>
            <BalanceGrowth />
          </DeferredMount>
        </div>
        <div key="cash-debt" className={clx}>
          <DeferredMount>
            <CashDebt />
          </DeferredMount>
        </div>

        {/* Cash Flow */}
        <div key="cash-growth" className={clx}>
          <DeferredMount>
            <CashGrowth />
          </DeferredMount>
        </div>
        <div key="dividends" className={clx}>
          <DeferredMount>
            <Dividends />
          </DeferredMount>
        </div>

        {/* Capital Structure */}
        <div key="shares-outstanding" className={clx}>
          <DeferredMount>
            <SharesOutstanding />
          </DeferredMount>
        </div>

        {/* Valuation & Ratios */}
        <div key="valuation" className={clx}>
          <DeferredMount>
            <ValuationChart />
          </DeferredMount>
        </div>
        <div key="margin-trends" className={clx}>
          <DeferredMount>
            <MarginTrends />
          </DeferredMount>
        </div>

        {/* Competitive & Risk Analysis */}
        <div key="stock-peers" className={clx}>
          <DeferredMount>
            <StockPeers />
          </DeferredMount>
        </div>
        <div key="analyst-ratings" className={clx}>
          <DeferredMount>
            <AnalystRatings />
          </DeferredMount>
        </div>
        <div key="insider-trading" className={clx}>
          <DeferredMount>
            <InsiderTrading />
          </DeferredMount>
        </div>
      </GridLayout>
      <div className="pb-20"></div>
    </>
  );
};

export default dynamic(() => Promise.resolve(Grid), { ssr: false });

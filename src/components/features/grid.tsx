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
import { MetricsTable } from "./metrics-table";
import { CompanyProfile } from "./company-profile";
import { GPT } from "./gpt";
import { Revenue, EBITDA, NetIncome, EPS, Expenses, SharesOutstanding, MarginTrends } from "./income-statement-charts";
import { CashDebt } from "./cash-debt";
import { Dividends } from "./dividends";
import { ValuationChart } from "./valuation-chart";

const Grid = () => {
  const { width, height } = useWindowSize();
  const isMobile = useIsMobile(1200);

  if (!width || !height) return null;

  const clx = "border border-sm border-[#424975] bg-[#151624]";

  return (
    <>
      <GridLayout
        layout={isMobile ? DEFAULT_LAYOUT.map((l) => ({ ...l, x: 0, w: 14 })) : DEFAULT_LAYOUT}
        cols={isMobile ? 14 : 21}
        rowHeight={30}
        maxRows={height / 15}
        width={width}
        autoSize={true}
        isResizable={false}
        isDraggable={false}
        resizeHandles={["se", "sw", "ne", "nw"]}
      >
        <div key="main-chart" className={clx}>
          <Chart />
        </div>
        <div key="fundamental-pillars" className={clx}>
          <Fundamentals />
        </div>
        <div key="news" className={clx}>
          <News />
        </div>
        <div key="live-quote" className={clx}>
          <CompanyProfile />
        </div>
        <div key="ai" className={clx}>
          <GPT />
        </div>

        {/* Income Statement */}
        <div key="revenue" className={clx}>
          <Revenue />
        </div>
        <div key="ebitda" className={clx}>
          <EBITDA />
        </div>
        <div key="net-income" className={clx}>
          <NetIncome />
        </div>
        <div key="eps" className={clx}>
          <EPS />
        </div>
        <div key="expenses" className={clx}>
          <Expenses />
        </div>

        {/* Balance Sheet */}
        <div key="balance-growth" className={clx}>
          <BalanceGrowth />
        </div>
        <div key="cash-debt" className={clx}>
          <CashDebt />
        </div>

        {/* Cash Flow */}
        <div key="cash-growth" className={clx}>
          <CashGrowth />
        </div>
        <div key="dividends" className={clx}>
          <Dividends />
        </div>

        {/* Capital Structure */}
        <div key="shares-outstanding" className={clx}>
          <SharesOutstanding />
        </div>

        {/* Valuation & Ratios */}
        <div key="valuation" className={clx}>
          <ValuationChart />
        </div>
        <div key="margin-trends" className={clx}>
          <MarginTrends />
        </div>

        <div key="metrics-table">
          <MetricsTable />
        </div>
      </GridLayout>
      <div className="pb-20"></div>
    </>
  );
};

export default dynamic(() => Promise.resolve(Grid), { ssr: false });

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
import { HistoricalEPS } from "./eps";
import { HistoricalRevenue } from "./revenue";
import { useLayout } from "~/hooks/use-layout";
import { useIsMobile } from "~/hooks/use-mobile";
import { MetricsTable } from "./metrics-table";
import { Quote } from "./quote";
import { GPT } from "./gpt";

const Grid = () => {
  const { width, height } = useWindowSize();
  const [layout, setLayout] = useLayout();
  const isMobile = useIsMobile(1200);

  if (!width || !height) return null;

  const clx = "border border-sm border-[#424975] bg-[#151624]";

  return (
    <>
      <GridLayout
        layout={isMobile ? layout.map((l) => ({ ...l, x: 0, w: 14 })) : layout}
        cols={isMobile ? 14 : 20}
        rowHeight={30}
        maxRows={height / 15}
        width={width}
        autoSize={true}
        isResizable={!isMobile}
        isDraggable={!isMobile}
        onLayoutChange={(l) => {
          if (isMobile) return;
          setLayout(l);
        }}
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
          <Quote />
        </div>

        <div key="ai" className={clx}>
          <GPT />
        </div>

        <div key="balance-growth" className={clx}>
          <BalanceGrowth />
        </div>
        <div key="cash-growth" className={clx}>
          <CashGrowth />
        </div>
        <div key="eps" className={clx}>
          <HistoricalEPS />
        </div>
        <div key="revenue" className={clx}>
          <HistoricalRevenue />
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

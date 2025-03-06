"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Area,
} from "recharts";

import { ChartTooltip } from "~/components/ui/chart";
import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";

const PriceChange = ({ data }: { data?: { price: number }[] }) => {
  if (!data?.length) return null;

  const startPrice = data[0]?.price;
  const endPrice = data[data.length - 1]?.price;

  if (!startPrice || !endPrice) return null;

  const priceDiff = endPrice - startPrice;
  const percentChange = (priceDiff / startPrice) * 100;
  const isPositive = priceDiff >= 0;

  return (
    <div className="flex items-center gap-2 p-2">
      <span className="text-lg font-semibold">${endPrice.toFixed(2)}</span>
      <span
        className={`text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}
      >
        {isPositive ? "+" : ""}${priceDiff.toFixed(2)} ({isPositive ? "+" : ""}
        {percentChange.toFixed(2)}%)
      </span>
    </div>
  );
};

const ChartSkeleton = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <LoaderCircle className="h-8 w-8 animate-spin text-gray-400" />
      <span className="text-sm text-gray-400">Loading chart data...</span>
    </div>
  </div>
);

const NoSymbolMessage = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm text-gray-400">
        Please select a stock to view the chart
      </span>
    </div>
  </div>
);

const CustomTooltip = ({
  payload,
  active,
}: {
  payload?: { payload: { date: string }; value: number }[];
  active?: boolean;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg bg-white p-2 shadow-sm">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-cyan-700 text-muted-foreground">
            {payload[0]?.payload?.date}
          </span>
          <span className="font-bold text-black">
            ${payload[0]?.value.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

type TimeFrame = "5Y" | "1Y" | "6M" | "1M" | "1W" | "1D";

const filterDataByTimeFrame = (
  data: {
    date: string;
    price: number;
  }[],
  timeFrame: TimeFrame,
) => {
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  switch (timeFrame) {
    case "5Y":
      return sortedData.slice(-252 * 5); // ~252 trading days per year
    case "1Y":
      return sortedData.slice(-252);
    case "6M":
      return sortedData.slice(-126); // ~21 trading days * 6
    case "1M":
      return sortedData.slice(-21); // ~21 trading days
    case "1W":
      return sortedData.slice(-5); // 5 trading days
    case "1D":
      return sortedData.slice(-1); // Latest day
    default:
      return sortedData;
  }
};

export function Chart() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1Y");
  const [symbol] = useSymbol();
  const { data, isLoading } = api.asset.equityPriceHistoricalFMP.useQuery(
    symbol ?? "",
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      enabled: !!symbol,
    },
  );

  const { data: data2, isLoading: isLoading2 } =
    api.asset.equityPriceHistorical.useQuery(symbol ?? "", {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      enabled: timeFrame === "1D" && !!symbol,
    });

  if (!symbol) {
    return <NoSymbolMessage />;
  }

  if (isLoading || isLoading2) {
    return <ChartSkeleton />;
  }

  const chartData = data?.historical
    ?.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((result) => ({
      date: result.date,
      price: result.close,
    }));

  const chartData2 = data2?.results?.map((result) => ({
    date: result.date,
    price: result.close,
  }));

  const filteredData = chartData
    ? filterDataByTimeFrame(chartData ?? [], timeFrame)
    : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col justify-between sm:flex-row">
        <div className="flex gap-2 p-2">
          {(["5Y", "1Y", "6M", "1M", "1W", "1D"] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={(e) => {
                e.stopPropagation();
                setTimeFrame(tf);
              }}
              className={`rounded px-3 py-1 text-sm ${
                timeFrame === tf
                  ? "bg-[#424975] text-white"
                  : "bg-transparent text-gray-400 hover:bg-[#424975]/50"
              }`}
              style={{ zIndex: 100 }}
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {tf}
            </button>
          ))}
        </div>
        <PriceChange data={timeFrame === "1D" ? chartData2 : filteredData} />
      </div>

      <ResponsiveContainer>
        <AreaChart
          accessibilityLayer
          data={timeFrame === "1D" ? chartData2 : filteredData}
        >
          <defs>
            <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} />
          <XAxis
            fontSize={12}
            dataKey="date"
            minTickGap={50}
            interval="preserveStartEnd"
            tickFormatter={(value: string) => {
              const date = new Date(value);

              if (timeFrame === "1D")
                return date.toLocaleString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

              return date.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: date.getMonth() === 0 ? "numeric" : undefined,
              });
            }}
          />
          <YAxis
            fontSize={12}
            dataKey="price"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value: number) => value?.toFixed(2)}
          />
          <ChartTooltip content={<CustomTooltip />} />
          <Area
            dataKey="price"
            stroke="#82ca9d"
            fillOpacity={1}
            fill="url(#colorPv)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

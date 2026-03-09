"use client";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
} from "recharts";
import { useSymbol } from "~/hooks/use-symbol";
import { formatLargeNumber, openInNewTab } from "~/lib/utils";
import { api } from "~/trpc/react";

interface CustomTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; fill?: string; stroke?: string }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-[#424975] bg-[#151624] p-3 text-sm shadow-lg">
      <p className="mb-1 font-medium text-gray-200">{`Period: ${label}`}</p>
      {payload.map((pld) => (
        <p key={pld.name} style={{ color: pld.fill ?? pld.stroke }}>
          {`${pld.name}: ${formatLargeNumber(pld.value)}`}
        </p>
      ))}
    </div>
  );
};

const formatQuarter = (dateStr: string) => {
  const date = new Date(dateStr);
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
};

export const BalanceGrowth = () => {
  const [symbol] = useSymbol();
  const { data, isLoading } = api.asset.equityFundamentalBalance.useQuery(symbol, {
    enabled: !!symbol,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const sortedData = (data?.results ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(a.period_ending).getTime() - new Date(b.period_ending).getTime(),
    );

  if (isLoading) {
    return (
      <div className="h-full w-full animate-pulse bg-[#121327]">
        <div className="flex h-full flex-col items-center justify-center">
          <div className="mb-4 h-6 w-48 rounded bg-gray-700"></div>
          <div className="h-[400px] w-full rounded bg-gray-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mt-2 text-center text-xl font-semibold text-gray-200">
        Balance Sheet
      </h2>
      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart
          data={sortedData}
          margin={{ top: 30, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d4a" />
          <XAxis
            dataKey="period_ending"
            className="cursor-pointer"
            tickFormatter={formatQuarter}
            angle={-45}
            textAnchor="end"
            textDecoration="underline"
            height={60}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            onTouchStart={(_d, _i, e) => e.stopPropagation()}
            onMouseDown={(_d, _i, e) => e.stopPropagation()}
            onClick={(_d, idx, e) => {
              e.stopPropagation();
              if (sortedData[idx]?.final_link) openInNewTab(sortedData[idx].final_link);
            }}
          />
          <YAxis
            tickFormatter={formatLargeNumber}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: "#9ca3af" }} />
          <Bar dataKey="total_assets" fill="#4DA6B3" name="Total Assets" />
          <Bar dataKey="total_liabilities" fill="#F28B82" name="Total Liabilities" />
          <Line
            type="monotone"
            dataKey="total_shareholders_equity"
            name="Shareholders Equity"
            stroke="#7CB342"
            strokeWidth={2}
            dot={{ fill: "#7CB342", r: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

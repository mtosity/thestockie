"use client";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatLargeNumber } from "~/lib/utils";
import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";

const formatQuarter = (dateStr: string) => {
  const d = new Date(dateStr);
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
};

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; fill?: string; stroke?: string }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-[#424975] bg-[#151624] p-3 text-sm shadow-lg">
      <p className="mb-1 font-medium text-gray-200">{formatQuarter(label ?? "")}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.fill ?? entry.stroke }}>
          {entry.name}: ${formatLargeNumber(entry.value)}
        </p>
      ))}
    </div>
  );
};

export const CashDebt = () => {
  const [symbol] = useSymbol();
  const { data, isLoading } = api.asset.equityFundamentalBalance.useQuery(symbol, {
    enabled: !!symbol,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const chartData = (data?.results ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(a.period_ending).getTime() - new Date(b.period_ending).getTime(),
    )
    .map((r) => ({
      date: r.period_ending,
      cash: (r.cash_and_cash_equivalents ?? 0) + (r.short_term_investments ?? 0),
      totalDebt: r.total_debt ?? 0,
      netDebt: r.net_debt ?? 0,
    }));

  if (isLoading) {
    return (
      <div className="h-full w-full animate-pulse bg-[#121327]">
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="h-6 w-48 rounded bg-gray-700" />
          <div className="h-[400px] w-full rounded bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="mt-2 text-center text-xl font-semibold text-gray-200">
        Cash &amp; Debt
      </h2>
      <ResponsiveContainer width="100%" height={480}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d4a" />
          <XAxis
            dataKey="date"
            tickFormatter={formatQuarter}
            angle={-45}
            textAnchor="end"
            height={60}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v: number) => `$${formatLargeNumber(v)}`}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: "#9ca3af", paddingTop: "8px" }} />
          <Bar dataKey="cash" name="Cash & ST Investments" fill="#7CB342" />
          <Bar dataKey="totalDebt" name="Total Debt" fill="#F28B82" />
          <Line
            type="monotone"
            dataKey="netDebt"
            name="Net Debt"
            stroke="#FF9800"
            strokeWidth={2}
            dot={{ fill: "#FF9800", r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

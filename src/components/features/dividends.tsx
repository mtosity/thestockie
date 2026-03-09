"use client";
import { useState } from "react";
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
import { cn, formatLargeNumber } from "~/lib/utils";
import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";

type Period = "quarterly" | "ttm";

const PeriodToggle = ({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) => (
  <div className="flex overflow-hidden rounded border border-[#424975] text-xs">
    <button
      onClick={() => onChange("quarterly")}
      className={cn(
        "px-3 py-1 transition-colors",
        period === "quarterly"
          ? "bg-[#424975] text-white"
          : "text-gray-400 hover:text-gray-200",
      )}
    >
      Quarterly
    </button>
    <button
      onClick={() => onChange("ttm")}
      className={cn(
        "px-3 py-1 transition-colors",
        period === "ttm"
          ? "bg-[#424975] text-white"
          : "text-gray-400 hover:text-gray-200",
      )}
    >
      TTM
    </button>
  </div>
);

const formatQuarter = (dateStr: string) => {
  const d = new Date(dateStr);
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
};

interface DataPoint {
  date: string;
  dividendsPaid: number;
  buybacks: number;
  totalReturnOfCapital: number;
}

function applyTTM(data: DataPoint[]): DataPoint[] {
  if (data.length < 4) return data;
  return data.slice(3).map((item, i) => ({
    ...item,
    dividendsPaid:
      (data[i]!.dividendsPaid) +
      (data[i + 1]!.dividendsPaid) +
      (data[i + 2]!.dividendsPaid) +
      (data[i + 3]!.dividendsPaid),
    buybacks:
      (data[i]!.buybacks) +
      (data[i + 1]!.buybacks) +
      (data[i + 2]!.buybacks) +
      (data[i + 3]!.buybacks),
    totalReturnOfCapital:
      (data[i]!.totalReturnOfCapital) +
      (data[i + 1]!.totalReturnOfCapital) +
      (data[i + 2]!.totalReturnOfCapital) +
      (data[i + 3]!.totalReturnOfCapital),
  }));
}

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
          {entry.name}: ${formatLargeNumber(Math.abs(entry.value))}
        </p>
      ))}
    </div>
  );
};

export const Dividends = () => {
  const [symbol] = useSymbol();
  const [period, setPeriod] = useState<Period>("ttm");

  const { data, isLoading } = api.asset.equityFundamentalCash.useQuery(symbol, {
    enabled: !!symbol,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const rawData: DataPoint[] = (data?.results ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(a.period_ending).getTime() - new Date(b.period_ending).getTime(),
    )
    .map((r) => {
      const divPaid = Math.abs(r.dividends_paid ?? 0);
      const buybacks = Math.abs(r.common_stock_repurchased ?? 0);
      return {
        date: r.period_ending,
        dividendsPaid: divPaid,
        buybacks,
        totalReturnOfCapital: divPaid + buybacks,
      };
    });

  const chartData = period === "ttm" ? applyTTM(rawData) : rawData;

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
      <div className="flex items-center justify-between px-4 pt-2">
        <div className="w-24" />
        <h2 className="text-center text-xl font-semibold text-gray-200">
          Dividends &amp; Return of Capital
        </h2>
        <PeriodToggle period={period} onChange={setPeriod} />
      </div>
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
          <Bar dataKey="dividendsPaid" name="Dividends" fill="#4DA6B3" stackId="roc" />
          <Bar dataKey="buybacks" name="Buybacks" fill="#5C6BC0" stackId="roc" />
          <Line
            type="monotone"
            dataKey="totalReturnOfCapital"
            name="Total Return of Capital"
            stroke="#7CB342"
            strokeWidth={2}
            dot={{ fill: "#7CB342", r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

"use client";
import { useState } from "react";
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
import { cn, formatLargeNumber, openInNewTab } from "~/lib/utils";
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

interface DataRow {
  period_ending: string;
  final_link: string;
  operating_cash_flow: number;
  free_cash_flow: number;
  capital_expenditure: number;
}

function applyTTM(data: DataRow[]): DataRow[] {
  if (data.length < 4) return data;
  return data.slice(3).map((item, i) => ({
    ...item,
    operating_cash_flow:
      data[i]!.operating_cash_flow +
      data[i + 1]!.operating_cash_flow +
      data[i + 2]!.operating_cash_flow +
      data[i + 3]!.operating_cash_flow,
    free_cash_flow:
      data[i]!.free_cash_flow +
      data[i + 1]!.free_cash_flow +
      data[i + 2]!.free_cash_flow +
      data[i + 3]!.free_cash_flow,
    capital_expenditure:
      data[i]!.capital_expenditure +
      data[i + 1]!.capital_expenditure +
      data[i + 2]!.capital_expenditure +
      data[i + 3]!.capital_expenditure,
  }));
}

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

export const CashGrowth = () => {
  const [symbol] = useSymbol();
  const [period, setPeriod] = useState<Period>("ttm");

  const { data, isLoading } = api.asset.equityFundamentalCash.useQuery(symbol, {
    enabled: !!symbol,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const rawData: DataRow[] = (data?.results ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(a.period_ending).getTime() - new Date(b.period_ending).getTime(),
    )
    .map((r) => ({
      period_ending: r.period_ending,
      final_link: r.final_link,
      operating_cash_flow: r.operating_cash_flow,
      free_cash_flow: r.free_cash_flow,
      capital_expenditure: Math.abs(r.capital_expenditure),
    }));

  const chartData = period === "ttm" ? applyTTM(rawData) : rawData;

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
      <div className="flex items-center justify-between px-4 pt-2">
        <div className="w-24" />
        <h2 className="text-center text-xl font-semibold text-gray-200">
          Cash Flow
        </h2>
        <PeriodToggle period={period} onChange={setPeriod} />
      </div>
      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart
          data={chartData}
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
              if (rawData[idx]?.final_link) openInNewTab(rawData[idx].final_link);
            }}
          />
          <YAxis
            tickFormatter={formatLargeNumber}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: "#9ca3af" }} />
          <Bar dataKey="operating_cash_flow" fill="#5C6BC0" name="Operating CF" />
          <Bar dataKey="free_cash_flow" fill="#7CB342" name="Free Cash Flow" />
          <Line
            type="monotone"
            dataKey="capital_expenditure"
            name="CapEx"
            stroke="#FF9800"
            strokeWidth={2}
            dot={{ fill: "#FF9800", r: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

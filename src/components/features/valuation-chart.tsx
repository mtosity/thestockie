"use client";
import { useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "~/lib/utils";
import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";

// ── Tab toggle ───────────────────────────────────────────────────────────────
type Tab = "valuation" | "ratios";

const TabToggle = ({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) => (
  <div className="flex overflow-hidden rounded border border-[#424975] text-xs">
    <button
      onClick={() => onChange("valuation")}
      className={cn(
        "px-3 py-1 transition-colors",
        tab === "valuation"
          ? "bg-[#424975] text-white"
          : "text-gray-400 hover:text-gray-200",
      )}
    >
      Valuation
    </button>
    <button
      onClick={() => onChange("ratios")}
      className={cn(
        "px-3 py-1 transition-colors",
        tab === "ratios"
          ? "bg-[#424975] text-white"
          : "text-gray-400 hover:text-gray-200",
      )}
    >
      Ratios
    </button>
  </div>
);

const formatQuarter = (dateStr: string) => {
  const d = new Date(dateStr);
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
};

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; stroke?: string }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-[#424975] bg-[#151624] p-3 text-sm shadow-lg">
      <p className="mb-1 font-medium text-gray-200">{formatQuarter(label ?? "")}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.stroke }}>
          {entry.name}: {entry.value?.toFixed(2)}x
        </p>
      ))}
    </div>
  );
};

const VALUATION_LINES = [
  { dataKey: "pe_ratio", name: "P/E", color: "#4DA6B3" },
  { dataKey: "price_to_sales", name: "P/S", color: "#7CB342" },
  { dataKey: "price_to_book", name: "P/B", color: "#FF9800" },
  { dataKey: "ev_to_ebitda", name: "EV/EBITDA", color: "#5C6BC0" },
  { dataKey: "ev_to_free_cash_flow", name: "EV/FCF", color: "#F28B82" },
];

const RATIOS_LINES = [
  { dataKey: "return_on_equity", name: "ROE", color: "#7CB342" },
  { dataKey: "return_on_invested_capital", name: "ROIC", color: "#4DA6B3" },
  { dataKey: "debt_to_equity", name: "D/E", color: "#F28B82" },
  { dataKey: "current_ratio", name: "Current Ratio", color: "#FF9800" },
  { dataKey: "interest_coverage", name: "Interest Coverage", color: "#5C6BC0" },
];

export const ValuationChart = () => {
  const [symbol] = useSymbol();
  const [tab, setTab] = useState<Tab>("valuation");

  const { data, isLoading } = api.asset.equityFundamentalMetrics.useQuery(
    symbol ?? "",
    {
      enabled: !!symbol,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  const chartData = (data?.results ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(a.period_ending).getTime() - new Date(b.period_ending).getTime(),
    )
    .map((r) => ({
      date: r.period_ending,
      pe_ratio: r.pe_ratio ?? 0,
      price_to_sales: r.price_to_sales ?? 0,
      price_to_book: r.price_to_book ?? 0,
      ev_to_ebitda: r.ev_to_ebitda ?? 0,
      ev_to_free_cash_flow: r.ev_to_free_cash_flow ?? 0,
      return_on_equity: (r.return_on_equity ?? 0) * 100,
      return_on_invested_capital: (r.return_on_invested_capital ?? 0) * 100,
      debt_to_equity: r.debt_to_equity ?? 0,
      current_ratio: r.current_ratio ?? 0,
      interest_coverage: r.interest_coverage ?? 0,
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

  const lines = tab === "valuation" ? VALUATION_LINES : RATIOS_LINES;
  const title = tab === "valuation" ? "Valuation Multiples" : "Financial Ratios";
  const yLabel = tab === "ratios" && chartData.some((d) => (d.return_on_equity ?? 0) > 5)
    ? " (%)"
    : "x";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-4 pt-2">
        <div className="w-24" />
        <h2 className="text-center text-xl font-semibold text-gray-200">{title}</h2>
        <TabToggle tab={tab} onChange={setTab} />
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
            tickFormatter={(v: number) => `${v.toFixed(1)}${yLabel}`}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            width={65}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: "#9ca3af", paddingTop: "8px" }} />
          {lines.map((l) => (
            <Line
              key={l.dataKey}
              type="monotone"
              dataKey={l.dataKey}
              name={l.name}
              stroke={l.color}
              strokeWidth={2}
              dot={{ fill: l.color, r: 2 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

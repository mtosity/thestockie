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
import { cn } from "~/lib/utils";
import { formatLargeNumber } from "~/lib/utils";
import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";
import type { FMPIncomeStatementResult } from "~/server/api/schema/FMP/FMPIncomeStatement";

// ── Period toggle ────────────────────────────────────────────────────────────
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

// ── TTM computation ──────────────────────────────────────────────────────────
const TTM_FIELDS: (keyof FMPIncomeStatementResult)[] = [
  "revenue",
  "costOfRevenue",
  "grossProfit",
  "ebitda",
  "operatingIncome",
  "netIncome",
  "eps",
  "epsdiluted",
  "researchAndDevelopmentExpenses",
  "sellingGeneralAndAdministrativeExpenses",
  "interestExpense",
  "depreciationAndAmortization",
  "operatingExpenses",
  "costAndExpenses",
  "incomeTaxExpense",
];

function applyTTM(data: FMPIncomeStatementResult[]): FMPIncomeStatementResult[] {
  if (data.length < 4) return data;
  return data.slice(3).map((item, i) => {
    const base = { ...item };
    for (const field of TTM_FIELDS) {
      const sum =
        (data[i]![field] as number) +
        (data[i + 1]![field] as number) +
        (data[i + 2]![field] as number) +
        (data[i + 3]![field] as number);
      (base as Record<string, unknown>)[field as string] = sum;
    }
    return base;
  });
}

// ── Shared tooltip ───────────────────────────────────────────────────────────
const formatQuarter = (date?: string) => {
  if (!date) return "";
  const d = new Date(date);
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
};

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; fill?: string; stroke?: string }[];
  label?: string;
  format: (v: number) => string;
}

const ChartTooltip = ({ active, payload, label, format }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-[#424975] bg-[#151624] p-3 text-sm shadow-lg">
      <p className="mb-1 font-medium text-gray-200">{formatQuarter(label)}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.fill ?? entry.stroke }}>
          {entry.name}: {format(entry.value)}
        </p>
      ))}
    </div>
  );
};

// ── Base chart ───────────────────────────────────────────────────────────────
interface ChartConfig {
  title: string;
  bars: { dataKey: string; name: string; color: string }[];
  lines?: { dataKey: string; name: string; color: string }[];
  format: (v: number) => string;
}

const IncomeChart = ({
  config,
  data,
  period,
  onPeriodChange,
  isLoading,
}: {
  config: ChartConfig;
  data: FMPIncomeStatementResult[];
  period: Period;
  onPeriodChange: (p: Period) => void;
  isLoading: boolean;
}) => {
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
          {config.title}
        </h2>
        <PeriodToggle period={period} onChange={onPeriodChange} />
      </div>
      <ResponsiveContainer width="100%" height={480}>
        <ComposedChart
          data={data}
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
            tickFormatter={config.format}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            width={70}
          />
          <Tooltip
            content={<ChartTooltip format={config.format} />}
          />
          <Legend wrapperStyle={{ color: "#9ca3af", paddingTop: "8px" }} />
          {config.bars.map((b) => (
            <Bar key={b.dataKey} dataKey={b.dataKey} name={b.name} fill={b.color} />
          ))}
          {config.lines?.map((l) => (
            <Line
              key={l.dataKey}
              type="monotone"
              dataKey={l.dataKey}
              name={l.name}
              stroke={l.color}
              strokeWidth={2}
              dot={{ fill: l.color, r: 3 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Hook shared by all components ────────────────────────────────────────────
function useIncomeData(symbol: string | undefined, period: Period) {
  const { data, isLoading } = api.asset.equityFundamentalIncome.useQuery(
    { symbol: symbol ?? "", period: "quarter" },
    {
      enabled: !!symbol,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  // Deduplicate by date to prevent Recharts key collisions from restated filings
  const deduped = Array.from(
    new Map((data ?? []).map((item) => [item.date, item])).values(),
  );

  const chartData = period === "ttm" ? applyTTM(deduped) : deduped;

  return { chartData, isLoading };
}

// ── Revenue ──────────────────────────────────────────────────────────────────
export const Revenue = () => {
  const [symbol] = useSymbol();
  const [period, setPeriod] = useState<Period>("ttm");
  const { chartData, isLoading } = useIncomeData(symbol, period);

  return (
    <IncomeChart
      config={{
        title: "Revenue",
        bars: [{ dataKey: "revenue", name: "Revenue", color: "#4DA6B3" }],
        lines: [{ dataKey: "grossProfit", name: "Gross Profit", color: "#7CB342" }],
        format: (v) => `$${formatLargeNumber(v)}`,
      }}
      data={chartData}
      period={period}
      onPeriodChange={setPeriod}
      isLoading={isLoading}
    />
  );
};

// ── EBITDA ───────────────────────────────────────────────────────────────────
export const EBITDA = () => {
  const [symbol] = useSymbol();
  const [period, setPeriod] = useState<Period>("ttm");
  const { chartData, isLoading } = useIncomeData(symbol, period);

  return (
    <IncomeChart
      config={{
        title: "EBITDA",
        bars: [{ dataKey: "ebitda", name: "EBITDA", color: "#5C6BC0" }],
        lines: [{ dataKey: "operatingIncome", name: "Operating Income", color: "#FF9800" }],
        format: (v) => `$${formatLargeNumber(v)}`,
      }}
      data={chartData}
      period={period}
      onPeriodChange={setPeriod}
      isLoading={isLoading}
    />
  );
};

// ── Net Income ───────────────────────────────────────────────────────────────
export const NetIncome = () => {
  const [symbol] = useSymbol();
  const [period, setPeriod] = useState<Period>("ttm");
  const { chartData, isLoading } = useIncomeData(symbol, period);

  return (
    <IncomeChart
      config={{
        title: "Net Income",
        bars: [{ dataKey: "netIncome", name: "Net Income", color: "#7CB342" }],
        format: (v) => `$${formatLargeNumber(v)}`,
      }}
      data={chartData}
      period={period}
      onPeriodChange={setPeriod}
      isLoading={isLoading}
    />
  );
};

// ── EPS ──────────────────────────────────────────────────────────────────────
export const EPS = () => {
  const [symbol] = useSymbol();
  const [period, setPeriod] = useState<Period>("ttm");
  const { chartData, isLoading } = useIncomeData(symbol, period);

  return (
    <IncomeChart
      config={{
        title: "Earnings Per Share",
        bars: [{ dataKey: "epsdiluted", name: "EPS Diluted", color: "#5C6BC0" }],
        lines: [{ dataKey: "eps", name: "EPS Basic", color: "#7CB342" }],
        format: (v) => `$${v.toFixed(2)}`,
      }}
      data={chartData}
      period={period}
      onPeriodChange={setPeriod}
      isLoading={isLoading}
    />
  );
};

// ── Expenses ─────────────────────────────────────────────────────────────────
export const Expenses = () => {
  const [symbol] = useSymbol();
  const [period, setPeriod] = useState<Period>("ttm");
  const { chartData, isLoading } = useIncomeData(symbol, period);

  return (
    <IncomeChart
      config={{
        title: "Expenses",
        bars: [
          { dataKey: "costOfRevenue", name: "Cost of Revenue", color: "#F28B82" },
          { dataKey: "researchAndDevelopmentExpenses", name: "R&D", color: "#5C6BC0" },
          {
            dataKey: "sellingGeneralAndAdministrativeExpenses",
            name: "SG&A",
            color: "#FF9800",
          },
        ],
        lines: [
          { dataKey: "operatingExpenses", name: "Total OpEx", color: "#7CB342" },
        ],
        format: (v) => `$${formatLargeNumber(v)}`,
      }}
      data={chartData}
      period={period}
      onPeriodChange={setPeriod}
      isLoading={isLoading}
    />
  );
};

// ── Margin Trends ────────────────────────────────────────────────────────────
export const MarginTrends = () => {
  const [symbol] = useSymbol();
  const [period, setPeriod] = useState<Period>("ttm");
  const { chartData, isLoading } = useIncomeData(symbol, period);

  const marginData = chartData.map((d) => ({
    date: d.date,
    grossMargin: d.revenue ? (d.grossProfit / d.revenue) * 100 : 0,
    operatingMargin: d.revenue ? (d.operatingIncome / d.revenue) * 100 : 0,
    netMargin: d.revenue ? (d.netIncome / d.revenue) * 100 : 0,
  }));

  const fmt = (v: number) => `${v.toFixed(1)}%`;

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
        <h2 className="text-center text-xl font-semibold text-gray-200">Margin Trends</h2>
        <PeriodToggle period={period} onChange={setPeriod} />
      </div>
      <ResponsiveContainer width="100%" height={480}>
        <ComposedChart data={marginData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
            tickFormatter={fmt}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            width={55}
          />
          <Tooltip content={<ChartTooltip format={fmt} />} />
          <Legend wrapperStyle={{ color: "#9ca3af", paddingTop: "8px" }} />
          <Line type="monotone" dataKey="grossMargin" name="Gross Margin" stroke="#4DA6B3" strokeWidth={2} dot={{ fill: "#4DA6B3", r: 2 }} />
          <Line type="monotone" dataKey="operatingMargin" name="Operating Margin" stroke="#FF9800" strokeWidth={2} dot={{ fill: "#FF9800", r: 2 }} />
          <Line type="monotone" dataKey="netMargin" name="Net Margin" stroke="#7CB342" strokeWidth={2} dot={{ fill: "#7CB342", r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Shares Outstanding ───────────────────────────────────────────────────────
export const SharesOutstanding = () => {
  const [symbol] = useSymbol();
  const { data, isLoading } = api.asset.equityFundamentalIncome.useQuery(
    { symbol: symbol ?? "", period: "quarter" },
    {
      enabled: !!symbol,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  const chartData = Array.from(
    new Map((data ?? []).map((item) => [item.date, item])).values(),
  );

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
        Shares Outstanding
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
            tickFormatter={(v: number) => formatLargeNumber(v)}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            width={70}
          />
          <Tooltip
            content={
              <ChartTooltip format={(v) => formatLargeNumber(v)} />
            }
          />
          <Legend wrapperStyle={{ color: "#9ca3af", paddingTop: "8px" }} />
          <Line
            type="monotone"
            dataKey="weightedAverageShsOutDil"
            name="Diluted Shares"
            stroke="#4DA6B3"
            strokeWidth={2}
            dot={{ fill: "#4DA6B3", r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="weightedAverageShsOut"
            name="Basic Shares"
            stroke="#7CB342"
            strokeWidth={2}
            dot={{ fill: "#7CB342", r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

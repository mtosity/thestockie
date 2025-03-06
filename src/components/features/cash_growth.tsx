"use client";
import { useState } from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Legend,
  Line,
} from "recharts";
import { useSymbol } from "~/hooks/use-symbol";
import { formatLargeNumber, openInNewTab } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { InfoIcon, LineChartIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  TooltipProvider,
  TooltipTrigger,
  Tooltip,
  TooltipContent,
} from "../ui/tooltip";

// Add type for available metrics
type CashMetric =
  | "operating_cash_flow"
  | "free_cash_flow"
  | "net_cash_from_operating_activities"
  | "net_cash_from_investing_activities"
  | "net_cash_from_financing_activities";

const METRICS: Record<CashMetric, { name: string; color: string }> = {
  operating_cash_flow: {
    name: "Operating Cash Flow",
    color: "#7CB342",
  },
  free_cash_flow: {
    name: "Free Cash Flow",
    color: "#5C6BC0",
  },
  net_cash_from_operating_activities: {
    name: "Net Cash From Operating Activities",
    color: "#4CAF50",
  },
  net_cash_from_investing_activities: {
    name: "Net Cash From Investing Activities",
    color: "#FF9800",
  },
  net_cash_from_financing_activities: {
    name: "Net Cash From Financing Activities",
    color: "#2196F3",
  },
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: {
    name: string;
    value: number;
    fill?: string;
    stroke?: string;
    dataKey?: string;
  }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload?.length) {
    return (
      <div
        style={{
          backgroundColor: "#f8f9fa",
          padding: "10px",
          border: "1px solid #e9ecef",
          borderRadius: "4px",
        }}
      >
        <p className="label">{`Period: ${label}`}</p>
        {payload.map((pld) => (
          <p key={pld.name} style={{ color: pld.fill ?? pld.stroke }}>
            {`${pld.name}: ${formatLargeNumber(pld.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const formatQuarter = (dateStr: string) => {
  const date = new Date(dateStr);
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
};

export const CashGrowth = () => {
  const [symbol] = useSymbol();
  const [selectedMetrics, setSelectedMetrics] = useState<Set<CashMetric>>(
    new Set([
      "operating_cash_flow",
      "free_cash_flow",
      "net_cash_from_operating_activities",
    ]),
  );

  const { data, isLoading } = api.asset.equityFundamentalCash.useQuery(symbol);
  const sortedData = data?.results?.sort(
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
      <div className="flex justify-between pt-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon className="ml-4 h-5 w-5 text-gray-400 hover:text-gray-300" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] space-y-2 p-4 text-sm">
              <p>📊 Choose different metrics using the dropdown menu</p>
              <p>📅 Click on any quarter in the chart to view SEC filings</p>
              <p>💡 Hover over data points for detailed values</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <h2 className="mt-2 text-center text-xl font-semibold text-gray-200">
          Cash Flow
        </h2>

        <div className="px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between text-black"
              >
                <span>Select Metrics</span>
                <LineChartIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="start">
              <DropdownMenuLabel>Cash Flow Metrics</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(METRICS).map(([key, { name, color }]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={selectedMetrics.has(key as CashMetric)}
                  onCheckedChange={(checked) => {
                    const newMetrics = new Set(selectedMetrics);
                    if (checked) {
                      newMetrics.add(key as CashMetric);
                    } else {
                      newMetrics.delete(key as CashMetric);
                    }
                    setSelectedMetrics(newMetrics);
                  }}
                >
                  <div className="flex items-center">
                    <div
                      className="mr-2 h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {name}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart
          data={sortedData ?? []}
          margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="period_ending"
            className="cursor-pointer"
            tickFormatter={formatQuarter}
            angle={-45}
            textAnchor="end"
            textDecoration={"underline"}
            height={60}
            onTouchStart={(_d, _i, e) => e.stopPropagation()}
            onMouseDown={(_d, _i, e) => e.stopPropagation()}
            onClick={(_d, idx, e) => {
              e.stopPropagation();
              if (sortedData?.[idx]?.final_link) {
                openInNewTab(sortedData?.[idx].final_link);
              }
            }}
          />
          <YAxis tickFormatter={formatLargeNumber} />
          <ChartTooltip content={<CustomTooltip />} />
          <Legend />
          {selectedMetrics.has("operating_cash_flow") && (
            <Bar
              dataKey="operating_cash_flow"
              fill="#5C6BC0"
              name="Operating Cash Flow"
            />
          )}
          {selectedMetrics.has("free_cash_flow") && (
            <Bar
              dataKey="free_cash_flow"
              fill="#7CB342"
              name="Free Cash Flow"
            />
          )}
          {selectedMetrics.has("net_cash_from_operating_activities") && (
            <Line
              type="monotone"
              dataKey="net_cash_from_operating_activities"
              name="Net Cash From Operating Activities"
              stroke="#4CA"
              dot={{ fill: "#4CA" }}
              strokeWidth={2}
            />
          )}
          {selectedMetrics.has("net_cash_from_investing_activities") && (
            <Line
              type="monotone"
              dataKey="net_cash_from_investing_activities"
              name="Net Cash From Investing Activities"
              stroke="#FF9800"
              dot={{ fill: "#FF9800" }}
              strokeWidth={2}
            />
          )}
          {selectedMetrics.has("net_cash_from_financing_activities") && (
            <Line
              type="monotone"
              dataKey="net_cash_from_financing_activities"
              name="Net Cash From Financing Activities"
              stroke="#2196F3"
              dot={{ fill: "#2196F3" }}
              strokeWidth={2}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

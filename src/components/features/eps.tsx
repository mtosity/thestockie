import { api } from "~/trpc/react";
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
import { useSymbol } from "~/hooks/use-symbol";

const formatQuarter = (date?: string) => {
  if (!date) return "";
  const d = new Date(date);
  return `Q${Math.floor((d.getMonth() + 3) / 3)} ${d.getFullYear()}`;
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
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <p className="mb-2 font-medium">{formatQuarter(label)}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.fill ?? entry.stroke }}>
            {entry.name}: {entry.value?.toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const HistoricalEPS = () => {
  const [symbol] = useSymbol();
  const { data, isLoading } = api.asset.equityFundamentalHistoricalEPS.useQuery(
    symbol ?? "",
    {
      enabled: !!symbol,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const sortedData = data?.results?.sort(
    (a, b) =>
      new Date(a.period_ending).getTime() - new Date(b.period_ending).getTime(),
  );

  return (
    <div className="w-full">
      <h2 className="mt-2 text-center text-xl font-semibold text-gray-200">
        Earnings Per Share
      </h2>
      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart
          data={sortedData}
          margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="period_ending"
            tickFormatter={formatQuarter}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="eps_actual"
            fill="#5C6BC0"
            name="EPS Actual"
            barSize={44}
          />
          <Line
            type="monotone"
            dataKey="eps_estimated"
            stroke="#7CB342"
            strokeWidth={2}
            name="EPS Estimated"
            dot={{ fill: "#7CB342" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

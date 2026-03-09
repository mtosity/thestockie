"use client";
import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";
import { formatLargeNumber } from "~/lib/utils";
import { ExternalLink } from "lucide-react";

export const CompanyProfile = () => {
  const [symbol] = useSymbol();
  const { data, isLoading } = api.asset.companyProfile.useQuery(symbol ?? "", {
    enabled: !!symbol,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex animate-pulse flex-col gap-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-gray-700" style={{ width: `${60 + (i % 3) * 15}%` }} />
        ))}
        <div className="mt-2 h-20 rounded bg-gray-700" />
      </div>
    );
  }

  if (!data) return null;

  const rows = [
    { label: "CEO", value: data.ceo },
    {
      label: "Website",
      value: data.website ? (
        <a
          href={data.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-400 hover:underline"
        >
          {data.website.replace(/^https?:\/\//, "")}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null,
    },
    { label: "Sector", value: data.sector },
    { label: "Industry", value: data.industry },
    {
      label: "Employees",
      value: data.fullTimeEmployees
        ? Number(data.fullTimeEmployees).toLocaleString()
        : null,
    },
    { label: "Market Cap", value: data.mktCap ? formatLargeNumber(data.mktCap) : null },
    { label: "Beta", value: data.beta?.toFixed(3) },
    { label: "IPO Date", value: data.ipoDate },
  ];

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <div className="space-y-2">
        {rows.map(({ label, value }) =>
          value ? (
            <div key={label} className="flex items-start justify-between gap-4 text-sm">
              <span className="shrink-0 text-gray-400">{label}</span>
              <span className="text-right font-medium text-gray-100">{value}</span>
            </div>
          ) : null,
        )}
      </div>
      {data.description && (
        <p className="mt-4 text-sm leading-relaxed text-gray-400">{data.description}</p>
      )}
    </div>
  );
};

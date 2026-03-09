"use client";
import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";
import { formatLargeNumber } from "~/lib/utils";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="w-48 shrink-0 space-y-0.5">
    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#5c6bc0]">
      {title}
    </p>
    {children}
  </div>
);

const Row = ({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) => (
  <div className="flex items-baseline justify-between gap-1">
    <span className="shrink-0 text-xs text-gray-400">{label}</span>
    <div className="text-right">
      <span className={`font-mono text-sm font-medium ${color ?? "text-gray-200"}`}>
        {value}
      </span>
      {sub && <div className="text-[10px] text-gray-500">{sub}</div>}
    </div>
  </div>
);

export const Fundamentals = () => {
  const [symbol] = useSymbol();

  const queryOpts = {
    enabled: !!symbol,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  } as const;

  const { data: multiples, isLoading: loadingM } =
    api.asset.equityFundamentalMultiples.useQuery(symbol ?? "", queryOpts);

  const { data: quoteData } = api.asset.equityQuote.useQuery(symbol ?? "", queryOpts);

  const { data: balanceData } = api.asset.equityFundamentalBalance.useQuery(
    symbol ?? "",
    queryOpts,
  );

  const { data: incomeData } = api.asset.equityFundamentalIncome.useQuery(
    { symbol: symbol ?? "", period: "quarter" },
    queryOpts,
  );

  if (loadingM) {
    return (
      <div className="h-full w-full animate-pulse p-3">
        <div className="flex flex-wrap gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-3 w-36 rounded bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  const m = multiples?.results?.[0];
  const q = quoteData?.[0];
  if (!m) return null;

  // Balance: most recent entry (FMP returns newest first)
  const bal = balanceData?.results?.[0];
  const cash = (bal?.cash_and_cash_equivalents ?? 0) + (bal?.short_term_investments ?? 0);
  const debt = (bal?.long_term_debt ?? 0) + (bal?.short_term_debt ?? 0);
  const netCash = cash - debt;

  // Income: sorted descending (newest first)
  const sortedIncome = (incomeData ?? [])
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const last4 = sortedIncome.slice(0, 4);
  const ttmRevenue = last4.reduce((s, d) => s + d.revenue, 0);
  const ttmNetIncome = last4.reduce((s, d) => s + d.netIncome, 0);
  const ttmOperatingIncome = last4.reduce((s, d) => s + d.operatingIncome, 0);

  const profitMargin = ttmRevenue ? (ttmNetIncome / ttmRevenue) * 100 : 0;
  const operatingMargin = ttmRevenue ? (ttmOperatingIncome / ttmRevenue) * 100 : 0;

  // YoY: most recent quarter vs same quarter last year
  const recent = sortedIncome[0];
  const prevYear = sortedIncome[4];
  const revenueYoY =
    prevYear?.revenue && recent
      ? ((recent.revenue - prevYear.revenue) / Math.abs(prevYear.revenue)) * 100
      : null;
  const epsYoY =
    prevYear?.netIncome && recent
      ? ((recent.netIncome - prevYear.netIncome) / Math.abs(prevYear.netIncome)) * 100
      : null;

  // FCF & SBC
  const price = q?.price ?? 0;
  const fcfPerShare = m.free_cash_flow_per_share_ttm;
  const revenuePerShare = m.revenue_per_share_ttm;
  const sbcPerShare = m.stock_based_compensation_to_revenue_ttm * revenuePerShare;
  const adjFcfPerShare = fcfPerShare - sbcPerShare;
  const fcfYield = price ? (fcfPerShare / price) * 100 : 0;
  const adjFcfYield = price ? (adjFcfPerShare / price) * 100 : 0;
  const sbcImpact = fcfPerShare ? (sbcPerShare / fcfPerShare) * 100 : 0;

  const f2 = (v: number) => v.toFixed(2);
  const fmtPct = (v: number) => `${v.toFixed(2)}%`;
  const yoy = (v: number) =>
    `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

  return (
    <div className="h-full w-full overflow-y-auto p-3">
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        {/* Valuation */}
        <Section title="Valuation">
          <Row
            label="Market Cap"
            value={`$${formatLargeNumber(q?.marketCap ?? m.market_cap_ttm)}`}
          />
          <Row label="PE (TTM)" value={f2(m.pe_ratio_ttm)} />
          <Row label="Price to Sales" value={f2(m.price_to_sales_ratio_ttm)} />
          <Row label="EV / EBITDA" value={f2(m.enterprise_value_over_ebitda_ttm)} />
          <Row label="Price to Book" value={f2(m.pb_ratio_ttm)} />
        </Section>

        {/* Cash Flow */}
        <Section title="Cash Flow">
          <Row
            label="FCF Yield"
            value={fmtPct(fcfYield)}
            sub={`$${f2(fcfPerShare)} / $${f2(price)}`}
          />
          <Row
            label="SBC Adj. FCF Yield"
            value={fmtPct(adjFcfYield)}
            sub={`$${f2(adjFcfPerShare)} / $${f2(price)}`}
          />
          <Row
            label="SBC Impact"
            value={`-${fmtPct(Math.abs(sbcImpact))}`}
            color="text-red-400"
          />
        </Section>

        {/* Margins & Growth */}
        <Section title="Margins & Growth">
          <Row label="Profit Margin" value={fmtPct(profitMargin)} />
          <Row label="Operating Margin" value={fmtPct(operatingMargin)} />
          {revenueYoY !== null && (
            <Row
              label="Revenue (YoY)"
              value={yoy(revenueYoY)}
              color={revenueYoY >= 0 ? "text-green-400" : "text-red-400"}
            />
          )}
          {epsYoY !== null && (
            <Row
              label="Earnings (YoY)"
              value={yoy(epsYoY)}
              color={epsYoY >= 0 ? "text-green-400" : "text-red-400"}
            />
          )}
        </Section>

        {/* Balance */}
        <Section title="Balance">
          <Row label="Cash" value={`$${formatLargeNumber(cash)}`} />
          <Row label="Debt" value={`$${formatLargeNumber(debt)}`} />
          <Row
            label="Net Cash"
            value={`${netCash >= 0 ? "" : "-"}$${formatLargeNumber(Math.abs(netCash))}`}
            color={netCash >= 0 ? "text-green-400" : "text-red-400"}
          />
        </Section>

        {/* Dividend */}
        <Section title="Dividend">
          <Row label="Dividend Yield" value={fmtPct(m.dividend_yield_percentage_ttm)} />
          <Row label="Payout Ratio" value={fmtPct(m.payout_ratio_ttm * 100)} />
        </Section>
      </div>
    </div>
  );
};

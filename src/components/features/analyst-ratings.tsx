"use client";

import { useState } from "react";
import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";
import { ThumbsUp, ArrowUp, ArrowDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

// Major firms ranked roughly by reputation / AUM influence
const TIER1_FIRMS = new Set([
  "Goldman Sachs", "Morgan Stanley", "JP Morgan", "JPMorgan Chase", "J.P. Morgan",
  "Bank of America", "Barclays", "Citigroup", "Citi", "UBS", "Deutsche Bank",
  "Credit Suisse", "Wells Fargo", "Jefferies", "RBC Capital", "RBC Capital Markets",
  "Raymond James", "Piper Sandler", "Bernstein",
  "Evercore ISI", "Evercore", "Wolfe Research", "Cowen", "TD Cowen",
  "BMO Capital", "BMO Capital Markets", "Truist Financial", "Truist",
  "Needham", "Stifel", "Stifel Nicolaus", "Oppenheimer", "KeyBanc",
  "KeyBanc Capital Markets", "Mizuho", "HSBC", "Canaccord Genuity",
  "Wedbush", "Loop Capital", "DA Davidson", "D.A. Davidson",
  "Baird", "Robert W. Baird", "Rosenblatt", "Argus", "CFRA",
]);

function isTier1(firm: string) {
  if (TIER1_FIRMS.has(firm)) return true;
  for (const t of TIER1_FIRMS) {
    if (firm.includes(t) || t.includes(firm)) return true;
  }
  return false;
}

function gradeColor(grade: string): string {
  const g = grade.toLowerCase();
  if (g.includes("strong buy") || g.includes("conviction")) return "text-green-400";
  if (g.includes("buy") || g.includes("outperform") || g.includes("overweight") || g.includes("positive") || g.includes("accumulate")) return "text-green-300";
  if (g.includes("hold") || g.includes("neutral") || g.includes("equal") || g.includes("market perform") || g.includes("peer perform") || g.includes("sector perform") || g.includes("in-line")) return "text-yellow-300";
  if (g.includes("sell") || g.includes("underperform") || g.includes("underweight") || g.includes("negative") || g.includes("reduce")) return "text-red-400";
  return "text-gray-300";
}

function gradeBgColor(grade: string): string {
  const g = grade.toLowerCase();
  if (g.includes("strong buy") || g.includes("conviction")) return "bg-green-500/20";
  if (g.includes("buy") || g.includes("outperform") || g.includes("overweight") || g.includes("positive") || g.includes("accumulate")) return "bg-green-500/10";
  if (g.includes("hold") || g.includes("neutral") || g.includes("equal") || g.includes("market perform") || g.includes("peer perform") || g.includes("sector perform") || g.includes("in-line")) return "bg-yellow-500/10";
  if (g.includes("sell") || g.includes("underperform") || g.includes("underweight") || g.includes("negative") || g.includes("reduce")) return "bg-red-500/10";
  return "bg-white/5";
}

function getDirection(prev: string, next: string): "upgrade" | "downgrade" | "same" {
  const rank = (g: string) => {
    const gl = g.toLowerCase();
    if (["strong buy", "conviction"].some((b) => gl.includes(b))) return 3;
    if (["buy", "outperform", "overweight", "positive", "accumulate"].some((b) => gl.includes(b))) return 2;
    if (["hold", "neutral", "equal", "market perform", "peer perform", "sector perform", "in-line"].some((n) => gl.includes(n))) return 1;
    if (["sell", "underperform", "underweight", "negative", "reduce"].some((b) => gl.includes(b))) return 0;
    return 1;
  };
  const diff = rank(next) - rank(prev);
  if (diff > 0) return "upgrade";
  if (diff < 0) return "downgrade";
  return "same";
}

export const AnalystRatings = () => {
  const [symbol] = useSymbol();
  const [showAll, setShowAll] = useState(false);

  const { data: recommendations, isLoading: loadingRec } =
    api.asset.analystRecommendations.useQuery(symbol ?? "", {
      enabled: !!symbol,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    });

  const { data: grades, isLoading: loadingGrades } =
    api.asset.stockGrades.useQuery(symbol ?? "", {
      enabled: !!symbol,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    });

  const isLoading = loadingRec || loadingGrades;

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
          <ThumbsUp className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold text-gray-200">Analyst Ratings</span>
        </div>
        <div className="flex-1 space-y-3 p-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="ml-auto h-3 w-14 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const latest = recommendations?.[0];
  const hasGrades = grades && grades.length > 0;

  if (!latest && !hasGrades) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
          <ThumbsUp className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold text-gray-200">Analyst Ratings</span>
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
          No analyst data
        </div>
      </div>
    );
  }

  // Consensus summary
  const strongBuy = latest?.analystRatingsStrongBuy ?? 0;
  const buy = latest?.analystRatingsbuy ?? 0;
  const hold = latest?.analystRatingsHold ?? 0;
  const sell = latest?.analystRatingsSell ?? 0;
  const strongSell = latest?.analystRatingsStrongSell ?? 0;
  const total = strongBuy + buy + hold + sell + strongSell;

  const categories = [
    { label: "Strong Buy", count: strongBuy, color: "bg-green-500", textColor: "text-green-400" },
    { label: "Buy", count: buy, color: "bg-green-400", textColor: "text-green-300" },
    { label: "Hold", count: hold, color: "bg-yellow-400", textColor: "text-yellow-300" },
    { label: "Sell", count: sell, color: "bg-red-400", textColor: "text-red-300" },
    { label: "Strong Sell", count: strongSell, color: "bg-red-500", textColor: "text-red-400" },
  ];

  const bullish = strongBuy + buy;
  const bearish = sell + strongSell;
  let consensus = "Hold";
  let consensusColor = "text-yellow-400";
  if (bullish > bearish + hold) {
    consensus = "Buy";
    consensusColor = "text-green-400";
  } else if (bearish > bullish + hold) {
    consensus = "Sell";
    consensusColor = "text-red-400";
  }

  // Sort grades: tier1 first, then by date desc
  const sortedGrades = [...(grades ?? [])].sort((a, b) => {
    const aTier = isTier1(a.gradingCompany) ? 0 : 1;
    const bTier = isTier1(b.gradingCompany) ? 0 : 1;
    if (aTier !== bTier) return aTier - bTier;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Deduplicate: keep latest grade per firm
  const seenFirms = new Set<string>();
  const latestPerFirm = sortedGrades.filter((g) => {
    const key = g.gradingCompany.toLowerCase();
    if (seenFirms.has(key)) return false;
    seenFirms.add(key);
    return true;
  });

  const displayGrades = showAll ? latestPerFirm : latestPerFirm.slice(0, 10);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <ThumbsUp className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold text-gray-200">Analyst Ratings</span>
        </div>
        <span className={`text-sm font-bold ${consensusColor}`}>{consensus}</span>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Consensus distribution bar */}
        {total > 0 && (
          <div className="px-4 pt-3">
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {categories.map(
                (cat) =>
                  cat.count > 0 && (
                    <div
                      key={cat.label}
                      className={`${cat.color} transition-all`}
                      style={{ width: `${(cat.count / total) * 100}%` }}
                      title={`${cat.label}: ${cat.count}`}
                    />
                  ),
              )}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-gray-500">
              <span>{bullish} Buy</span>
              <span>{hold} Hold</span>
              <span>{bearish} Sell</span>
            </div>
          </div>
        )}

        {/* Per-firm grades */}
        {displayGrades.length > 0 && (
          <div className="mt-2">
            <div className="border-b border-white/5 px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Firm Ratings (latest per firm)
            </div>
            {displayGrades.map((grade, idx) => {
              const tier1 = isTier1(grade.gradingCompany);
              const direction =
                grade.previousGrade
                  ? getDirection(grade.previousGrade, grade.newGrade)
                  : "same";

              return (
                <div
                  key={`${grade.gradingCompany}-${idx}`}
                  className="flex items-center gap-2 border-b border-white/5 px-3 py-1.5 transition-colors hover:bg-white/5"
                >
                  {/* Direction icon */}
                  <div className="shrink-0">
                    {direction === "upgrade" && (
                      <ArrowUp className="h-3 w-3 text-green-400" />
                    )}
                    {direction === "downgrade" && (
                      <ArrowDown className="h-3 w-3 text-red-400" />
                    )}
                    {direction === "same" && (
                      <Minus className="h-3 w-3 text-gray-500" />
                    )}
                  </div>

                  {/* Firm name */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span
                        className={`truncate text-xs font-medium ${tier1 ? "text-gray-100" : "text-gray-400"}`}
                      >
                        {grade.gradingCompany}
                      </span>
                      {tier1 && (
                        <span className="shrink-0 rounded bg-blue-500/20 px-1 py-0.5 text-[8px] font-bold text-blue-300">
                          TOP
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {format(new Date(grade.date), "MMM d, yyyy")}
                    </div>
                  </div>

                  {/* Grade badge */}
                  <div
                    className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${gradeBgColor(grade.newGrade)} ${gradeColor(grade.newGrade)}`}
                  >
                    {grade.newGrade}
                  </div>
                </div>
              );
            })}

            {/* Show more / less */}
            {latestPerFirm.length > 10 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="flex w-full items-center justify-center gap-1 py-2 text-[11px] text-purple-400 transition-colors hover:text-purple-300"
              >
                {showAll ? (
                  <>
                    Show less <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Show all {latestPerFirm.length} firms{" "}
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

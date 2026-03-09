"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";

const MCAP_OPTIONS = [0, 1e9, 10e9, 100e9] as const;
type McapOption = (typeof MCAP_OPTIONS)[number];

function mcapToParam(cap: McapOption): string {
  if (cap === 0) return "all";
  if (cap === 1e9) return "1b";
  if (cap === 10e9) return "10b";
  return "100b";
}

function paramToMcap(param: string | null): McapOption {
  if (param === "all") return 0;
  if (param === "10b") return 10e9;
  if (param === "100b") return 100e9;
  return 1e9;
}

function isUSCompany(country: string): boolean {
  return country === "US";
}

function getWeekRange(date: Date): { from: Date; to: Date } {
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return { from: monday, to: friday };
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr: string): { weekday: string; date: string } {
  const d = new Date(dateStr + "T12:00:00");
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

function isToday(dateStr: string): boolean {
  return formatDate(new Date()) === dateStr;
}

function CompanyLogo({ symbol }: { symbol: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-xs font-bold text-gray-300">
      {symbol.slice(0, 2)}
    </div>
  ) : (
    <Image
      src={`https://financialmodelingprep.com/image-stock/${symbol}.png`}
      alt={symbol}
      width={40}
      height={40}
      className="rounded-md object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export function EarningsCalendar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [weekStart, setWeekStart] = useState(() => {
    const weekParam = searchParams.get("week");
    if (weekParam) {
      const d = new Date(weekParam + "T12:00:00");
      const { from } = getWeekRange(d);
      return from;
    }
    return getWeekRange(new Date()).from;
  });
  const [usOnly, setUsOnly] = useState(
    () => searchParams.get("region") !== "global",
  );
  const [minMarketCap, setMinMarketCap] = useState<McapOption>(() =>
    paramToMcap(searchParams.get("mcap")),
  );

  const updateURL = (week: Date, us: boolean, mcap: McapOption) => {
    const params = new URLSearchParams();
    const defaultWeek = formatDate(getWeekRange(new Date()).from);
    if (formatDate(week) !== defaultWeek) params.set("week", formatDate(week));
    if (!us) params.set("region", "global");
    if (mcap !== 1e9) params.set("mcap", mcapToParam(mcap));
    const query = params.toString();
    router.replace(query ? `/earnings?${query}` : "/earnings", {
      scroll: false,
    });
  };

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);

  const { data, isLoading } = api.asset.earningsCalendar.useQuery(
    { from: formatDate(weekStart), to: formatDate(weekEnd) },
    { refetchOnWindowFocus: false, refetchOnMount: false },
  );

  const goToPrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
    updateURL(prev, usOnly, minMarketCap);
  };

  const goToNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
    updateURL(next, usOnly, minMarketCap);
  };

  const goToCurrentWeek = () => {
    const { from } = getWeekRange(new Date());
    setWeekStart(from);
    updateURL(from, usOnly, minMarketCap);
  };

  const weekDays: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push(formatDate(d));
  }

  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="min-h-screen bg-[#15162c] pb-20 text-white">
      <div className="p-3 md:p-4">
        {/* Controls row */}
        <div className="mb-4 flex flex-col gap-3">
          {/* Week navigation — full width on mobile */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevWeek}
              className="border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex w-56 flex-col items-center gap-0.5 sm:w-64">
              <span className="text-sm font-semibold sm:text-base">
                {weekLabel}
              </span>
              <button
                onClick={goToCurrentWeek}
                className="text-xs text-purple-400 transition-colors hover:text-purple-300"
              >
                This week
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
              className="border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/20"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters row — wraps on small screens */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* Market cap filter */}
            <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-1">
              {([0, 1e9, 10e9, 100e9] as const).map((cap) => (
                <button
                  key={cap}
                  onClick={() => {
                    setMinMarketCap(cap);
                    updateURL(weekStart, usOnly, cap);
                  }}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                    minMarketCap === cap
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {cap === 0
                    ? "All"
                    : cap === 1e9
                      ? "1B+"
                      : cap === 10e9
                        ? "10B+"
                        : "100B+"}
                </button>
              ))}
            </div>

            {/* US / Global toggle */}
            <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-1">
              <button
                onClick={() => {
                  setUsOnly(true);
                  updateURL(weekStart, true, minMarketCap);
                }}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  usOnly
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                🇺🇸 US Only
              </button>
              <button
                onClick={() => {
                  setUsOnly(false);
                  updateURL(weekStart, false, minMarketCap);
                }}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  !usOnly
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Global
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {weekDays.map((d) => (
              <DayColumnSkeleton key={d} dateStr={d} />
            ))}
          </div>
        ) : data && Object.keys(data).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
            <p className="text-lg font-semibold text-gray-300">
              No earnings data available
            </p>
            <p className="text-sm text-gray-500">
              Earnings data is typically available up to ~2 weeks ahead.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {weekDays.map((dateStr) => {
              const allCompanies = data?.[dateStr] ?? [];
              const companies = allCompanies
                .filter((c) => !usOnly || isUSCompany(c.country))
                .filter((c) => c.marketCap >= minMarketCap);
              const label = formatDateLabel(dateStr);
              const today = isToday(dateStr);
              return (
                <div
                  key={dateStr}
                  className={`flex flex-col rounded-lg border ${
                    today
                      ? "border-purple-500/60 bg-purple-900/10"
                      : "border-[#424975] bg-[#151624]"
                  }`}
                >
                  {/* Day header */}
                  <div
                    className={`flex items-center justify-between rounded-t-lg px-3 py-2 ${
                      today ? "bg-purple-500/20" : "bg-white/5"
                    }`}
                  >
                    <div>
                      <div
                        className={`text-xs font-semibold uppercase tracking-wide ${today ? "text-purple-300" : "text-gray-400"}`}
                      >
                        {label.weekday}
                      </div>
                      <div
                        className={`text-sm font-bold ${today ? "text-purple-200" : "text-white"}`}
                      >
                        {label.date}
                      </div>
                    </div>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-300">
                      {companies.length}
                    </span>
                  </div>

                  {/* Company grid */}
                  <div
                    className="flex-1 overflow-y-auto"
                    style={{ maxHeight: "calc(100vh - 260px)" }}
                  >
                    {companies.length === 0 ? (
                      <div className="flex h-16 items-center justify-center text-xs text-gray-500">
                        No earnings
                      </div>
                    ) : (
                      (() => {
                        const bmo = companies.filter((c) => c.time === "bmo");
                        const amc = companies.filter((c) => c.time === "amc");
                        const other = companies.filter(
                          (c) => c.time !== "bmo" && c.time !== "amc",
                        );

                        const renderGroup = (
                          group: typeof companies,
                          groupLabel: string,
                        ) => {
                          if (group.length === 0) return null;
                          return (
                            <div key={groupLabel}>
                              <div className="border-b border-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                {groupLabel}
                              </div>
                              <div
                                className="grid gap-0"
                                style={{
                                  gridTemplateColumns:
                                    "repeat(auto-fill, minmax(60px, 1fr))",
                                }}
                              >
                                {group.map((company, idx) => (
                                  <div
                                    key={`${company.symbol}-${idx}`}
                                    className="flex max-w-[80px] flex-col items-center gap-1 rounded-md p-1 transition-colors hover:bg-white/5"
                                    title={company.name}
                                  >
                                    <CompanyLogo symbol={company.symbol} />
                                    <span className="w-full truncate text-center font-mono text-[11px] font-semibold text-purple-300">
                                      {company.symbol}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        };

                        return (
                          <>
                            {renderGroup(bmo, "Before Market Open")}
                            {renderGroup(amc, "After Market Close")}
                            {renderGroup(other, "Time TBD")}
                          </>
                        );
                      })()
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DayColumnSkeleton({ dateStr }: { dateStr: string }) {
  const label = formatDateLabel(dateStr);
  const today = isToday(dateStr);
  return (
    <div
      className={`rounded-lg border ${today ? "border-purple-500/60 bg-purple-900/10" : "border-[#424975] bg-[#151624]"}`}
    >
      <div
        className={`flex items-center justify-between rounded-t-lg px-3 py-2 ${today ? "bg-purple-500/20" : "bg-white/5"}`}
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {label.weekday}
          </div>
          <div className="text-sm font-bold">{label.date}</div>
        </div>
        <div className="h-5 w-6 animate-pulse rounded-full bg-white/10" />
      </div>
      <div
        className="grid gap-0 p-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))" }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex max-w-[80px] flex-col items-center gap-1 p-1"
          >
            <div className="h-10 w-10 animate-pulse rounded-md bg-white/10" />
            <div className="h-2.5 w-8 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

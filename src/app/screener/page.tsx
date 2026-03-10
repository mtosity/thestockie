"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { ScreenerFilters } from "~/components/features/screener-filters";
import { ScreenerTable } from "~/components/features/screener-table";
import { Pagination } from "~/components/features/pagination";
import useDebounce from "~/hooks/use-debounce";

function ScreenerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sector, setSector] = useState("all");
  const [recommendation, setRecommendation] = useState("all");
  const [marketCapMin, setMarketCapMin] = useState("");
  const [marketCapMax, setMarketCapMax] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Initialize state from URL params on mount
  useEffect(() => {
    const urlSector = searchParams.get("sector") ?? "all";
    const urlRecommendation = searchParams.get("recommendation") ?? "all";
    const urlMarketCapMin = searchParams.get("marketCapMin") ?? "";
    const urlMarketCapMax = searchParams.get("marketCapMax") ?? "";
    const urlPage = parseInt(searchParams.get("page") ?? "1");
    const urlLimit = parseInt(searchParams.get("limit") ?? "20");

    setSector(urlSector);
    setRecommendation(urlRecommendation);
    setMarketCapMin(urlMarketCapMin);
    setMarketCapMax(urlMarketCapMax);
    setPage(urlPage);
    setLimit(urlLimit);
  }, [searchParams]);

  // Debounce text inputs to reduce API calls
  const debouncedMarketCapMin = useDebounce(marketCapMin, 500);
  const debouncedMarketCapMax = useDebounce(marketCapMax, 500);

  // Update URL when filters change
  const updateURL = (newParams: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === "" || value === "all" || value === 1) {
        params.delete(key);
      } else {
        params.set(key, value.toString());
      }
    });

    const newURL = params.toString() ? `?${params.toString()}` : "/screener";
    router.replace(newURL, { scroll: false });
  };

  const filters = {
    sector: sector === "all" ? undefined : sector,
    recommendation:
      recommendation === "all"
        ? undefined
        : (recommendation as "strong_buy" | "buy" | "hold" | "sell"),
    marketCapMin: debouncedMarketCapMin
      ? parseInt(debouncedMarketCapMin) * 1000000
      : undefined,
    marketCapMax: debouncedMarketCapMax
      ? parseInt(debouncedMarketCapMax) * 1000000
      : undefined,
    page,
    limit,
  };

  const { data: result, isLoading } = api.post.getAll.useQuery(filters);

  const handleClearFilters = () => {
    setSector("all");
    setRecommendation("all");
    setMarketCapMin("");
    setMarketCapMax("");
    setPage(1);

    updateURL({
      sector: "all",
      recommendation: "all",
      marketCapMin: "",
      marketCapMax: "",
      page: 1,
      limit: limit,
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateURL({
      sector,
      recommendation,
      marketCapMin,
      marketCapMax,
      page: newPage,
      limit,
    });
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    updateURL({
      sector,
      recommendation,
      marketCapMin,
      marketCapMax,
      page: 1,
      limit: newLimit,
    });
  };

  // Reset to page 1 when filters change
  const handleFilterChange =
    (filterSetter: (value: string) => void) => (value: string) => {
      filterSetter(value);
      setPage(1);

      const newFilters = {
        sector: filterSetter === setSector ? value : sector,
        recommendation:
          filterSetter === setRecommendation ? value : recommendation,
        marketCapMin: filterSetter === setMarketCapMin ? value : marketCapMin,
        marketCapMax: filterSetter === setMarketCapMax ? value : marketCapMax,
        page: 1,
        limit,
      };

      updateURL(newFilters);
    };

  const handleMarketCapChange =
    (filterSetter: (value: string) => void) => (value: string) => {
      filterSetter(value);
      setPage(1);

      const newFilters = {
        sector,
        recommendation,
        marketCapMin: filterSetter === setMarketCapMin ? value : marketCapMin,
        marketCapMax: filterSetter === setMarketCapMax ? value : marketCapMax,
        page: 1,
        limit,
      };

      updateURL(newFilters);
    };

  return (
    <div className="min-h-screen bg-[#15162c] pb-20 text-white">
      <div className="px-4 pt-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Screener</h1>
        </div>

        <ScreenerFilters
          sector={sector}
          recommendation={recommendation}
          marketCapMin={marketCapMin}
          marketCapMax={marketCapMax}
          onSectorChange={handleFilterChange(setSector)}
          onRecommendationChange={handleFilterChange(setRecommendation)}
          onMarketCapMinChange={handleMarketCapChange(setMarketCapMin)}
          onMarketCapMaxChange={handleMarketCapChange(setMarketCapMax)}
          onClearFilters={handleClearFilters}
        />

        <ScreenerTable stocks={result?.data ?? []} isLoading={isLoading} />
      </div>

      {result?.pagination && (
        <Pagination
          currentPage={result.pagination.page}
          totalPages={result.pagination.totalPages}
          total={result.pagination.total}
          limit={result.pagination.limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default function ScreenerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScreenerContent />
    </Suspense>
  );
}

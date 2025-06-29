"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { ScreenerFilters } from "~/components/features/screener-filters";
import { ScreenerTable } from "~/components/features/screener-table";
import { Pagination } from "~/components/features/pagination";
import useDebounce from "~/hooks/use-debounce";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function ScreenerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [symbol, setSymbol] = useState("");
  const [sector, setSector] = useState("all");
  const [recommendation, setRecommendation] = useState("all");
  const [marketCapMin, setMarketCapMin] = useState("");
  const [marketCapMax, setMarketCapMax] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Initialize state from URL params on mount
  useEffect(() => {
    const urlSymbol = searchParams.get("symbol") ?? "";
    const urlSector = searchParams.get("sector") ?? "all";
    const urlRecommendation = searchParams.get("recommendation") ?? "all";
    const urlMarketCapMin = searchParams.get("marketCapMin") ?? "";
    const urlMarketCapMax = searchParams.get("marketCapMax") ?? "";
    const urlPage = parseInt(searchParams.get("page") ?? "1");
    const urlLimit = parseInt(searchParams.get("limit") ?? "20");

    setSymbol(urlSymbol);
    setSector(urlSector);
    setRecommendation(urlRecommendation);
    setMarketCapMin(urlMarketCapMin);
    setMarketCapMax(urlMarketCapMax);
    setPage(urlPage);
    setLimit(urlLimit);
  }, [searchParams]);

  // Debounce text inputs to reduce API calls
  const debouncedSymbol = useDebounce(symbol, 500);
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
    symbol: debouncedSymbol ? debouncedSymbol : undefined,
    sector: sector === "all" ? undefined : sector,
    recommendation: recommendation === "all" ? undefined : (recommendation as "strong_buy" | "buy" | "hold" | "sell"),
    marketCapMin: debouncedMarketCapMin ? parseInt(debouncedMarketCapMin) * 1000000 : undefined,
    marketCapMax: debouncedMarketCapMax ? parseInt(debouncedMarketCapMax) * 1000000 : undefined,
    page,
    limit,
  };

  const { data: result, isLoading } = api.post.getAll.useQuery(filters);

  const handleClearFilters = () => {
    setSymbol("");
    setSector("all");
    setRecommendation("all");
    setMarketCapMin("");
    setMarketCapMax("");
    setPage(1);
    
    updateURL({
      symbol: "",
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
      symbol,
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
      symbol,
      sector,
      recommendation,
      marketCapMin,
      marketCapMax,
      page: 1,
      limit: newLimit,
    });
  };

  // Reset to page 1 when filters change
  const handleFilterChange = (filterSetter: (value: string) => void) => (value: string) => {
    filterSetter(value);
    setPage(1);
    
    const newFilters = {
      symbol: filterSetter === setSymbol ? value : symbol,
      sector: filterSetter === setSector ? value : sector,
      recommendation: filterSetter === setRecommendation ? value : recommendation,
      marketCapMin: filterSetter === setMarketCapMin ? value : marketCapMin,
      marketCapMax: filterSetter === setMarketCapMax ? value : marketCapMax,
      page: 1,
      limit,
    };
    
    updateURL(newFilters);
  };

  const handleMarketCapChange = (filterSetter: (value: string) => void) => (value: string) => {
    filterSetter(value);
    setPage(1);
    
    const newFilters = {
      symbol,
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
    <div className="min-h-screen bg-[#15162c] text-white pb-20">
      <div className="p-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go back to home page
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Screener</h1>
        </div>
        
        <ScreenerFilters
          symbol={symbol}
          sector={sector}
          recommendation={recommendation}
          marketCapMin={marketCapMin}
          marketCapMax={marketCapMax}
          onSymbolChange={handleFilterChange(setSymbol)}
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
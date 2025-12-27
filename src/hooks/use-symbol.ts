import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

const STORAGE_KEY = "symbol";
const DEFAULT_SYMBOL = "AAPL";

// Get initial symbol from localStorage (client-side only)
const getStoredSymbol = (): string => {
  if (typeof window === "undefined") return DEFAULT_SYMBOL;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SYMBOL;
};

export const useSymbol = (): [string, (symbol: string) => void] => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlSymbol = searchParams.get("symbol");

  // Use state to ensure reactivity
  const [symbol, setSymbolState] = useState<string>(() => {
    if (urlSymbol) return urlSymbol.toUpperCase();
    return getStoredSymbol();
  });

  // Sync state with URL params when they change (handles back/forward navigation)
  useEffect(() => {
    if (urlSymbol) {
      const upper = urlSymbol.toUpperCase();
      setSymbolState(upper);
      localStorage.setItem(STORAGE_KEY, upper);
    }
  }, [urlSymbol]);

  // On mount, if no URL param but localStorage has a symbol, update URL
  useEffect(() => {
    if (!urlSymbol) {
      const stored = getStoredSymbol();
      const params = new URLSearchParams(searchParams.toString());
      params.set("symbol", stored);
      router.replace(`${pathname}?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSymbol = useCallback(
    (newSymbol: string) => {
      const upperSymbol = newSymbol.toUpperCase();
      // Update state
      setSymbolState(upperSymbol);
      // Update localStorage
      localStorage.setItem(STORAGE_KEY, upperSymbol);
      // Update URL with pushState for browser history
      const params = new URLSearchParams(searchParams.toString());
      params.set("symbol", upperSymbol);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return [symbol, setSymbol];
};

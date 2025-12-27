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

  // Initialize from localStorage to avoid reading searchParams during initial render
  const [symbol, setSymbolState] = useState<string>(() => getStoredSymbol());

  // Keep URL as source of truth; sync state and localStorage, and initialize URL if missing
  useEffect(() => {
    if (urlSymbol) {
      // URL has a symbol - use it as source of truth
      const upper = urlSymbol.toUpperCase();
      setSymbolState(upper);
      localStorage.setItem(STORAGE_KEY, upper);
    } else {
      // No URL symbol - check localStorage and update URL if needed
      const stored = getStoredSymbol();
      const upper = stored.toUpperCase();
      setSymbolState(upper);
      
      // Only update URL if stored symbol is not the default
      // This avoids unnecessary navigation on every mount
      if (upper !== DEFAULT_SYMBOL) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("symbol", upper);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }
  }, [urlSymbol, searchParams, router, pathname]);

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

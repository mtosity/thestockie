import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

const STORAGE_KEY = "symbol";
const DEFAULT_SYMBOL = "AAPL";

// Get initial symbol from localStorage (client-side only)
const getStoredSymbol = (): string => {
  if (typeof window === "undefined") return DEFAULT_SYMBOL;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SYMBOL;
};

export const useSymbol = (): [
  string,
  (symbol: string, targetPath?: string) => void,
] => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlSymbol = searchParams.get("symbol");

  // Use ref to track initial mount without causing re-renders
  const isInitialMountRef = useRef(true);

  // Use state to ensure reactivity
  const [symbol, setSymbolState] = useState<string>(() => {
    if (urlSymbol) return urlSymbol.toUpperCase();
    return getStoredSymbol();
  });

  // Sync state with URL params when they change (handles back/forward navigation and manual URL edits)
  useEffect(() => {
    if (urlSymbol) {
      const upper = urlSymbol.toUpperCase();
      setSymbolState(upper);
      localStorage.setItem(STORAGE_KEY, upper);
      isInitialMountRef.current = false;
    } else if (!urlSymbol && !isInitialMountRef.current) {
      // URL params were cleared after mount - reset to default
      setSymbolState(DEFAULT_SYMBOL);
      localStorage.setItem(STORAGE_KEY, DEFAULT_SYMBOL);
    } else if (isInitialMountRef.current && !urlSymbol) {
      // Initial mount with no URL param - set URL from localStorage
      const stored = getStoredSymbol();
      const params = new URLSearchParams(searchParams.toString());
      params.set("symbol", stored);
      router.replace(`${pathname}?${params.toString()}`);
      isInitialMountRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSymbol, router, pathname]);

  const setSymbol = useCallback(
    (newSymbol: string, targetPath?: string) => {
      const upperSymbol = newSymbol.toUpperCase();
      // Update state
      setSymbolState(upperSymbol);
      // Update localStorage
      localStorage.setItem(STORAGE_KEY, upperSymbol);
      // Update URL with pushState for browser history
      const params = new URLSearchParams(searchParams.toString());
      params.set("symbol", upperSymbol);
      // Use targetPath if provided, otherwise use current pathname
      const path = targetPath ?? pathname;
      router.push(`${path}?${params.toString()}`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, pathname],
  );

  return [symbol, setSymbol];
};

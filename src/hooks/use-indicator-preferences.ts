"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "indicator-preferences";

export interface IndicatorPreferences {
  vwap: boolean;
  bollinger: boolean;
  rsi: boolean;
  macd: boolean;
  sr: boolean;
}

const DEFAULT_PREFERENCES: IndicatorPreferences = {
  vwap: false,
  bollinger: false,
  rsi: false,
  macd: false,
  sr: false,
};

export function useIndicatorPreferences(): [
  IndicatorPreferences,
  (key: keyof IndicatorPreferences) => void,
] {
  const [preferences, setPreferences] =
    useState<IndicatorPreferences>(DEFAULT_PREFERENCES);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...(JSON.parse(stored) as Partial<IndicatorPreferences>),
        });
      } catch {
        // ignore malformed stored data
      }
    }
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [hasLoaded, preferences]);

  const toggle = (key: keyof IndicatorPreferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return [preferences, toggle];
}

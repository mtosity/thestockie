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

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPreferences({ ...DEFAULT_PREFERENCES, ...(JSON.parse(stored) as Partial<IndicatorPreferences>) });
      } catch {
        // ignore malformed stored data
      }
    }
  }, []);

  const toggle = (key: keyof IndicatorPreferences) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return [preferences, toggle];
}

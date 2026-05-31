const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const STORAGE_PREFIX = "news-summary:";
const IS_DEV = process.env.NODE_ENV === "development";

interface CacheEntry {
  summary: string;
  timestamp: number;
  digest: string;
}

export function getCachedSummary(cacheKey: string, digest: string): string | null {
  if (IS_DEV) return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + cacheKey);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry;
    const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
    const isStale = entry.digest !== digest;

    if (isExpired || isStale) {
      localStorage.removeItem(STORAGE_PREFIX + cacheKey);
      return null;
    }

    return entry.summary;
  } catch {
    return null;
  }
}

export function setCachedSummary(cacheKey: string, digest: string, summary: string): void {
  if (IS_DEV) return;
  try {
    const entry: CacheEntry = { summary, timestamp: Date.now(), digest };
    localStorage.setItem(STORAGE_PREFIX + cacheKey, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

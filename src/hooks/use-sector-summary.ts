import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCachedSummary, setCachedSummary } from "~/lib/summary-cache";

type SummaryStatus = "idle" | "summarizing" | "done";
type SummarySource = "ai" | "extractive" | null;

interface SectorData {
  label: string;
  changePercent: number;
}

interface UseSectorSummaryResult {
  summary: string;
  status: SummaryStatus;
  source: SummarySource;
}

function extractiveSectorSummary(
  sectors: SectorData[],
  timeFrame: string,
): string {
  const sorted = [...sectors].sort((a, b) => b.changePercent - a.changePercent);
  const top = sorted.slice(0, 3);
  const bottom = sorted.slice(-3).reverse();
  const tfLabel =
    timeFrame === "1D"
      ? "today"
      : timeFrame === "1W"
        ? "this week"
        : timeFrame === "1M"
          ? "this month"
          : "this year";

  const leaders = top
    .map((s) => `${s.label} (${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%)`)
    .join(", ");
  const laggards = bottom
    .map((s) => `${s.label} (${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%)`)
    .join(", ");

  return `• Leaders ${tfLabel}: ${leaders}\n• Laggards: ${laggards}`;
}

async function tryChromeSummarizer(
  input: string,
  context: string,
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Summarizer = (globalThis as any).Summarizer;
  if (!Summarizer) return null;

  try {
    const availability = await Summarizer.availability();
    if (availability === "no") return null;

    const summarizer = await Summarizer.create({
      type: "key-points",
      format: "plain-text",
      length: "short",
    });

    const result = await summarizer.summarize(input, { context });
    summarizer.destroy();
    return result;
  } catch {
    return null;
  }
}

export function useSectorSummary(
  sectors: SectorData[],
  timeFrame: string,
  cacheKey: string,
  enabled = true,
): UseSectorSummaryResult {
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<SummaryStatus>("idle");
  const [source, setSource] = useState<SummarySource>(null);
  const summarizedRef = useRef("");

  const sectorDigest = useMemo(
    () =>
      sectors
        .map((s) => `${s.label}:${s.changePercent.toFixed(2)}`)
        .join("|"),
    [sectors],
  );

  const tfLabel =
    timeFrame === "1D"
      ? "today"
      : timeFrame === "1W"
        ? "over the past week"
        : timeFrame === "1M"
          ? "over the past month"
          : "over the past year";

  const summarize = useCallback(async () => {
    if (sectors.length === 0) return;

    // Check cache first
    const cached = getCachedSummary(cacheKey, sectorDigest);
    if (cached) {
      setSummary(cached);
      setSource(cached.startsWith("•") ? "extractive" : "ai");
      summarizedRef.current = sectorDigest;
      setStatus("done");
      return;
    }

    setStatus("summarizing");

    try {
      const input = [...sectors]
        .sort((a, b) => b.changePercent - a.changePercent)
        .map(
          (s) =>
            `${s.label}: ${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%`,
        )
        .join("\n");

      const context = `These are US stock market sector ETF performance numbers ${tfLabel}. Analyze which sectors are trending, identify rotation patterns, and highlight notable moves. Be concise and actionable.`;

      const aiResult = await tryChromeSummarizer(input, context);

      if (aiResult) {
        setSummary(aiResult);
        setSource("ai");
        setCachedSummary(cacheKey, sectorDigest, aiResult);
      } else {
        const fallback = extractiveSectorSummary(sectors, timeFrame);
        setSummary(fallback);
        setSource("extractive");
        setCachedSummary(cacheKey, sectorDigest, fallback);
      }

      summarizedRef.current = sectorDigest;
      setStatus("done");
    } catch {
      try {
        const fallback = extractiveSectorSummary(sectors, timeFrame);
        setSummary(fallback);
        setSource("extractive");
        summarizedRef.current = sectorDigest;
        setStatus("done");
      } catch {
        setStatus("idle");
      }
    }
  }, [sectors, sectorDigest, cacheKey, timeFrame, tfLabel]);

  // Reset when sector data changes
  useEffect(() => {
    if (sectors.length > 0 && summarizedRef.current !== sectorDigest) {
      setSummary("");
      setSource(null);
      setStatus("idle");
    }
  }, [sectors, sectorDigest]);

  // Trigger summarization — deferred to avoid blocking initial render
  useEffect(() => {
    if (
      !enabled ||
      sectors.length === 0 ||
      status !== "idle" ||
      summarizedRef.current === sectorDigest
    ) {
      return;
    }

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => void summarize());
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(() => void summarize(), 200);
    return () => clearTimeout(id);
  }, [enabled, sectors, status, sectorDigest, summarize]);

  return { summary, status, source };
}
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCachedSummary, setCachedSummary } from "~/lib/summary-cache";

type SummaryStatus = "idle" | "summarizing" | "done";
type SummarySource = "ai" | "extractive" | null;

interface UseSummarizeResult {
  summary: string;
  status: SummaryStatus;
  source: SummarySource;
}

function extractiveSummary(
  articles: { title: string; text: string }[],
): string {
  // Take the lead sentence from the top 5 articles
  return articles
    .slice(0, 5)
    .map((a) => {
      const firstSentence = a.text.split(/[.!?]\s/)[0];
      return `• ${a.title}${firstSentence ? ` — ${firstSentence}.` : ""}`;
    })
    .join("\n");
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
      length: "medium",
    });

    const result = await summarizer.summarize(input, { context });
    summarizer.destroy();
    return result;
  } catch {
    return null;
  }
}

export function useNewsSummary(
  articles: { title: string; text: string }[],
  cacheKey: string,
  context: string,
): UseSummarizeResult {
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<SummaryStatus>("idle");
  const [source, setSource] = useState<SummarySource>(null);
  const summarizedRef = useRef("");

  const articleDigest = useMemo(
    () =>
      articles
        .slice(0, 10)
        .map((a) => a.title)
        .join("|"),
    [articles],
  );

  const summarize = useCallback(async () => {
    if (!articles.length) return;

    // Check cache first
    const cached = getCachedSummary(cacheKey, articleDigest);
    if (cached) {
      setSummary(cached);
      // Detect if cached summary was extractive (starts with bullet)
      setSource(cached.startsWith("•") ? "extractive" : "ai");
      summarizedRef.current = articleDigest;
      setStatus("done");
      return;
    }

    setStatus("summarizing");

    try {
      // Try Chrome built-in AI
      const input = articles
        .slice(0, 10)
        .map((a) => `${a.title}. ${a.text}`)
        .join("\n\n");

      const aiResult = await tryChromeSummarizer(input, context);

      if (aiResult) {
        setSummary(aiResult);
        setSource("ai");
        setCachedSummary(cacheKey, articleDigest, aiResult);
      } else {
        // Fallback: extractive summary
        const fallback = extractiveSummary(articles);
        setSummary(fallback);
        setSource("extractive");
        setCachedSummary(cacheKey, articleDigest, fallback);
      }

      summarizedRef.current = articleDigest;
      setStatus("done");
    } catch {
      // Any unexpected error — fall back to extractive
      try {
        const fallback = extractiveSummary(articles);
        setSummary(fallback);
        setSource("extractive");
        summarizedRef.current = articleDigest;
        setStatus("done");
      } catch {
        // Complete failure — just hide the section
        setStatus("idle");
      }
    }
  }, [articles, articleDigest, cacheKey, context]);

  // Reset when articles change
  useEffect(() => {
    if (articles.length > 0 && summarizedRef.current !== articleDigest) {
      setSummary("");
      setSource(null);
      setStatus("idle");
    }
  }, [articles, articleDigest]);

  // Trigger summarization
  useEffect(() => {
    if (
      articles.length > 0 &&
      status === "idle" &&
      summarizedRef.current !== articleDigest
    ) {
      void summarize();
    }
  }, [articles, status, articleDigest, summarize]);

  return { summary, status, source };
}

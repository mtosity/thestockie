import { useMemo } from "react";
import { useSymbol } from "~/hooks/use-symbol";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import Image from "next/image";
import { useNewsSummary } from "~/hooks/use-news-summary";

// ── Source ranking ──────────────────────────────────────────────────

const TIER1_SOURCES = new Set([
  "reuters",
  "bloomberg",
  "wall street journal",
  "wsj",
  "financial times",
  "cnbc",
  "the economist",
  "associated press",
  "ap news",
  "bbc",
]);

const TIER2_SOURCES = new Set([
  "marketwatch",
  "barrons",
  "yahoo finance",
  "seeking alpha",
  "investing.com",
  "business insider",
  "fortune",
  "forbes",
  "the motley fool",
  "benzinga",
]);

function scoreArticle(article: { source: string; date: string }): number {
  let score = 0;
  const siteLower = article.source.toLowerCase();

  if (TIER1_SOURCES.has(siteLower)) score += 100;
  else if (TIER2_SOURCES.has(siteLower)) score += 50;

  const ageMs = Date.now() - new Date(article.date).getTime();
  if (ageMs < 4 * 60 * 60 * 1000) score += 30;
  else if (ageMs < 12 * 60 * 60 * 1000) score += 10;

  return score;
}

// ── News Summary ────────────────────────────────────────────────────

function NewsSummary({
  articles,
  cacheKey,
  context,
}: {
  articles: { title: string; text: string }[];
  cacheKey: string;
  context: string;
}) {
  const { summary, status, source } = useNewsSummary(
    articles,
    cacheKey,
    context,
  );

  if (status === "idle") return null;

  return (
    <div className="mb-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
          {source === "ai" ? "AI Summary" : "Key Headlines"}
        </span>
        {status === "summarizing" && (
          <span className="text-[10px] text-gray-500">generating...</span>
        )}
        {status === "done" && source && (
          <span className="ml-auto text-[10px] text-gray-600">
            {source === "ai" ? "Chrome Built-in AI" : "Auto-generated"}
          </span>
        )}
      </div>
      {status === "summarizing" ? (
        <div className="space-y-1.5">
          <div className="h-3 w-full animate-pulse rounded bg-purple-500/10" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-purple-500/10" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-purple-500/10" />
        </div>
      ) : (
        <p className="whitespace-pre-line text-xs leading-relaxed text-gray-300">
          {summary}
        </p>
      )}
    </div>
  );
}

// ── Components ──────────────────────────────────────────────────────

const ArticleCard = ({
  title,
  date,
  url,
  images,
  source,
  text,
}: {
  title: string;
  date: string;
  url: string;
  images: { url: string; width: string; height: string; tag: string }[];
  source: string;
  text: string;
}) => (
  <div className="rounded-lg border border-gray-200 p-3 hover:bg-gray-800/50">
    <div className="flex gap-3 rounded-lg">
      {images?.[0] && (
        <div className="relative h-16 w-16 flex-shrink-0">
          <Image
            src={images[0].url}
            alt={title}
            fill
            className="rounded object-cover"
            sizes="64px"
            priority={false}
            quality={75}
          />
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-orange-50 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {title}
        </a>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <time>{format(new Date(date), "MMM d, h:mm a")}</time>
          <span>•</span>
          <span>{source}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-300">{text}</p>
      </div>
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div className="flex animate-pulse gap-4 rounded-lg border border-gray-700 p-4">
    <div className="h-24 w-24 rounded-md bg-gray-700"></div>
    <div className="flex flex-1 flex-col gap-2">
      <div className="h-6 w-3/4 rounded bg-gray-700"></div>
      <div className="h-4 w-1/2 rounded bg-gray-700"></div>
    </div>
  </div>
);

export const News = () => {
  const [symbol] = useSymbol();
  const { data, isLoading } = api.asset.newsCompany.useQuery(symbol ?? "", {
    enabled: !!symbol,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const sortedResults = useMemo(() => {
    if (!data?.results?.length) return [];
    return [...data.results].sort((a, b) => {
      const scoreDiff = scoreArticle(b) - scoreArticle(a);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!sortedResults.length) {
    return <div className="p-4 text-gray-400">No news available</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 p-4 pb-0">
        <NewsSummary
          articles={sortedResults}
          cacheKey={`stock-news:${symbol ?? "AAPL"}`}
          context={`These are today's financial news articles about ${symbol ?? "AAPL"}. Provide a concise summary highlighting the most important developments and sentiment for this stock.`}
        />
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-4 p-4">
          {sortedResults.map((article, index) => (
            <ArticleCard key={index} {...article} />
          ))}
        </div>
      </div>
    </div>
  );
};

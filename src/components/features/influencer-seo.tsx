import Link from "next/link";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

/**
 * Server-rendered summary + FAQ for /influencers.
 *
 * The interactive widgets above this answer "what is the data"; this answers
 * "what does the data say" in plain, quotable prose with the numbers and the
 * as-of date inline. Answer engines cite passages that carry their own
 * context, so every sentence here is written to stand alone if lifted.
 */

type SentimentRow = {
  symbol: string;
  companyName?: string | null;
  bullishCount?: number | null;
  bearishCount?: number | null;
  consensus?: string | null;
};

type Sentiment = {
  bullish: SentimentRow[];
  bearish: SentimentRow[];
  mixed: SentimentRow[];
};

type Creator = { name: string; channelId: string; videoCount: number };

type ConsensusRow = { ticker: string; name: string; buyers: number };

export type SeoSummaryProps = {
  sentiment: Sentiment | null;
  creators: Creator[];
  videoCount: number;
  updatedAt: number | null;
  digestSummary?: string | null;
  consensusBought: ConsensusRow[];
  period: string | null;
};

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export function formatAsOf(ts: number | null): string {
  return DATE_FMT.format(ts ? new Date(ts) : new Date());
}

function periodLabel(p: string | null): string {
  if (!p) return "the latest reported quarter";
  const [y, q] = p.split("-");
  return `${q} ${y}`;
}

function list(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function tickerPhrases(rows: SentimentRow[], side: "bullish" | "bearish") {
  return rows.slice(0, 5).map((r) => {
    const n = side === "bullish" ? r.bullishCount : r.bearishCount;
    return `${r.symbol}${n ? ` (${n} creator${n === 1 ? "" : "s"})` : ""}`;
  });
}

/** Native <details> keeps every answer in the HTML while staying compact. */
function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border py-3 last:border-b-0">
      <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:content-none">
        <span className="mr-2 inline-block text-muted-foreground transition-transform group-open:rotate-90">
          ›
        </span>
        {q}
      </summary>
      <div className="mt-2 pl-5 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  );
}

export function InfluencerSeoSummary({
  sentiment,
  creators,
  videoCount,
  updatedAt,
  digestSummary,
  consensusBought,
  period,
}: SeoSummaryProps) {
  const asOf = formatAsOf(updatedAt);
  const bullish = tickerPhrases(sentiment?.bullish ?? [], "bullish");
  const bearish = tickerPhrases(sentiment?.bearish ?? [], "bearish");
  const topCreators = creators.slice(0, 8);
  const bought = consensusBought.slice(0, 5);

  return (
    <section
      id="summary"
      aria-labelledby="summary-heading"
      className="mt-10 space-y-4"
    >
      <Card>
        <CardHeader className="pb-2">
          <h2 id="summary-heading" className="text-lg font-semibold">
            What the data says right now
          </h2>
          <p className="text-xs text-muted-foreground">As of {asOf}</p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            The Stockie tracks{" "}
            <strong className="text-foreground">
              {creators.length} YouTube stock creators
            </strong>
            , transcribes every new video, and extracts each ticker they
            mention along with the stance, conviction and thesis behind it.
            {videoCount > 0 && (
              <>
                {" "}
                The most recent scan covered {videoCount} newly analyzed videos.
              </>
            )}
          </p>

          {bullish.length > 0 && (
            <p>
              As of {asOf}, the stocks these creators are{" "}
              <strong className="text-foreground">most bullish</strong> on are{" "}
              {list(bullish)}.
            </p>
          )}

          {bearish.length > 0 && (
            <p>
              The stocks drawing the{" "}
              <strong className="text-foreground">most bearish</strong>{" "}
              commentary are {list(bearish)}.
            </p>
          )}

          {bought.length > 0 && (
            <p>
              Separately, across {periodLabel(period)} SEC Form 13F filings, the
              stocks bought by the largest number of super investors were{" "}
              {list(
                bought.map(
                  (b) =>
                    `${b.ticker} (${b.buyers} investor${b.buyers === 1 ? "" : "s"})`,
                ),
              )}
              .
            </p>
          )}

          {digestSummary && (
            <p className="border-l-2 border-border pl-3 italic">
              {digestSummary}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold">
            How influencer sentiment is measured
          </h2>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              New uploads from every tracked channel are pulled daily and
              transcribed in full.
            </li>
            <li>
              A language model extracts each stock mention as a structured
              record: ticker, stance (bullish / bearish / neutral), conviction,
              stated action (buy, add, trim, sell, hold, watch), price target if
              given, and a one-line thesis.
            </li>
            <li>
              Mentions are aggregated per ticker into a daily consensus —{" "}
              <em>strong bullish</em> through <em>strong bearish</em> — weighted
              by conviction, with one vote per creator so a prolific channel
              cannot dominate a ticker.
            </li>
            <li>
              Super investor data is parsed separately from quarterly SEC Form
              13F filings, which disclose long US equity positions only and are
              filed up to 45 days after quarter end.
            </li>
          </ol>
          <p className="pt-1 text-xs">
            Theses are AI-generated paraphrases of a creator&apos;s own words,
            not verbatim quotes, and are aggregated for information only. This
            is not financial advice.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <h2 className="text-lg font-semibold">Frequently asked questions</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <Faq q="Which stocks are YouTube finance creators most bullish on right now?">
            {bullish.length > 0 ? (
              <>
                As of {asOf}, the highest bullish consensus among the{" "}
                {creators.length} creators tracked by The Stockie is on{" "}
                {list(bullish)}. The count in parentheses is the number of
                distinct creators who took a bullish stance on that ticker in
                their recent videos.
              </>
            ) : (
              <>
                No bullish consensus has been recorded in the current window.
                Rankings refresh once the next daily scan completes.
              </>
            )}
          </Faq>

          <Faq q="Which stocks are creators most bearish on?">
            {bearish.length > 0 ? (
              <>
                As of {asOf}, the most bearish consensus is on {list(bearish)}.
                A bearish stance means the creator argued against owning the
                stock at current prices — it does not imply they are short it.
              </>
            ) : (
              <>
                No bearish consensus has been recorded in the current window.
              </>
            )}
          </Faq>

          <Faq q="Which YouTube stock creators does The Stockie track?">
            {topCreators.length > 0 ? (
              <>
                The Stockie currently tracks {creators.length} channels,
                including{" "}
                {list(topCreators.map((c) => c.name))}. Each creator has a
                profile page listing every stock they have covered, what they
                bought, and their stated reasoning:{" "}
                {topCreators.slice(0, 5).map((c, i) => (
                  <span key={c.channelId}>
                    {i > 0 && ", "}
                    <Link
                      href={`/influencers/${c.channelId}`}
                      className="underline hover:text-foreground"
                    >
                      {c.name}
                    </Link>
                  </span>
                ))}
                .
              </>
            ) : (
              <>The tracked-creator roster is being rebuilt.</>
            )}
          </Faq>

          <Faq q="How is the bullish/bearish consensus calculated?">
            Every video transcript is parsed into per-ticker records carrying a
            stance and a conviction level. Those are aggregated per ticker, one
            vote per creator, and conviction-weighted into a net score that maps
            to a five-level consensus from strong bullish to strong bearish. A
            ticker only appears once at least one creator has stated a clear
            directional view on it.
          </Faq>

          <Faq q="How often is the influencer data updated?">
            The creator scan runs daily; the leaderboard above reflects the most
            recent completed run ({asOf}). Super investor holdings update once
            per quarter, as new SEC Form 13F filings are released roughly 45
            days after each quarter ends.
          </Faq>

          <Faq q="What is a 13F filing and why does it lag?">
            Form 13F is a quarterly report that US institutional investment
            managers with at least $100 million in qualifying assets must file
            with the SEC. It discloses long US-listed equity positions only —
            not shorts, bonds, or foreign listings — and is due 45 days after
            quarter end. A position shown as sold was therefore trimmed or
            exited at some point during that quarter, not necessarily today.
          </Faq>

          <Faq q="Is this financial advice?">
            No. The Stockie aggregates and summarizes what public commentators
            and institutional filers have said or disclosed. Nothing here is a
            recommendation to buy or sell any security, and AI-extracted theses
            may misstate a creator&apos;s position. Always verify against the
            original video or filing.
          </Faq>
        </CardContent>
      </Card>
    </section>
  );
}

/** The same FAQ content, as JSON-LD. Kept beside the markup so they stay in sync. */
export function buildFaqJsonLd(props: SeoSummaryProps) {
  const asOf = formatAsOf(props.updatedAt);
  const bullish = tickerPhrases(props.sentiment?.bullish ?? [], "bullish");
  const bearish = tickerPhrases(props.sentiment?.bearish ?? [], "bearish");
  const creators = props.creators;

  const qa: { q: string; a: string }[] = [];

  if (bullish.length > 0) {
    qa.push({
      q: "Which stocks are YouTube finance creators most bullish on right now?",
      a: `As of ${asOf}, the highest bullish consensus among the ${creators.length} YouTube stock creators tracked by The Stockie is on ${list(bullish)}. The number in parentheses is how many distinct creators took a bullish stance on that ticker in their recent videos.`,
    });
  }

  if (bearish.length > 0) {
    qa.push({
      q: "Which stocks are YouTube finance creators most bearish on?",
      a: `As of ${asOf}, the most bearish consensus is on ${list(bearish)}. A bearish stance means the creator argued against owning the stock at current prices; it does not imply a short position.`,
    });
  }

  if (creators.length > 0) {
    qa.push({
      q: "Which YouTube stock creators does The Stockie track?",
      a: `The Stockie tracks ${creators.length} YouTube finance channels, including ${list(creators.slice(0, 8).map((c) => c.name))}. Each creator has a profile page listing every stock they have covered, what they bought, and their stated reasoning.`,
    });
  }

  qa.push(
    {
      q: "How is the bullish/bearish consensus calculated?",
      a: "Every tracked video is transcribed and parsed into per-ticker records carrying a stance and conviction level. Those records are aggregated per ticker with one vote per creator and conviction-weighted into a net score, which maps to a five-level consensus from strong bullish to strong bearish.",
    },
    {
      q: "How often is the influencer data updated?",
      a: `The creator scan runs daily and the leaderboard reflects the most recent completed run (${asOf}). Super investor holdings update quarterly, as SEC Form 13F filings are released roughly 45 days after each quarter ends.`,
    },
    {
      q: "What is a 13F filing and why does it lag?",
      a: "Form 13F is a quarterly report that US institutional investment managers with at least $100 million in qualifying assets must file with the SEC. It discloses long US-listed equity positions only — not shorts, bonds, or foreign listings — and is due 45 days after quarter end, so a position shown as sold was trimmed or exited during that quarter.",
    },
    {
      q: "Is The Stockie's influencer data financial advice?",
      a: "No. The Stockie aggregates and summarizes what public commentators and institutional filers have said or disclosed. Nothing on the page is a recommendation to buy or sell any security, and AI-extracted theses may misstate a creator's position.",
    },
  );

  return {
    "@type": "FAQPage",
    mainEntity: qa.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

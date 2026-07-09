"use client";

import { Repeat, Lightbulb, ArrowRight } from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { SentimentBadge, Pill } from "./influencer-shared";

type Digest = NonNullable<RouterOutputs["influencer"]["latestDigest"]>;

type Action = { action?: string; symbol?: string; rationale?: string };
type Rotation = { from?: string; to?: string; rationale?: string };

// Recommended actions / rotations may arrive either as structured objects
// (current job output) or as pre-flattened strings (older digest rows).
// Normalize both so the UI never renders blank rows.
function normalizeAction(raw: unknown): Action {
  if (typeof raw === "string") {
    const i = raw.indexOf(" — ");
    return i > -1
      ? { action: raw.slice(0, i), rationale: raw.slice(i + 3) }
      : { rationale: raw };
  }
  return (raw ?? {}) as Action;
}

function normalizeRotation(raw: unknown): Rotation {
  if (typeof raw === "string") {
    const colon = raw.indexOf(": ");
    const head = colon > -1 ? raw.slice(0, colon) : "";
    const rationale = colon > -1 ? raw.slice(colon + 2) : raw;
    const [from, to] = head.split(" → ").map((s) => s.trim());
    return { from: from || undefined, to: to || undefined, rationale };
  }
  return (raw ?? {}) as Rotation;
}

export function InfluencerDigest({ digest }: { digest: Digest }) {
  const rotations: Rotation[] = (
    ((digest.sectorRotation as unknown[] | undefined) ??
      (digest as { sectorRotations?: unknown[] }).sectorRotations ??
      []) as unknown[]
  ).map(normalizeRotation);

  const actions: Action[] = (
    (digest.recommendedActions as unknown[] | undefined) ?? []
  ).map(normalizeAction);

  const meta = [
    digest.date,
    digest.videosAnalyzed != null ? `${digest.videosAnalyzed} videos` : null,
    digest.influencersCount != null ? `${digest.influencersCount} creators` : null,
    digest.windowDays != null ? `${digest.windowDays}d window` : null,
  ].filter(Boolean);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <h2 className="text-lg font-semibold">Daily Market Digest</h2>
          <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>
        </div>
        {digest.sentimentLabel && (
          <SentimentBadge label={digest.sentimentLabel} />
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {digest.marketSentiment}
        </p>

        {(digest.keyThemes?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(digest.keyThemes ?? []).map((theme, i) => (
              <Pill
                key={i}
                className="bg-primary/15 text-foreground ring-primary/30"
              >
                {theme}
              </Pill>
            ))}
          </div>
        )}

        {rotations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Repeat className="h-3.5 w-3.5" /> Sector rotation
            </div>
            {rotations.map((r, i) => (
              <div key={i} className="rounded-md bg-muted px-3 py-2 text-sm">
                {(r.from ?? r.to) && (
                  <div className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                    {r.from && <span>{r.from}</span>}
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    {r.to && <span>{r.to}</span>}
                  </div>
                )}
                <p className="text-muted-foreground">{r.rationale}</p>
              </div>
            ))}
          </div>
        )}

        {actions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5" /> Recommended actions
            </div>
            {actions.map((a, i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 rounded-md bg-muted px-3 py-2 text-sm"
              >
                {a.action && (
                  <Pill className="self-start bg-primary/15 text-foreground ring-primary/30">
                    {a.action}
                  </Pill>
                )}
                <p className="text-muted-foreground">
                  {a.symbol && (
                    <span className="font-semibold text-foreground">{a.symbol}: </span>
                  )}
                  {a.rationale}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

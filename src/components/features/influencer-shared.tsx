import { type ReactNode } from "react";
import { cn } from "~/lib/utils";

const STANCE_NEUTRAL = "bg-slate-500/15 text-muted-foreground ring-slate-500/30";
const STANCE_STYLES: Record<string, string> = {
  bullish: "bg-positive-surface text-positive ring-positive/30",
  bearish: "bg-negative-surface text-negative ring-negative/30",
  neutral: STANCE_NEUTRAL,
};

const CONSENSUS_MIXED = "bg-warning-surface text-warning ring-warning/30";
const CONSENSUS_STYLES: Record<string, string> = {
  strong_bullish: "bg-positive-surface text-positive ring-positive/30",
  bullish: "bg-positive-surface text-positive ring-positive/30",
  mixed: CONSENSUS_MIXED,
  bearish: "bg-negative-surface text-negative ring-negative/30",
  strong_bearish: "bg-negative-surface text-negative ring-negative/30",
};

const SENTIMENT_NEUTRAL = "bg-warning-surface text-warning ring-warning/30";
const SENTIMENT_STYLES: Record<string, string> = {
  risk_on: "bg-positive-surface text-positive ring-positive/30",
  neutral: SENTIMENT_NEUTRAL,
  risk_off: "bg-negative-surface text-negative ring-negative/30",
};

export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide ring-1 ring-inset",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StanceBadge({ stance }: { stance: string }) {
  return <Pill className={STANCE_STYLES[stance] ?? STANCE_NEUTRAL}>{stance}</Pill>;
}

export function ConsensusBadge({ consensus }: { consensus: string }) {
  return (
    <Pill className={CONSENSUS_STYLES[consensus] ?? CONSENSUS_MIXED}>
      {consensus.replace("_", " ")}
    </Pill>
  );
}

export function SentimentBadge({ label }: { label: string }) {
  return (
    <Pill className={SENTIMENT_STYLES[label] ?? SENTIMENT_NEUTRAL}>
      {label.replace("_", " ")}
    </Pill>
  );
}

export function netColor(net: number): string {
  if (net > 0) return "text-positive";
  if (net < 0) return "text-negative";
  return "text-slate-400";
}

export function formatNet(net: number): string {
  return net > 0 ? `+${net}` : `${net}`;
}

export function formatRelative(ms: number | null | undefined): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "today";
  const days = Math.floor(diff / day);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(ms).toLocaleDateString();
}

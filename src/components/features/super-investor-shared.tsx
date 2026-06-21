import { Pill } from "./influencer-shared";

const CONSENSUS: Record<string, string> = {
  strong_buy: "bg-positive-surface text-positive ring-positive/30",
  buy: "bg-positive-surface text-positive ring-positive/30",
  mixed: "bg-warning-surface text-warning ring-warning/30",
  sell: "bg-negative-surface text-negative ring-negative/30",
  strong_sell: "bg-negative-surface text-negative ring-negative/30",
};

export function InvestorConsensusBadge({ consensus }: { consensus?: string }) {
  const value = consensus ?? "mixed";
  return (
    <Pill className={CONSENSUS[value] ?? CONSENSUS.mixed}>
      {value.replace("_", " ")}
    </Pill>
  );
}

const MOVE_LABEL: Record<string, string> = {
  new: "new",
  added: "added",
  reduced: "trimmed",
  sold: "sold out",
  hold: "hold",
};
const MOVE_STYLE: Record<string, string> = {
  new: "bg-positive-surface text-positive ring-positive/30",
  added: "bg-positive-surface text-positive ring-positive/30",
  reduced: "bg-warning-surface text-warning ring-warning/30",
  sold: "bg-negative-surface text-negative ring-negative/30",
  hold: "bg-slate-500/15 text-muted-foreground ring-slate-500/30",
};

export function MoveBadge({ type }: { type: string }) {
  return <Pill className={MOVE_STYLE[type] ?? MOVE_STYLE.hold}>{MOVE_LABEL[type] ?? type}</Pill>;
}

export function moveColor(type: string): string {
  if (type === "new" || type === "added") return "text-positive";
  if (type === "reduced" || type === "sold") return "text-negative";
  return "text-slate-400";
}

export function formatMoney(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${Math.round(v)}`;
}

export function formatPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${Math.round(v)}%`;
}

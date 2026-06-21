"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { StockResponseModal } from "./stock-response-modal";
import { TableSkeleton } from "./table-skeleton";
import { useSymbol } from "~/hooks/use-symbol";
import { ArrowRight } from "lucide-react";

interface Stock {
  supabaseId?: string;
  prompt?: string;
  response?: string;
  sector?: string;
  marketCap?: number;
  recommendation?: string;
  createdAt?: number;
}

interface ScreenerTableProps {
  stocks: Stock[];
  isLoading: boolean;
}

export function ScreenerTable({ stocks, isLoading }: ScreenerTableProps) {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, setSymbol] = useSymbol();

  const handleViewReport = (stock: Stock) => {
    setSelectedStock(stock);
    setIsModalOpen(true);
  };

  const handleSelectStock = (symbol: string) => {
    setSymbol(symbol, "/");
  };

  const getRecommendationColor = (recommendation: string | null) => {
    switch (recommendation) {
      case "strong_buy":
        return "border-transparent bg-positive-surface text-positive ring-1 ring-inset ring-positive/30 hover:bg-positive-surface";
      case "buy":
        return "border-transparent bg-positive-surface text-positive ring-1 ring-inset ring-positive/30 hover:bg-positive-surface";
      case "hold":
        return "border-transparent bg-warning-surface text-warning ring-1 ring-inset ring-warning/30 hover:bg-warning-surface";
      case "sell":
        return "border-transparent bg-negative-surface text-negative ring-1 ring-inset ring-negative/30 hover:bg-negative-surface";
      case "strong_sell":
        return "border-transparent bg-negative-surface text-negative ring-1 ring-inset ring-negative/30 hover:bg-negative-surface";
      default:
        return "border-transparent bg-muted text-muted-foreground ring-1 ring-inset ring-border";
    }
  };

  const formatRecommendation = (recommendation: string | null) => {
    if (!recommendation) return "N/A";
    return recommendation.replace("_", " ").toUpperCase();
  };

  const formatMarketCap = (marketCap: number | null) => {
    if (!marketCap) return "N/A";
    if (marketCap >= 1000000000)
      return `$${(marketCap / 1000000000).toFixed(1)}B`;
    if (marketCap >= 1000000) return `$${(marketCap / 1000000).toFixed(1)}M`;
    return `$${marketCap.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <>
        <TableSkeleton rows={20} />
        <StockResponseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          stock={selectedStock}
        />
      </>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-muted-foreground">
          No stocks found matching your criteria.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow className="border-border hover:bg-accent">
                <TableHead className="bg-background text-foreground">
                  Symbol
                </TableHead>
                <TableHead className="bg-background text-foreground">
                  Sector
                </TableHead>
                <TableHead className="bg-background text-foreground">
                  Market Cap
                </TableHead>
                <TableHead className="bg-background text-foreground">
                  Recommendation
                </TableHead>
                <TableHead className="bg-background text-foreground">
                  Report
                </TableHead>
                <TableHead className="bg-background text-foreground">
                  Last Updated
                </TableHead>
                <TableHead className="bg-background text-foreground">
                  Stock details
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.map((stock) => (
                <TableRow
                  key={stock.supabaseId}
                  className="border-border hover:bg-accent"
                >
                  <TableCell className="font-medium text-foreground">
                    {stock.supabaseId}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {stock.sector ?? "N/A"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatMarketCap(stock.marketCap ?? null)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={getRecommendationColor(stock.recommendation ?? null)}
                    >
                      {formatRecommendation(stock.recommendation ?? null)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReport(stock)}
                      disabled={!stock.response}
                      className="border-border bg-foreground/10 text-foreground hover:border-border hover:bg-accent disabled:border-border disabled:bg-foreground/5 disabled:text-muted-foreground"
                    >
                      {stock.response ? "View Report" : "No Report"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {stock.createdAt
                      ? new Date(stock.createdAt).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectStock(stock.supabaseId)}
                      className="border-border bg-foreground/10 text-foreground hover:border-border hover:bg-accent"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <StockResponseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stock={selectedStock}
      />
    </>
  );
}

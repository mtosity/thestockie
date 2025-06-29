"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  id: string;
  prompt: string | null;
  response: string | null;
  sector: string | null;
  market_cap: number | null;
  recommendation: string | null;
  createdAt: Date | null;
}

interface ScreenerTableProps {
  stocks: Stock[];
  isLoading: boolean;
}

export function ScreenerTable({ stocks, isLoading }: ScreenerTableProps) {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const [, setSymbol] = useSymbol();

  const handleViewReport = (stock: Stock) => {
    setSelectedStock(stock);
    setIsModalOpen(true);
  };

  const handleSelectStock = (symbol: string) => {
    setSymbol(symbol);
    router.push("/");
  };

  const getRecommendationColor = (recommendation: string | null) => {
    switch (recommendation) {
      case "strong_buy":
        return "bg-green-500 hover:bg-green-600";
      case "buy":
        return "bg-green-400 hover:bg-green-500";
      case "hold":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "sell":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
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
        <div className="text-lg text-gray-400">
          No stocks found matching your criteria.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-white/10">
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-[#15162c]">
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="bg-[#15162c] text-white">
                  Symbol
                </TableHead>
                <TableHead className="bg-[#15162c] text-white">
                  Sector
                </TableHead>
                <TableHead className="bg-[#15162c] text-white">
                  Market Cap
                </TableHead>
                <TableHead className="bg-[#15162c] text-white">
                  Recommendation
                </TableHead>
                <TableHead className="bg-[#15162c] text-white">
                  Report
                </TableHead>
                <TableHead className="bg-[#15162c] text-white">
                  Last Updated
                </TableHead>
                <TableHead className="bg-[#15162c] text-white">
                  Stock details
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.map((stock) => (
                <TableRow
                  key={stock.id}
                  className="border-white/10 hover:bg-white/5"
                >
                  <TableCell className="font-medium text-white">
                    {stock.id}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {stock.sector ?? "N/A"}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {formatMarketCap(stock.market_cap)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={getRecommendationColor(stock.recommendation)}
                    >
                      {formatRecommendation(stock.recommendation)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReport(stock)}
                      disabled={!stock.response}
                      className="border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/20 disabled:border-white/10 disabled:bg-white/5 disabled:text-gray-400"
                    >
                      {stock.response ? "View Report" : "No Report"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {stock.createdAt
                      ? stock.createdAt.toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectStock(stock.id)}
                      className="border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/20"
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

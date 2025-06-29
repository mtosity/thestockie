"use client";

import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  isLoading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  isLoading = false,
}: PaginationProps) {
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#15162c] border-t border-white/10 z-50">
      <div className="container mx-auto px-2 sm:px-4">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Showing {startItem} to {endItem} of {total} results
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Rows per page:</span>
              <Select
                value={limit.toString()}
                onValueChange={(value) => onLimitChange(parseInt(value))}
              >
                <SelectTrigger className="w-20 h-8 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 disabled:bg-white/5 disabled:text-gray-400 disabled:border-white/10"
            >
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {getVisiblePages().map((page, index) => (
                <div key={index}>
                  {page === "..." ? (
                    <span className="px-2 py-1 text-gray-400">...</span>
                  ) : (
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(page as number)}
                      disabled={isLoading}
                      className={
                        currentPage === page
                          ? "bg-white text-[#15162c] hover:bg-gray-200"
                          : "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                      }
                    >
                      {page}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 disabled:bg-white/5 disabled:text-gray-400 disabled:border-white/10"
            >
              Next
            </Button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              {startItem}-{endItem} of {total}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Per page:</span>
              <Select
                value={limit.toString()}
                onValueChange={(value) => onLimitChange(parseInt(value))}
              >
                <SelectTrigger className="w-16 h-7 bg-white/10 border-white/20 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 disabled:bg-white/5 disabled:text-gray-400 disabled:border-white/10 text-xs px-2 h-7"
            >
              Prev
            </Button>

            <div className="flex items-center gap-0.5 mx-2">
              {getVisiblePages().slice(0, 5).map((page, index) => (
                <div key={index}>
                  {page === "..." ? (
                    <span className="px-1 text-gray-400 text-xs">...</span>
                  ) : (
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(page as number)}
                      disabled={isLoading}
                      className={
                        currentPage === page
                          ? "bg-white text-[#15162c] hover:bg-gray-200 text-xs px-2 h-7 min-w-7"
                          : "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 text-xs px-2 h-7 min-w-7"
                      }
                    >
                      {page}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 disabled:bg-white/5 disabled:text-gray-400 disabled:border-white/10 text-xs px-2 h-7"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
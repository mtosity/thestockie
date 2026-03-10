"use client";

import { Suspense } from "react";
import { StockComparison } from "~/components/features/stock-comparison";

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-[#15162c] text-white">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          </div>
        }
      >
        <StockComparison />
      </Suspense>
    </main>
  );
}

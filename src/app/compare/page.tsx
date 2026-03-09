"use client";

import { Suspense } from "react";
import { BackButton } from "~/components/ui/back-button";
import { StockComparison } from "~/components/features/stock-comparison";

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-[#15162c] text-white">
      <nav className="border-b border-white/10 px-4 py-4">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4">
          <BackButton />
          <h1 className="text-lg font-bold">Stock Comparison Tool</h1>
        </div>
      </nav>

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

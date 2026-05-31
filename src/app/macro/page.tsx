"use client";

import { Suspense } from "react";
import { MacroDashboard } from "~/components/features/macro-dashboard";

export default function MacroPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#15162c] text-white">
          Loading...
        </div>
      }
    >
      <main className="min-h-screen bg-[#15162c] text-white">
        <div className="px-4 pt-4">
          <div className="mb-2">
            <h1 className="text-3xl font-bold">Macro Overview</h1>
            <p className="text-sm text-gray-400">
              Global markets, volatility, rates, and economic indicators
            </p>
          </div>
        </div>
        <MacroDashboard />
      </main>
    </Suspense>
  );
}

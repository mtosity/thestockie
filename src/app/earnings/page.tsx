"use client";

import { Suspense } from "react";
import { EarningsCalendar } from "~/components/features/earnings-calendar";

export default function EarningsPage() {
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
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Earnings Calendar</h1>
          </div>
        </div>
        <EarningsCalendar />
      </main>
    </Suspense>
  );
}

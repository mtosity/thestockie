"use client";

import { Suspense } from "react";
import { BackButton } from "~/components/ui/back-button";
import { EarningsCalendar } from "~/components/features/earnings-calendar";

export default function EarningsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#15162c] text-white flex items-center justify-center">Loading...</div>}>
      <main className="min-h-screen bg-[#15162c] text-white">
        <div className="px-4 pt-4">
          <div className="mb-6 flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold">Earnings Calendar</h1>
          </div>
        </div>
        <EarningsCalendar />
      </main>
    </Suspense>
  );
}

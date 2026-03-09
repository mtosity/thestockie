"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { EarningsCalendar } from "~/components/features/earnings-calendar";

export default function EarningsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#15162c] text-white flex items-center justify-center">Loading...</div>}>
      <main className="min-h-screen bg-[#15162c] text-white">
        <div className="px-4 pt-4">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Earnings Calendar</h1>
          </div>
        </div>
        <EarningsCalendar />
      </main>
    </Suspense>
  );
}

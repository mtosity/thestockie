import { Suspense } from "react";
import Grid from "~/components/features/grid";
import { HydrateClient } from "~/trpc/server";

export default function Home() {
  return (
    <HydrateClient>
      <main className="min-h-screen bg-background text-foreground">
        {/* The dashboard reads the `symbol` search param throughout. Isolating
            it behind a boundary keeps the route's shell statically rendered. */}
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          }
        >
          <Grid />
        </Suspense>
      </main>
    </HydrateClient>
  );
}

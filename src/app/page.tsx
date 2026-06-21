import Grid from "~/components/features/grid";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="min-h-screen bg-background text-white">
        <Grid />
      </main>
    </HydrateClient>
  );
}

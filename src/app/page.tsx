import Grid from "~/components/features/grid";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="min-h-screen bg-[#15162c] text-white">
        <Grid />
      </main>
    </HydrateClient>
  );
}

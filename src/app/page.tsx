import Link from "next/link";
import Grid from "~/components/features/grid";
import { Search } from "~/components/features/search";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import { SessionProvider } from "next-auth/react";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <SessionProvider session={session}>
        <main className="min-h-screen bg-[#15162c] text-white">
          <nav className="flex w-full items-center justify-between px-2 py-4">
            <div className="flex-1">
              <h1 className="hidden pl-2 text-lg font-bold md:block">
                Stock Fundamentals Analysis Tool
              </h1>
            </div>
            <div className="flex flex-1 justify-center">
              {/* <Input type="text" placeholder="Search..." className="px-4 py-2" /> */}
              <Search />
            </div>
            <div className="flex flex-1 justify-end">
              <Link
                href={session ? "/api/auth/signout" : "/api/auth/signin"}
                className="rounded bg-white/10 px-4 py-2 font-semibold no-underline transition hover:bg-white/20"
              >
                {session ? `Sign out - ${session.user?.name}` : "Sign in"}
              </Link>
            </div>
          </nav>

          <Grid />
        </main>

        <footer>
          <div className="flex h-16 items-center justify-center gap-8 bg-[#15162c] text-white">
            <p className="text-sm">&copy;{new Date().getFullYear()}</p>

            <a
              href="https://mtosity.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              @mtosity
            </a>
          </div>
        </footer>
      </SessionProvider>
    </HydrateClient>
  );
}

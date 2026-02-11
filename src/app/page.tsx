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
          <nav className="px-2 py-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex-1">
                <h1 className="hidden pl-2 text-lg font-bold md:block">
                  Stock Fundamentals Analysis Tool
                </h1>
              </div>
              <div className="hidden md:flex flex-1 justify-center">
                <Search />
              </div>
              <div className="hidden md:flex flex-1 items-center justify-end gap-1">
                <Link
                  href="/blogs"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Blog
                </Link>
                <Link
                  href="/screener"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Screener
                </Link>
                <Link
                  href={session ? "/api/auth/signout" : "/api/auth/signin"}
                  className="ml-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
                >
                  {session ? `Sign out` : "Sign in"}
                </Link>
              </div>
            </div>
            <div className="md:hidden space-y-4">
              <div className="flex justify-center">
                <Search />
              </div>
              <div className="flex items-center justify-center gap-1">
                <Link
                  href="/blogs"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Blog
                </Link>
                <Link
                  href="/screener"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Screener
                </Link>
                <Link
                  href={session ? "/api/auth/signout" : "/api/auth/signin"}
                  className="ml-1 rounded-lg bg-purple-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
                >
                  {session ? `Sign out` : "Sign in"}
                </Link>
              </div>
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

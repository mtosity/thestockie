import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import { TRPCReactProvider } from "~/trpc/react";
import { ConvexClientProvider } from "~/components/ConvexClientProvider";
import { SessionProvider } from "next-auth/react";
import { Navbar } from "~/components/features/navbar";
import { auth } from "~/server/auth";

export const metadata: Metadata = {
  title: "thestockie - @mtosity",
  description: "Advanced stock analysis tool with AI-powered insights",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  metadataBase: new URL("https://thestockie.com"),
  openGraph: {
    title: "thestockie - @mtosity",
    description: "Advanced stock analysis tool with AI-powered insights",
    images: [
      {
        url: "/thumbnail.png",
        width: 1200,
        height: 630,
        alt: "thestockie thumbnail",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "thestockie - @mtosity",
    description: "Advanced stock analysis tool with AI-powered insights",
    images: ["/thumbnail.png"],
    creator: "@mtosity",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <ConvexClientProvider>
          <TRPCReactProvider>
            <SessionProvider session={session}>
              <Navbar />
              {children}
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
                  <a
                    href="https://github.com/mtosity/thestockie"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    GitHub
                  </a>
                </div>
              </footer>
            </SessionProvider>
          </TRPCReactProvider>
        </ConvexClientProvider>
        <Analytics />
      </body>
    </html>
  );
}

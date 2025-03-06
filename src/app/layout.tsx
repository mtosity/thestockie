import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import { TRPCReactProvider } from "~/trpc/react";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Analytics />
      </body>
    </html>
  );
}

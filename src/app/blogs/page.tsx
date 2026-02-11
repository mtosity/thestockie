import type { Metadata } from "next";
import { BlogsContent } from "~/components/features/blogs-content";
import { getAllBlogs, getAllTags } from "~/lib/blog";

export const metadata: Metadata = {
  title: "Blog | The Stockie - Investment Insights & Analysis",
  description:
    "Investment insights, guides, and analysis to help you make smarter decisions. Learn about stock fundamentals, market trends, and investment strategies.",
  keywords:
    "investing, stocks, crypto, analysis, financial education, market trends",
  alternates: {
    canonical: "https://thestockie.com/blogs",
  },
  openGraph: {
    title: "The Stockie Blog - Investment Insights & Analysis",
    description:
      "Investment insights, guides, and analysis to help you make smarter decisions.",
    url: "https://thestockie.com/blogs",
    siteName: "The Stockie",
    type: "website",
    images: [
      {
        url: "/thumbnail.png",
        width: 1200,
        height: 630,
        alt: "The Stockie Blog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Stockie Blog - Investment Insights & Analysis",
    description:
      "Investment insights, guides, and analysis to help you make smarter decisions.",
    images: ["/thumbnail.png"],
    creator: "@mtosity",
  },
};

export default function BlogsPage() {
  const blogs = getAllBlogs();
  const tags = getAllTags();

  return <BlogsContent blogs={blogs} tags={tags} />;
}

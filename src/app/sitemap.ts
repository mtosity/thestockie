import type { MetadataRoute } from "next";
import { getAllBlogs } from "~/lib/blog";
import { convex } from "~/server/api/trpc";
import { api } from "../../convex/_generated/api";

const BASE_URL = "https://thestockie.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogs = getAllBlogs();

  const blogUrls = blogs.map((blog) => ({
    url: `${BASE_URL}/blogs/${blog.frontmatter.slug}`,
    lastModified: new Date(
      blog.frontmatter.updatedAt || blog.frontmatter.publishedAt,
    ),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  let investorUrls: MetadataRoute.Sitemap = [];
  try {
    const investors = await convex.query(api.superInvestorReads.investors, {});
    investorUrls = investors.map((i) => ({
      url: `${BASE_URL}/investors/${i.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // skip investor URLs if Convex is unreachable at build time
  }

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/blogs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/screener`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/compare`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/influencers`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...investorUrls,
    ...blogUrls,
  ];
}

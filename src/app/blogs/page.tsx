import type { Metadata } from "next";
import { BlogsContent } from "~/components/features/blogs-content";
import { getAllBlogs, getAllTags } from "~/lib/blog";

export const metadata: Metadata = {
  title: "Blog | The Stockie",
  description:
    "Investment insights, guides, and analysis to help you make smarter decisions. Learn about stock fundamentals, market trends, and investment strategies.",
};

export default function BlogsPage() {
  const blogs = getAllBlogs();
  const tags = getAllTags();

  return <BlogsContent blogs={blogs} tags={tags} />;
}

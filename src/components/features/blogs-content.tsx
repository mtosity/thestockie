"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { BlogCard } from "~/components/features/blog-card";
import { BlogTagFilter } from "~/components/features/blog-tag-filter";
import type { BlogMeta } from "~/lib/blog.shared";

interface BlogsContentProps {
  blogs: BlogMeta[];
  tags: string[];
}

export function BlogsContent({ blogs, tags }: BlogsContentProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filteredBlogs = selectedTag
    ? blogs.filter((blog) => blog.frontmatter.tags?.includes(selectedTag))
    : blogs;

  return (
    <main className="min-h-screen bg-[#15162c] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/10 px-4 py-16 md:px-8 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10" />
        <div className="absolute -left-1/4 -top-1/2 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/20 p-3">
              <BookOpen className="h-8 w-8 text-purple-400" />
            </div>
            <p className="max-w-2xl text-lg text-gray-400">
              Insights, guides, and analysis to help you make smarter investment
              decisions. Learn about fundamentals, market trends, and investment
              strategies.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        {/* Tag Filter */}
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500">
            Filter by topic
          </h2>
          <BlogTagFilter
            tags={tags}
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
          />
        </div>

        {/* Blog Grid */}
        {filteredBlogs.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBlogs.map((blog) => (
              <BlogCard key={blog.frontmatter.slug} blog={blog} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="rounded-full bg-white/5 p-6">
              <BookOpen className="h-12 w-12 text-gray-600" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-gray-300">
              No posts found
            </h3>
            <p className="mt-2 text-gray-500">
              No blog posts match the selected filter.
            </p>
            <button
              onClick={() => setSelectedTag(null)}
              className="mt-4 text-purple-400 hover:text-purple-300"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

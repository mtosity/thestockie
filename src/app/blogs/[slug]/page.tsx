import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { getAllBlogSlugs, getBlogBySlug } from "~/lib/blog";
import { formatBlogDate } from "~/lib/blog.shared";
import { BlogContent } from "~/components/features/blog-content";

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = getBlogBySlug(slug);

  if (!blog) {
    return {
      title: "Blog Not Found | The Stockie",
    };
  }

  return {
    title: `${blog.frontmatter.title} | The Stockie Blog`,
    description: blog.frontmatter.excerpt,
    openGraph: {
      title: blog.frontmatter.title,
      description: blog.frontmatter.excerpt,
      type: "article",
      publishedTime: blog.frontmatter.publishedAt,
      tags: blog.frontmatter.tags,
      images: [{ url: blog.frontmatter.coverImage }],
    },
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const blog = getBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  const { frontmatter, content, readingTime } = blog;

  return (
    <main className="min-h-screen bg-[#15162c] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href="/blogs"
            className="flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Blog</span>
          </Link>
        </div>
      </nav>

      {/* Hero Image */}
      <div className="relative h-64 w-full md:h-80 lg:h-96">
        <Image
          src={frontmatter.coverImage}
          alt={frontmatter.title}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#15162c] via-[#15162c]/40 to-transparent" />
        <span className="absolute bottom-3 right-4 text-xs text-white/40">
          Photo via Unsplash
        </span>
      </div>

      {/* Article Header */}
      <header className="border-b border-white/10 px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-4xl">
          {/* Tags */}
          <div className="mb-6 flex flex-wrap gap-2">
            {frontmatter.tags?.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-purple-500/20 text-purple-300"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
            {frontmatter.title}
          </h1>

          {/* Excerpt */}
          <p className="mt-6 text-lg text-gray-400">{frontmatter.excerpt}</p>

          {/* Meta */}
          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={frontmatter.publishedAt}>
                {formatBlogDate(frontmatter.publishedAt)}
              </time>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{readingTime}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <article className="px-4 py-12 md:px-8">
        <div className="prose prose-purple prose-invert mx-auto max-w-4xl prose-headings:text-white prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-300 prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300 prose-blockquote:border-purple-500 prose-blockquote:text-gray-400 prose-strong:text-white prose-code:text-purple-300 prose-pre:border prose-pre:border-white/10 prose-pre:bg-white/5 prose-li:text-gray-300 prose-table:text-gray-300 prose-th:border-white/10 prose-th:text-white prose-td:border-white/10">
          <BlogContent content={content} />
        </div>
      </article>

      {/* Related Posts / CTA */}
      <section className="border-t border-white/10 px-4 py-12 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold">Continue Learning</h2>
          <p className="mt-2 text-gray-400">
            Explore more articles to improve your investment knowledge.
          </p>
          <Link
            href="/blogs"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-500 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-600"
          >
            View All Posts
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="flex h-16 items-center justify-center gap-8 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()}</p>
          <a
            href="https://mtosity.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            @mtosity
          </a>
        </div>
      </footer>
    </main>
  );
}

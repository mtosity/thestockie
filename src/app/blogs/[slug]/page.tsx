import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, Clock } from "lucide-react";
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

  const url = `https://thestockie.com/blogs/${slug}`;

  return {
    title: `${blog.frontmatter.title} | The Stockie Blog`,
    description: blog.frontmatter.excerpt,
    keywords: blog.frontmatter.tags?.join(", "),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: blog.frontmatter.title,
      description: blog.frontmatter.excerpt,
      type: "article",
      url,
      siteName: "The Stockie",
      publishedTime: blog.frontmatter.publishedAt,
      authors: ["The Stockie"],
      tags: blog.frontmatter.tags,
      images: [
        {
          url: blog.frontmatter.coverImage,
          width: 1200,
          height: 630,
          alt: blog.frontmatter.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: blog.frontmatter.title,
      description: blog.frontmatter.excerpt,
      images: [blog.frontmatter.coverImage],
      creator: "@mtosity",
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

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: frontmatter.title,
    description: frontmatter.excerpt,
    image: frontmatter.coverImage,
    datePublished: frontmatter.publishedAt,
    dateModified: frontmatter.publishedAt,
    author: {
      "@type": "Organization",
      name: "The Stockie",
      url: "https://thestockie.com",
    },
    publisher: {
      "@type": "Organization",
      name: "The Stockie",
      url: "https://thestockie.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://thestockie.com/blogs/${slug}`,
    },
    keywords: frontmatter.tags?.join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-background text-foreground">
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
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />
          <span className="absolute bottom-3 right-4 text-xs text-foreground/40">
            Photo via Unsplash
          </span>
        </div>

        {/* Article Header */}
        <header className="border-b border-border px-4 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-4xl">
            {/* Tags */}
            <div className="mb-6 flex flex-wrap gap-2">
              {frontmatter.tags?.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-primary/20 text-primary"
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
            <p className="mt-6 text-lg text-muted-foreground">{frontmatter.excerpt}</p>

            {/* Meta */}
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
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
          <div className="prose prose-purple prose-invert mx-auto max-w-4xl prose-headings:text-foreground prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-muted-foreground prose-a:text-primary prose-a:no-underline prose-a:hover:text-primary prose-blockquote:border-primary prose-blockquote:text-muted-foreground prose-strong:text-foreground prose-code:text-primary prose-pre:border prose-pre:border-border prose-pre:bg-foreground/5 prose-li:text-muted-foreground prose-table:text-muted-foreground prose-th:border-border prose-th:text-foreground prose-td:border-border">
            <BlogContent content={content} />
          </div>
        </article>

        {/* Related Posts / CTA */}
        <section className="border-t border-border px-4 py-12 md:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold">Continue Learning</h2>
            <p className="mt-2 text-muted-foreground">
              Explore more articles to improve your investment knowledge.
            </p>
            <Link
              href="/blogs"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              View All Posts
            </Link>
          </div>
        </section>

      </main>
    </>
  );
}

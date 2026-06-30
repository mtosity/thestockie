import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, Clock } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { getAllBlogs, getAllBlogSlugs, getBlogBySlug } from "~/lib/blog";
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
  const keywords = [
    ...(blog.frontmatter.seoKeywords || []),
    ...(blog.frontmatter.tags || []),
  ];

  return {
    title: `${blog.frontmatter.title} | The Stockie Blog`,
    description: blog.frontmatter.excerpt,
    keywords: keywords.join(", "),
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
      modifiedTime: blog.frontmatter.updatedAt || blog.frontmatter.publishedAt,
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
  const url = `https://thestockie.com/blogs/${slug}`;

  // JSON-LD: Article schema with proper dateModified
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: frontmatter.title,
    description: frontmatter.excerpt,
    image: frontmatter.coverImage,
    datePublished: frontmatter.publishedAt,
    dateModified: frontmatter.updatedAt || frontmatter.publishedAt,
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
      "@id": url,
    },
    keywords: [
      ...(frontmatter.seoKeywords || []),
      ...(frontmatter.tags || []),
    ].join(", "),
  };

  // JSON-LD: BreadcrumbList schema
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://thestockie.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://thestockie.com/blogs",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: frontmatter.title,
        item: url,
      },
    ],
  };

  // JSON-LD: FAQ schema (if faq field exists in frontmatter)
  const faqLd = frontmatter.faq
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: frontmatter.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

  // Related posts: find posts that share at least one tag, exclude current
  const allBlogs = getAllBlogs();
  const relatedPosts = allBlogs
    .filter(
      (b) =>
        b.frontmatter.slug !== slug &&
        b.frontmatter.tags?.some((tag) => frontmatter.tags?.includes(tag)),
    )
    .slice(0, 3);

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

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
                  className="bg-primary/20 text-foreground"
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
            <p className="mt-6 text-lg text-muted-foreground">
              {frontmatter.excerpt}
            </p>

            {/* Meta */}
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <time dateTime={frontmatter.publishedAt}>
                  {formatBlogDate(frontmatter.publishedAt)}
                </time>
              </div>
              {frontmatter.updatedAt &&
                frontmatter.updatedAt !== frontmatter.publishedAt && (
                  <div className="flex items-center gap-2 text-xs">
                    <span>
                      Updated: {formatBlogDate(frontmatter.updatedAt)}
                    </span>
                  </div>
                )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{readingTime}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Article Content */}
        <article className="px-4 py-12 md:px-8">
          <div className="prose  dark:prose-invert mx-auto max-w-4xl prose-headings:text-foreground prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-muted-foreground prose-a:text-foreground prose-a:no-underline prose-a:hover:text-foreground prose-blockquote:border-primary prose-blockquote:text-muted-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:border prose-pre:border-border prose-pre:bg-foreground/5 prose-li:text-muted-foreground prose-table:text-muted-foreground prose-th:border-border prose-th:text-foreground prose-td:border-border">
            <BlogContent content={content} />
          </div>
        </article>

        {/* Related Posts (internal linking for SEO) */}
        {relatedPosts.length > 0 && (
          <section className="border-t border-border px-4 py-12 md:px-8">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-6 text-2xl font-bold">Related Articles</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {relatedPosts.map((post) => (
                  <Link
                    key={post.frontmatter.slug}
                    href={`/blogs/${post.frontmatter.slug}`}
                    className="group rounded-lg border border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent"
                  >
                    <div className="mb-2 flex flex-wrap gap-1">
                      {post.frontmatter.tags?.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary">
                      {post.frontmatter.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {post.frontmatter.excerpt}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {formatBlogDate(post.frontmatter.publishedAt)}
                      </span>
                      <span>·</span>
                      <span>{post.readingTime}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
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
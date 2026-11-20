// Types and utilities that can be used on both client and server

export interface BlogFrontmatter {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  tags: string[];
  publishedAt: string;
  updatedAt?: string;
  seoKeywords?: string[];
  faq?: { question: string; answer: string }[];
}

export interface Blog {
  frontmatter: BlogFrontmatter;
  content: string;
  readingTime: string;
}

export interface BlogMeta {
  frontmatter: BlogFrontmatter;
  readingTime: string;
}

/**
 * Format date for display
 */
export function formatBlogDate(dateString: string): string {
  const date = new Date(dateString);
  // Frontmatter dates are date-only ("2026-11-04"), which parse as UTC
  // midnight. Format in UTC too, so the server and every browser show the
  // same day; in a US timezone the local date would be the day before
  // (and would cause a hydration mismatch).
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

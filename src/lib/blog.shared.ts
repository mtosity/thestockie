// Types and utilities that can be used on both client and server

export interface BlogFrontmatter {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  tags: string[];
  publishedAt: string;
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
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

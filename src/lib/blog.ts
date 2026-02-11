import "server-only";

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import type { BlogFrontmatter, Blog, BlogMeta } from "./blog.shared";

// Re-export shared types and utilities
export * from "./blog.shared";

const BLOGS_PATH = path.join(process.cwd(), "content/blogs");

/**
 * Get all blog posts sorted by date (newest first)
 */
export function getAllBlogs(): BlogMeta[] {
  if (!fs.existsSync(BLOGS_PATH)) {
    return [];
  }

  const files = fs.readdirSync(BLOGS_PATH).filter((file) => file.endsWith(".mdx"));

  const blogs = files
    .map((file) => {
      const filePath = path.join(BLOGS_PATH, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContent);

      return {
        frontmatter: data as BlogFrontmatter,
        readingTime: readingTime(content).text,
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.frontmatter.publishedAt);
      const dateB = new Date(b.frontmatter.publishedAt);
      return dateB.getTime() - dateA.getTime();
    });

  return blogs;
}

/**
 * Get a single blog post by slug
 */
export function getBlogBySlug(slug: string): Blog | null {
  if (!fs.existsSync(BLOGS_PATH)) {
    return null;
  }

  const files = fs.readdirSync(BLOGS_PATH).filter((file) => file.endsWith(".mdx"));

  for (const file of files) {
    const filePath = path.join(BLOGS_PATH, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    if ((data as BlogFrontmatter).slug === slug) {
      return {
        frontmatter: data as BlogFrontmatter,
        content,
        readingTime: readingTime(content).text,
      };
    }
  }

  return null;
}

/**
 * Get all unique tags from all blog posts
 */
export function getAllTags(): string[] {
  const blogs = getAllBlogs();
  const tagsSet = new Set<string>();

  blogs.forEach((blog) => {
    blog.frontmatter.tags?.forEach((tag) => tagsSet.add(tag));
  });

  return Array.from(tagsSet).sort();
}

/**
 * Get all blog slugs for static generation
 */
export function getAllBlogSlugs(): string[] {
  const blogs = getAllBlogs();
  return blogs.map((blog) => blog.frontmatter.slug);
}

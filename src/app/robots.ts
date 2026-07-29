import type { MetadataRoute } from "next";
import { SITE_URL } from "~/lib/site";

/**
 * Answer engines (ChatGPT, Perplexity, Claude, Gemini grounding) fetch with
 * their own user agents. They are covered by the `*` rule already, but naming
 * them explicitly documents the intent and keeps a future tightening of `*`
 * from silently de-indexing us from AI answers.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "Bingbot",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

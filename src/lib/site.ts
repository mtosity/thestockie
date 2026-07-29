/**
 * Canonical site origin.
 *
 * Vercel 308-redirects the apex domain to `www`, so every canonical URL,
 * sitemap entry and JSON-LD `@id` must use `www` — otherwise every declared
 * canonical points at a redirect and search/AI crawlers have to resolve one
 * extra hop before they can attribute the page.
 */
export const SITE_URL = "https://www.thestockie.com";
export const SITE_NAME = "The Stockie";

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

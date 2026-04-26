/**
 * Dynamic XML sitemap endpoint.
 *
 * Generates a sitemap following Google's best practices:
 * - Uses the sitemap protocol 0.9 namespace
 * - Includes <lastmod> dates from Sanity _updatedAt fields
 * - Excludes error pages (404) and non-canonical routes
 * - Serves correct Content-Type (application/xml)
 * - Caches responses to reduce Sanity API calls
 *
 * Because the site runs in SSR mode with dynamic /events/[slug] routes,
 * we query Sanity at request time to enumerate all published event slugs
 * rather than relying on static-only sitemap generators.
 *
 * @see https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
 * @see https://www.sitemaps.org/protocol.html
 */

import type { APIRoute } from 'astro';
import { getSanityClient } from '../lib/sanity';

export const prerender = false;

interface SitemapEntry {
  slug: string;
  _updatedAt: string;
}

interface SitemapEvent extends SitemapEntry {}
interface SitemapTopic extends SitemapEntry {}

/**
 * Fetches all published event slugs and their last-modified dates from Sanity.
 * Only includes events that have a slug (required to generate a URL).
 */
async function getEventSlugs(): Promise<SitemapEvent[]> {
  const client = getSanityClient();

  return client.fetch<SitemapEvent[]>(`
    *[_type == "event" && defined(slug.current) && !(_id in path("drafts.**"))] {
      "slug": slug.current,
      _updatedAt
    } | order(_updatedAt desc)
  `);
}

/**
 * Fetches all published topic slugs and their last-modified dates from Sanity.
 * Only includes topics that have a slug (required to generate a URL).
 */
async function getTopicSlugs(): Promise<SitemapTopic[]> {
  const client = createClient({
    projectId: import.meta.env.SANITY_PROJECT,
    dataset: import.meta.env.SANITY_DATASET,
    apiVersion: import.meta.env.SANITY_API_VERSION || '2021-03-25',
    useCdn: true,
  });

  return client.fetch<SitemapTopic[]>(`
    *[_type == "topic" && defined(slug.current) && !(_id in path("drafts.**"))] {
      "slug": slug.current,
      _updatedAt
    } | order(_updatedAt desc)
  `);
}

/**
 * Formats an ISO date string to the W3C Datetime format used in sitemaps.
 * Falls back to the current date if the input is invalid.
 */
function toW3CDate(isoDate?: string): string {
  if (!isoDate) return new Date().toISOString().split('T')[0];
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
  return date.toISOString().split('T')[0];
}

export const GET: APIRoute = async (context) => {
  const site = 'https://eventua11y.com';
  const today = new Date().toISOString().split('T')[0];
  const topicsEnabled = context.locals.flags.topic_pages_enabled;

  // Fetch event and topic slugs from Sanity (topics only when flag is on)
  let events: SitemapEvent[] = [];
  let topics: SitemapTopic[] = [];
  try {
    if (topicsEnabled) {
      [events, topics] = await Promise.all([getEventSlugs(), getTopicSlugs()]);
    } else {
      events = await getEventSlugs();
    }
  } catch {
    // If Sanity is unreachable, generate sitemap with static pages only.
    // This ensures crawlers still get a valid response.
  }

  // Static pages with manually assigned priorities.
  // Priorities are relative hints to search engines about page importance
  // within this site, not absolute rankings.
  const staticPages = [
    { loc: '/', changefreq: 'daily', priority: '1.0', lastmod: today },
    {
      loc: '/past-events',
      changefreq: 'daily',
      priority: '0.7',
      lastmod: today,
    },
    {
      loc: '/accessibility',
      changefreq: 'monthly',
      priority: '0.5',
      lastmod: today,
    },
    {
      loc: '/curation-policy',
      changefreq: 'monthly',
      priority: '0.5',
      lastmod: today,
    },
    ...(topicsEnabled
      ? [
          {
            loc: '/topics',
            changefreq: 'weekly',
            priority: '0.6',
            lastmod: today,
          },
        ]
      : []),
  ];

  const urlEntries = staticPages
    .map(
      (page) => `  <url>
    <loc>${site}${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .concat(
      events.map(
        (event) => `  <url>
    <loc>${site}/events/${event.slug}</loc>
    <lastmod>${toW3CDate(event._updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
      )
    )
    .concat(
      topics.map(
        (topic) => `  <url>
    <loc>${site}/topics/${topic.slug}</loc>
    <lastmod>${toW3CDate(topic._updatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
      )
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
      'X-Robots-Tag': 'noindex',
    },
  });
};

/**
 * Shared Sanity client configuration for Netlify edge functions.
 *
 * Both get-events.ts and get-books.ts use identical client setup.
 * This module centralises it to avoid duplication.
 */

import { createClient, type SanityClient } from 'https://esm.sh/@sanity/client';

/** Creates a configured Sanity client for use in edge functions. */
export function createSanityClient(): SanityClient {
  return createClient({
    projectId: Deno.env.get('SANITY_PROJECT') || '',
    dataset: Deno.env.get('SANITY_DATASET') || '',
    apiVersion: Deno.env.get('SANITY_API_VERSION') || '2021-03-25',
    useCdn: Deno.env.get('SANITY_CDN') === 'true',
  });
}

/**
 * Shared Sanity client configuration for Netlify edge functions.
 *
 * Both get-events.ts and get-books.ts use identical client setup.
 * This module centralises it to avoid duplication.
 */

import { createClient, type SanityClient } from 'https://esm.sh/@sanity/client';

/** Reads Sanity connection config from Deno environment variables. */
function getConfig() {
  return {
    projectId: Deno.env.get('SANITY_PROJECT') || '',
    dataset: Deno.env.get('SANITY_DATASET') || '',
    apiVersion: Deno.env.get('SANITY_API_VERSION') || '2021-03-25',
    useCdn: Deno.env.get('SANITY_CDN') === 'true',
  };
}

/**
 * Creates a configured Sanity client for use in edge functions.
 * @throws {Error} If client initialisation fails
 */
export function createSanityClient(): SanityClient {
  try {
    return createClient(getConfig());
  } catch (error) {
    console.error('Failed to create Sanity client:', error);
    throw new Error('Sanity client initialization failed', { cause: error });
  }
}

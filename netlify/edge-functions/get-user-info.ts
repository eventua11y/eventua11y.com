/**
 * Edge function to get user information from request headers
 * Returns language preference, timezone and geo data
 */

import type { Config, Context } from 'https://edge.netlify.com/v1/index.ts';

interface UserInfo {
  acceptLanguage: string | null;
  timezone: string | undefined;
  geo: Context['geo'];
}

/**
 * Edge function handler
 * @param {Request} request - HTTP request object with headers
 * @param {Context} context - Netlify Edge context with geo data
 * @returns {Response} JSON response with user info
 */
export default async (
  request: Request,
  context: Context
): Promise<Response> => {
  try {
    // Extract user information from request headers
    const acceptLanguage = request.headers.get('accept-language');

    // Get geo data from Netlify Edge context
    const geo = context.geo || {};
    const timezone = geo.timezone;

    // Construct response object
    const userInfo: UserInfo = {
      acceptLanguage, // User's language preferences
      timezone, // User's timezone from geo data
      geo, // Full geo data object
    };

    return new Response(JSON.stringify(userInfo), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('[get-user-info] Failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to get user info' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * Edge function configuration
 * Defines API endpoint path
 */
export const config: Config = { path: '/api/get-user-info' };

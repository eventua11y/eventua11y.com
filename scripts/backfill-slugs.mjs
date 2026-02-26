/**
 * Backfill slugs for all existing events in Sanity.
 *
 * Usage:
 *   SANITY_PROJECT=<id> SANITY_DATASET=<dataset> SANITY_TOKEN=<token> node scripts/backfill-slugs.mjs
 *
 * Or with a --dry-run flag to preview changes without writing:
 *   SANITY_PROJECT=<id> SANITY_DATASET=<dataset> SANITY_TOKEN=<token> node scripts/backfill-slugs.mjs --dry-run
 */

import { createClient } from '@sanity/client';

const projectId = process.env.SANITY_PROJECT;
const dataset = process.env.SANITY_DATASET;
const token = process.env.SANITY_TOKEN;
const dryRun = process.argv.includes('--dry-run');

if (!projectId || !dataset || !token) {
  console.error(
    'Missing required environment variables: SANITY_PROJECT, SANITY_DATASET, SANITY_TOKEN'
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2024-01-01',
  useCdn: false,
});

/**
 * Generate a URL-safe slug from a string.
 * Handles unicode, special characters, and normalises whitespace.
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // Decompose unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[#()\[\]{}<>!@£$%^&*+=~`|\\;:'",.?/]/g, '') // Remove punctuation
    .replace(/\s+/g, '-') // Replace whitespace with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim leading/trailing hyphens
}

async function main() {
  console.log(dryRun ? '🔍 DRY RUN MODE\n' : '✏️  WRITE MODE\n');

  // Fetch all events without slugs
  const events = await client.fetch(
    `*[_type == "event" && !(_id in path("drafts.**")) && !defined(slug)] {
      _id,
      title,
      dateStart
    } | order(dateStart asc)`
  );

  console.log(`Found ${events.length} events without slugs.\n`);

  if (events.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // Track used slugs to handle duplicates
  // First, fetch any existing slugs
  const existingSlugs = await client.fetch(
    `*[_type == "event" && defined(slug.current)].slug.current`
  );
  const usedSlugs = new Set(existingSlugs);

  let patchCount = 0;
  const errors = [];

  for (const event of events) {
    let baseSlug = slugify(event.title);

    if (!baseSlug) {
      console.warn(
        `⚠️  Could not generate slug for "${event.title}" (${event._id})`
      );
      errors.push({ id: event._id, title: event.title, reason: 'empty slug' });
      continue;
    }

    // If the slug is already taken, append the year from dateStart
    let slug = baseSlug;
    if (usedSlugs.has(slug)) {
      const year = event.dateStart
        ? new Date(event.dateStart).getFullYear()
        : null;
      if (year) {
        slug = `${baseSlug}-${year}`;
      }
    }

    // If still a duplicate, append a counter
    let counter = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    usedSlugs.add(slug);

    if (dryRun) {
      console.log(`  ${event.title} → ${slug}`);
    } else {
      try {
        await client
          .patch(event._id)
          .set({ slug: { _type: 'slug', current: slug } })
          .commit();
        console.log(`✅ ${event.title} → ${slug}`);
        patchCount++;
      } catch (err) {
        console.error(
          `❌ Failed to patch "${event.title}" (${event._id}): ${err.message}`
        );
        errors.push({ id: event._id, title: event.title, reason: err.message });
      }
    }
  }

  console.log(
    `\n${dryRun ? 'Would patch' : 'Patched'} ${dryRun ? events.length - errors.length : patchCount} events.`
  );

  if (errors.length > 0) {
    console.log(`\n⚠️  ${errors.length} errors:`);
    for (const err of errors) {
      console.log(`  - ${err.title} (${err.id}): ${err.reason}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

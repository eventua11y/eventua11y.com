#!/usr/bin/env node
/**
 * Migration script: Convert plain-text event descriptions to Portable Text.
 *
 * This converts every event whose `description` is a plain string into a
 * Portable Text block array (a single "normal" block per paragraph).
 *
 * Usage:
 *   SANITY_TOKEN=<token> node scripts/migrate-descriptions.mjs [--dry-run]
 *
 * The script is idempotent — it skips events whose description is already
 * an array (Portable Text).
 */

import { createClient } from '@sanity/client';
import { randomUUID } from 'crypto';

const DRY_RUN = process.argv.includes('--dry-run');

const client = createClient({
  projectId: '2g5zqxo3',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

/**
 * Convert a plain-text string to a Portable Text block array.
 * Each paragraph (separated by double newlines) becomes its own block.
 * Single newlines within a paragraph are preserved as-is (they become
 * part of the span text).
 */
function textToPortableText(text) {
  // Split on double-newlines to create separate blocks (paragraphs)
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());

  return paragraphs.map((paragraph) => ({
    _type: 'block',
    _key: randomUUID().replace(/-/g, '').slice(0, 12),
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: randomUUID().replace(/-/g, '').slice(0, 12),
        text: paragraph.trim(),
        marks: [],
      },
    ],
  }));
}

async function migrate() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE MIGRATION ===');

  // Fetch all events with a description (excluding drafts)
  const events = await client.fetch(
    `*[_type == "event" && defined(description) && !(_id in path("drafts.**"))]{_id, title, description}`
  );

  console.log(`Found ${events.length} events with descriptions`);

  let converted = 0;
  let skipped = 0;

  for (const event of events) {
    // Skip if already Portable Text (array)
    if (Array.isArray(event.description)) {
      skipped++;
      continue;
    }

    if (typeof event.description !== 'string') {
      console.warn(
        `  SKIP ${event._id} — unexpected type: ${typeof event.description}`
      );
      skipped++;
      continue;
    }

    const blocks = textToPortableText(event.description);

    if (DRY_RUN) {
      console.log(`  Would convert: ${event.title} (${event._id})`);
      console.log(`    ${event.description.slice(0, 80)}...`);
      console.log(`    → ${blocks.length} block(s)`);
    } else {
      await client.patch(event._id).set({ description: blocks }).commit();
      console.log(`  Converted: ${event.title}`);
    }

    converted++;
  }

  console.log(`\nDone. Converted: ${converted}, Skipped: ${skipped}`);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

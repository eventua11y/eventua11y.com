/**
 * Utilities for working with Portable Text descriptions.
 *
 * During the migration from plain text to Portable Text, the
 * `description` field on events may be either a string (legacy)
 * or a PortableTextBlock[] (new). These helpers normalise both
 * formats so rendering code doesn't need to branch.
 */

import { toPlainText } from '@portabletext/toolkit';
import type { PortableTextBlock } from '@portabletext/types';
import type { EventDescription } from '../types/event';

/**
 * Extracts plain text from an EventDescription, regardless of
 * whether it is a legacy string or a Portable Text block array.
 */
export function descriptionToPlainText(
  description: EventDescription | undefined
): string {
  if (!description) return '';
  if (typeof description === 'string') return description;
  return toPlainText(description as PortableTextBlock[]);
}

/**
 * Type guard: returns true when the description is a Portable Text
 * block array rather than a plain string.
 */
export function isPortableText(
  description: EventDescription | undefined
): description is PortableTextBlock[] {
  return Array.isArray(description);
}

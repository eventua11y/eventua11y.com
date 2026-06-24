/**
 * Shared type definitions for events across the application.
 */

import type { PortableTextBlock } from '@portabletext/types';

interface Speaker {
  _id: string;
  name: string;
}

interface Organizer {
  _id: string;
  name: string;
  website?: string;
}

export interface Topic {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
  body: any[];
}

/**
 * Lightweight topic reference used on event detail pages and listing queries.
 * Excludes the full Portable Text body to reduce payload size.
 */
interface TopicSummary {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
}

export interface Event {
  _id: string;
  _type?: string;
  type: string;
  title: string;
  slug?: { current: string };
  description?: string;
  richDescription?: PortableTextBlock[];
  dateStart: string;
  dateEnd?: string;
  timezone?: string;
  day?: boolean;
  callForSpeakers?: boolean;
  callForSpeakersClosingDate?: string;
  attendanceMode?: string;
  location?: string;
  isFree?: boolean;
  website?: string;
  registration?: string;
  codeOfConduct?: string;
  accessibilityInfo?: { url?: string; summary?: string };
  schedule?: string;
  callForSpeakersLink?: string;
  parent?: { _ref: string };
  parentEvent?: { title: string; slug?: { current: string } };
  children?: ChildEvent[];
  isParent?: boolean;
  format?: string;
  speakers?: Speaker[];
  organizer?: Organizer;
  topics?: TopicSummary[];
  hashtags?: string[];
}

export interface ChildEvent {
  _id: string;
  title: string;
  slug?: { current: string };
  type?: string;
  dateStart?: string;
  dateEnd?: string;
  timezone?: string;
  day?: boolean;
  website?: string;
  format?: string;
  scheduled?: boolean;
  speakers?: Speaker[];
}

export interface Book {
  _id?: string;
  _type: 'book';
  title: string;
  link?: string;
  date?: string;
  dateStart: string;
}

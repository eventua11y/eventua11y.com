/**
 * Shared type definitions for events across the application.
 */

export interface Speaker {
  _id: string;
  name: string;
}

export interface Event {
  _id: string;
  _type?: string;
  type: string;
  title: string;
  description?: string;
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
  parent?: { _ref: string };
  children?: ChildEvent[];
  isParent?: boolean;
  speakers?: Speaker[];
}

export interface ChildEvent {
  _id: string;
  title: string;
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

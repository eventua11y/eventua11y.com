/**
 * Shared event assembly logic.
 *
 * Groups child events by parent and creates CFS deadline events.
 * Used by both the Astro SSR layer and the edge function.
 *
 * IMPORTANT: This file must have zero external package imports —
 * it runs in both Node (Astro) and Deno (edge functions) contexts.
 */

/** Minimal event shape needed for assembly (subset of full Event type). */
export interface AssemblableEvent {
  _id: string;
  _type?: string;
  type?: string;
  title: string;
  dateStart: string;
  timezone?: string;
  website?: string;
  attendanceMode?: string;
  callForSpeakers?: boolean;
  callForSpeakersClosingDate?: string;
  parent?: { _ref: string };
  children?: AssemblableEvent[];
}

/**
 * Groups child events under their parents and creates synthetic
 * CFS (Call for Speakers) deadline events where applicable.
 *
 * @param parentEvents - Events without a parent reference
 * @param childEvents - Events with a parent reference
 * @returns Flat array of assembled events (parents with children attached, plus CFS deadlines)
 */
export function assembleEvents(
  parentEvents: AssemblableEvent[],
  childEvents: AssemblableEvent[]
): AssemblableEvent[] {
  // Group children by parent
  const childrenByParent: Record<string, AssemblableEvent[]> = {};
  for (const child of childEvents) {
    const parentId = child.parent?._ref;
    if (parentId) {
      if (!childrenByParent[parentId]) childrenByParent[parentId] = [];
      childrenByParent[parentId].push(child);
    }
  }

  // Attach children + create CFS deadline events
  const allEvents: AssemblableEvent[] = [];
  for (const event of parentEvents) {
    const children = childrenByParent[event._id];
    allEvents.push({
      ...event,
      children: children && children.length > 0 ? children : undefined,
    });

    if (event.callForSpeakersClosingDate) {
      allEvents.push({
        _id: `${event._id}-cfs-deadline`,
        _type: 'event',
        type: 'deadline',
        title: event.title,
        dateStart: event.callForSpeakersClosingDate,
        timezone: event.timezone,
        website: event.website,
        attendanceMode: event.attendanceMode,
        callForSpeakers: event.callForSpeakers,
      });
    }
  }

  return allEvents;
}

import { describe, it, expect } from 'vitest';
import {
  assembleEvents,
  type AssemblableEvent,
} from '../../netlify/edge-functions/lib/assembleEvents';

// ── Test helpers ───────────────────────────────────────────────────────

function makeParent(
  overrides: Partial<AssemblableEvent> & { _id: string }
): AssemblableEvent {
  return {
    _type: 'event',
    type: 'conference',
    title: 'Test Conference',
    dateStart: '2026-06-01T09:00:00Z',
    ...overrides,
  };
}

function makeChild(
  overrides: Partial<AssemblableEvent> & {
    _id: string;
    parent: { _ref: string };
  }
): AssemblableEvent {
  return {
    _type: 'event',
    type: 'talk',
    title: 'Test Talk',
    dateStart: '2026-06-01T10:00:00Z',
    ...overrides,
  };
}

// ── assembleEvents ─────────────────────────────────────────────────────

describe('assembleEvents', () => {
  it('returns an empty array when both inputs are empty', () => {
    expect(assembleEvents([], [])).toEqual([]);
  });

  it('returns parents unchanged when there are no children', () => {
    const parents = [
      makeParent({ _id: 'a', title: 'Event A' }),
      makeParent({ _id: 'b', title: 'Event B' }),
    ];

    const result = assembleEvents(parents, []);

    expect(result).toHaveLength(2);
    expect(result[0]._id).toBe('a');
    expect(result[1]._id).toBe('b');
  });

  it('attaches children under the correct parent', () => {
    const parents = [
      makeParent({ _id: 'parent-a' }),
      makeParent({ _id: 'parent-b' }),
    ];
    const children = [
      makeChild({ _id: 'child-1', parent: { _ref: 'parent-a' } }),
      makeChild({ _id: 'child-2', parent: { _ref: 'parent-a' } }),
      makeChild({ _id: 'child-3', parent: { _ref: 'parent-b' } }),
    ];

    const result = assembleEvents(parents, children);

    const parentA = result.find((e) => e._id === 'parent-a')!;
    const parentB = result.find((e) => e._id === 'parent-b')!;

    expect(parentA.children).toHaveLength(2);
    expect(parentA.children!.map((c) => c._id)).toEqual(['child-1', 'child-2']);
    expect(parentB.children).toHaveLength(1);
    expect(parentB.children![0]._id).toBe('child-3');
  });

  it('sets children to undefined (not empty array) when a parent has no matching children', () => {
    const parents = [makeParent({ _id: 'lonely-parent' })];
    const children = [
      makeChild({ _id: 'orphan', parent: { _ref: 'other-parent' } }),
    ];

    const result = assembleEvents(parents, children);

    expect(result[0].children).toBeUndefined();
  });

  it('creates a CFS deadline event for a parent with callForSpeakersClosingDate', () => {
    const parent = makeParent({
      _id: 'conf-1',
      title: 'Conf One',
      callForSpeakers: true,
      callForSpeakersClosingDate: '2026-03-31T23:59:00Z',
      timezone: 'Europe/London',
      website: 'https://example.com',
      attendanceMode: 'online',
    });

    const result = assembleEvents([parent], []);

    expect(result).toHaveLength(2);

    const deadline = result[1];
    expect(deadline._id).toBe('conf-1-cfs-deadline');
    expect(deadline._type).toBe('event');
    expect(deadline.type).toBe('deadline');
    expect(deadline.title).toBe('Conf One');
    expect(deadline.dateStart).toBe('2026-03-31T23:59:00Z');
    expect(deadline.timezone).toBe('Europe/London');
    expect(deadline.website).toBe('https://example.com');
    expect(deadline.attendanceMode).toBe('online');
    expect(deadline.callForSpeakers).toBe(true);
  });

  it('does not create a CFS deadline event when callForSpeakersClosingDate is not set', () => {
    const parent = makeParent({ _id: 'no-cfs', callForSpeakers: false });

    const result = assembleEvents([parent], []);

    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('no-cfs');
  });

  it('ignores children whose parent reference is undefined', () => {
    const parents = [makeParent({ _id: 'parent-x' })];
    const children: AssemblableEvent[] = [
      // No `parent` field at all
      {
        _id: 'child-no-parent',
        title: 'Orphan Child',
        dateStart: '2026-06-01T11:00:00Z',
      },
    ];

    const result = assembleEvents(parents, children);

    expect(result[0].children).toBeUndefined();
  });

  it('preserves parent order and places CFS deadline immediately after its parent', () => {
    const parents = [
      makeParent({
        _id: 'first',
        title: 'First',
        callForSpeakersClosingDate: '2026-02-01T00:00:00Z',
      }),
      makeParent({ _id: 'second', title: 'Second' }),
      makeParent({
        _id: 'third',
        title: 'Third',
        callForSpeakersClosingDate: '2026-04-01T00:00:00Z',
      }),
    ];

    const result = assembleEvents(parents, []);

    expect(result.map((e) => e._id)).toEqual([
      'first',
      'first-cfs-deadline',
      'second',
      'third',
      'third-cfs-deadline',
    ]);
  });
});

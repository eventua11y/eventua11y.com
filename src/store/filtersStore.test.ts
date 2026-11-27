import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { Event } from '../types/event';

const deadline: Event = {
  _id: 'deadline',
  title: 'Deadline',
  type: 'deadline',
  dateStart: '2027-01-01T00:00:00Z',
};

function setupBrowser(storage: Partial<Storage>) {
  vi.stubGlobal('window', { localStorage: storage });
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {}))
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('saved filters', () => {
  it('fills missing fields with defaults without marking unchanged filters as changed', async () => {
    setupBrowser({
      getItem: vi.fn(() =>
        JSON.stringify({
          cfs: 'any',
          attendance: 'any',
          cost: 'any',
          showAwarenessDays: true,
          showBooks: true,
        })
      ),
      setItem: vi.fn(),
    });
    const { default: store } = await import('./filtersStore');

    store.setEvents([deadline], [], []);
    expect(store.filters.showDeadlines).toBe(true);
    expect(store.filteredEvents).toEqual([deadline]);
    expect(store.isChanged).toBe(false);
  });

  it('preserves older saved choices and resets them to current defaults', async () => {
    const setItem = vi.fn();
    setupBrowser({
      getItem: vi.fn(() => JSON.stringify({ attendance: 'online' })),
      setItem,
    });
    const { default: store } = await import('./filtersStore');

    expect(store.filters.attendance).toBe('online');
    expect(store.filters.showDeadlines).toBe(true);
    expect(store.isChanged).toBe(true);
    store.resetFilters();
    expect(store.filters.attendance).toBe('any');
    expect(store.isChanged).toBe(false);
    expect(JSON.parse(setItem.mock.lastCall![1]).showDeadlines).toBe(true);
  });

  it.each(['{', 'null', '[]', '"invalid"'])(
    'uses defaults for invalid saved data %s',
    async (saved) => {
      setupBrowser({ getItem: vi.fn(() => saved), setItem: vi.fn() });
      const { default: store } = await import('./filtersStore');
      store.setEvents([deadline], [], []);

      expect(store.isChanged).toBe(false);
      expect(store.filteredEvents).toEqual([deadline]);
      expect(console.warn).toHaveBeenCalled();
    }
  );

  it('ignores invalid fields while preserving valid choices', async () => {
    setupBrowser({
      getItem: vi.fn(() =>
        JSON.stringify({ cost: 'free', showDeadlines: null, cfs: 'invalid' })
      ),
      setItem: vi.fn(),
    });
    const { default: store } = await import('./filtersStore');
    expect(store.filters.cost).toBe('free');
    expect(store.filters.cfs).toBe('any');
    expect(store.filters.showDeadlines).toBe(true);
    expect(console.warn).toHaveBeenCalled();
  });

  it('saves filter changes when storage is available', async () => {
    const setItem = vi.fn();
    setupBrowser({ getItem: vi.fn(() => null), setItem });
    const { default: store } = await import('./filtersStore');
    store.filters.showDeadlines = false;
    await nextTick();
    expect(JSON.parse(setItem.mock.lastCall![1]).showDeadlines).toBe(false);
  });

  it('continues updating and resetting events when writes fail', async () => {
    setupBrowser({
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error('Storage blocked');
      }),
    });
    const { default: store } = await import('./filtersStore');
    store.setEvents([deadline], [], []);
    store.filters.showDeadlines = false;
    await nextTick();
    expect(store.filteredEvents).toEqual([]);
    expect(store.isChanged).toBe(true);
    store.resetFilters();
    expect(store.filteredEvents).toEqual([deadline]);
    expect(store.isChanged).toBe(false);
    expect(console.warn).toHaveBeenCalled();
    await nextTick();
  });

  it.each(['getter', 'read'])(
    'starts with defaults when the storage %s throws',
    async (failure) => {
      const storage = {
        getItem: vi.fn(() => {
          throw new Error('Storage blocked');
        }),
        setItem: vi.fn(),
      };
      if (failure === 'getter') {
        vi.stubGlobal('window', {
          get localStorage() {
            throw new Error('Storage blocked');
          },
        });
        vi.stubGlobal(
          'fetch',
          vi.fn(() => new Promise(() => {}))
        );
      } else {
        setupBrowser(storage);
      }
      const { default: store } = await import('./filtersStore');
      store.setEvents([deadline], [], []);
      expect(store.filteredEvents).toEqual([deadline]);
      expect(store.isChanged).toBe(false);
      expect(console.warn).toHaveBeenCalled();
    }
  );
});

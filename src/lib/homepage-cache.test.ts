import { getViteConfig } from 'astro/config';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { createContext } from 'astro/middleware';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createViteServer, type Vite } from 'vitest/node';
import type { Event } from '../types/event';

const site = 'https://example.test';
const netlifyCache = 'Netlify-CDN-Cache-Control';
const browserCache = 'private, max-age=300, stale-while-revalidate=60';
const events = vi.fn();
const books = vi.fn();
let server: Awaited<ReturnType<typeof createViteServer>>;

beforeAll(async () => {
  const configure = getViteConfig({
    // Compile the Astro routes without opening a listening socket.
    server: { middlewareMode: true, ws: false, watch: null },
    plugins: [
      {
        name: 'mock-sanity-reads',
        transform(_, id) {
          if (id.endsWith('/src/lib/sanity.ts')) {
            return `export let getEvents, getBooks;
            export function setReads(events, books) { getEvents = events; getBooks = books; }`;
          }
        },
      },
    ],
    define: {
      'import.meta.env.PUBLIC_POSTHOG_KEY': 'undefined',
    },
  });
  // Astro and Vitest use different Vite majors, so their config types differ.
  const config = (await configure({
    command: 'serve',
    mode: 'test',
  })) as Vite.InlineConfig;
  server = await createViteServer({ ...config, configFile: false });
  const sanity = await server.ssrLoadModule('/src/lib/sanity.ts');
  sanity.setReads(events, books);
});

afterAll(() => server?.close());
beforeEach(() => {
  events.mockReset().mockResolvedValue({ future: [], past: [] });
  books.mockReset().mockResolvedValue([]);
});

async function renderPage(path = '/'): Promise<Response> {
  const page = await server.ssrLoadModule(
    path === '/' ? '/src/pages/index.astro' : '/src/pages/past-events.astro'
  );
  const { onRequest } = await server.ssrLoadModule('/src/middleware.ts');
  const container = await AstroContainer.create({
    astroConfig: { site },
    streaming: true,
  });
  const { default: vueRenderer } = await server.ssrLoadModule(
    '@astrojs/vue/server.js'
  );
  container.addServerRenderer({ name: '@astrojs/vue', renderer: vueRenderer });
  container.addClientRenderer({
    name: '@astrojs/vue',
    entrypoint: '@astrojs/vue/client.js',
  });
  const request = new Request(new URL(path, site));
  const context = createContext({ request, defaultLocale: '' });
  return onRequest(context, () =>
    container.renderToResponse(page.default, {
      request,
      locals: context.locals,
      partial: false,
    })
  );
}

describe('Homepage CDN caching', () => {
  const event = {
    _id: 'upcoming-event',
    title: 'Fixture accessibility conference',
    type: 'conference',
    dateStart: '2099-01-10',
  } satisfies Event;

  it.each([
    { listing: 'populated', future: [event], expectedText: event.title },
    {
      listing: 'empty',
      future: [],
      expectedText: 'There are no upcoming events to display.',
    },
  ])(
    'opts $listing successful listings into shared caching without making the browser cache public',
    async ({ future, expectedText }) => {
      events.mockResolvedValue({ future, past: [] });

      const response = await renderPage();

      expect(response.status).toBe(200);
      expect(response.headers.get(netlifyCache)).toBe('public, s-maxage=60');
      expect(response.headers.get('Cache-Control')).toBe(browserCache);
      expect(await response.text()).toContain(expectedText);
    }
  );

  it.each([
    ['events', events],
    ['books', books],
  ] as const)(
    'renders an uncacheable 200 fallback when Sanity %s fail',
    async (_, read) => {
      read.mockRejectedValue(new Error('Sanity unavailable'));

      const response = await renderPage();

      expect(response.status).toBe(200);
      expect(response.headers.get(netlifyCache)).toBeNull();
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      expect(await response.text()).toContain(
        'Unable to load upcoming events.'
      );
    }
  );
});

describe('Past Events CDN caching', () => {
  const event = {
    _id: 'past-event',
    title: 'Fixture past accessibility conference',
    type: 'conference',
    dateStart: '2025-01-10',
  } satisfies Event;

  it.each([
    { path: '/past-events', past: [event], expectedText: event.title },
    {
      path: '/past-events/',
      past: [],
      expectedText: 'There are no past events to display.',
    },
  ])(
    'caches $path at the edge but keeps browser caching private',
    async ({ path, past, expectedText }) => {
      events.mockResolvedValue({ future: [], past });

      const response = await renderPage(path);

      expect(response.status).toBe(200);
      expect(response.headers.get(netlifyCache)).toBe('public, s-maxage=60');
      expect(response.headers.get('Cache-Control')).toBe(browserCache);
      expect(await response.text()).toContain(expectedText);
    }
  );

  it.each(Object.entries({ events, books }))(
    'does not cache the 200 fallback when the Sanity %s read fails',
    async (_, read) => {
      read.mockRejectedValue(new Error('Sanity unavailable'));

      const response = await renderPage('/past-events');

      expect(response.status).toBe(200);
      expect(response.headers.get(netlifyCache)).toBeNull();
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      expect(await response.text()).toContain('Unable to load past events.');
    }
  );
});

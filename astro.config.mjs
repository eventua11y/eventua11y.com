import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import netlify from '@astrojs/netlify';
import vue from '@astrojs/vue';
import sentry from '@sentry/astro';

// Load environment variables from .env files
// https://docs.astro.build/en/guides/environment-variables/#in-the-astro-config-file
const { SENTRY_AUTH_TOKEN } = loadEnv(process.env.NODE_ENV, process.cwd(), '');

// https://astro.build/config
export default defineConfig({
  site: 'https://eventua11y.com',
  adapter: netlify(),
  vite: {
    server: {
      strictPort: true,
    },
  },
  prefetch: {
    defaultStrategy: 'hover',
    prefetchAll: true,
  },
  integrations: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('wa-'),
        },
      },
      devtools: false,
    }),
    sentry({
      sourceMapsUploadOptions: {
        project: 'eventua11y',
        authToken: SENTRY_AUTH_TOKEN,
      },
    }),
  ],
});

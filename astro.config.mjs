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
  output: 'server',
  adapter: netlify(),
  integrations: [
    vue({
      template: {
        compilerOptions: { isCustomElement: (tag) => tag.startsWith('sl-') },
      },
      devtools: false,
    }),
    sentry({
      dsn: 'https://63a5e1fe7a29dc3df46923bd277aa87e@o4505086842437632.ingest.us.sentry.io/4508463077588992',
      sourceMapsUploadOptions: {
        project: 'eventua11y',
        authToken: SENTRY_AUTH_TOKEN,
      },
    }),
  ],
});

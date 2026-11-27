import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import vue from '@astrojs/vue';

const uploadSourceMaps = Boolean(
  process.env.POSTHOG_CLI_API_KEY && process.env.POSTHOG_CLI_PROJECT_ID
);

// https://astro.build/config
export default defineConfig({
  site: 'https://eventua11y.com',
  adapter: netlify(),
  server: {
    allowedHosts: ['.ts.net'],
  },
  vite: {
    server: {
      strictPort: true,
    },
    environments: {
      client: { build: { sourcemap: uploadSourceMaps ? 'hidden' : false } },
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
    {
      name: 'posthog-source-maps',
      hooks: {
        'astro:build:done': ({ dir }) => {
          if (!uploadSourceMaps) return;
          execFileSync(
            'npm',
            [
              'run',
              'posthog:sourcemaps',
              '--',
              '--directory',
              fileURLToPath(new URL('./_astro/', dir)),
            ],
            { stdio: 'inherit' }
          );
        },
      },
    },
  ],
});

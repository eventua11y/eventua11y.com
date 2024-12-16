import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import vue from '@astrojs/vue';

import sentry from '@sentry/astro';

// https://astro.build/config
export default defineConfig({
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
      sourceMapsUploadOptions: {
        project: 'eventua11y',
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
    }),
  ],
});

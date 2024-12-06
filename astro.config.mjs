import { defineConfig } from 'astro/config';
import sanity from '@sanity/astro';
import netlify from '@astrojs/netlify';
import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: netlify(),
  integrations: [
    sanity({
      projectId: process.env.SANITY_PROJECT,
      dataset: process.env.SANITY_DATASET,
      // Set useCdn to false if you're building statically.
      useCdn: process.env.SANITY_CDN,
    }),
    vue({
      template: {
        compilerOptions: { isCustomElement: (tag) => tag.startsWith('sl-') },
      },
      devtools: true,
    }),
  ],
});

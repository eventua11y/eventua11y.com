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
      projectId: '2g5zqxo3',
      dataset: 'test',
      // Set useCdn to false if you're building statically.
      useCdn: false,
    }),
    vue({
      template: {
        compilerOptions: { isCustomElement: (tag) => tag.startsWith('sl-') },
      },
      devtools: true,
    }),
  ],
});

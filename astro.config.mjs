import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import vue from '@astrojs/vue';

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
  ],
});

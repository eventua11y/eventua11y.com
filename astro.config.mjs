import sanity from "@sanity/astro";
import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify/functions";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: netlify(),
  integrations: [
    sanity({
      projectId: "2g5zqxo3",
      dataset: "test",
      // Set useCdn to false if you're building statically.
      useCdn: false,
    }),
  ],
});

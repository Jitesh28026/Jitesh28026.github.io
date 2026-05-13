// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://jitesh28026.github.io',
  // user-site repo: served from root, no `base` needed
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  devToolbar: {
    enabled: false,
  },
  // Hover-prefetch every internal link. By the time the user clicks,
  // the next page's HTML is already in the browser cache, so navigation
  // feels near-instant on case study clicks.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  integrations: [sitemap()],
});

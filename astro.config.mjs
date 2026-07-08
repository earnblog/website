import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/config.mjs';

export default defineConfig({
  site: SITE.url,
  integrations: [sitemap()],
});

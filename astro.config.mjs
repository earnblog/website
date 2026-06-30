import { defineConfig } from 'astro/config';
import { SITE } from './src/config.mjs';

export default defineConfig({
  site: SITE.url,
});

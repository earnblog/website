import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../config.mjs';

export async function GET(context) {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  posts.sort((a, b) => b.data.date - a.data.date);
  return rss({
    title: `${SITE.name} · ${SITE.nameEn}`,
    description: SITE.tagline,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description ?? '',
      link: `/posts/${post.slug}/`,
    })),
    customData: '<language>zh-CN</language>',
  });
}

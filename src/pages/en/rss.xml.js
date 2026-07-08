import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE, I18N } from '../../config.mjs';

export async function GET(context) {
  const posts = await getCollection('posts-en', ({ data }) => !data.draft);
  posts.sort((a, b) => b.data.date - a.data.date);
  return rss({
    title: `${SITE.nameEn} · ${SITE.name}`,
    description: I18N.en.tagline,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description ?? '',
      link: `/en/posts/${post.slug}/`,
    })),
    customData: '<language>en</language>',
  });
}

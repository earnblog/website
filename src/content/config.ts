import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    cover: z.string().optional(),      // 封面图路径,如 /covers/xxx.svg
    coverCaption: z.string().optional(),
    draft: z.boolean().default(false),
    category: z.enum(['liquidity', 'ai-compute', 'mechanics', 'cycles']).default('mechanics'),
    price: z.number().positive().optional(), // 单位美元;设了就是付费文章,前2段免费预览
    tier: z.number().int().min(1).max(3).optional(), // 会员最低档:1 读者(默认) / 2 研究 / 3 内圈

  }),
});

// 英文版文章,schema 与中文一致,目录 src/content/posts-en/
const postsEn = defineCollection({
  type: 'content',
  schema: posts.schema,
});

export const collections = { posts, 'posts-en': postsEn };

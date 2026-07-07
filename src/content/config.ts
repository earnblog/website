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
    price: z.number().positive().optional(), // 单位美元;设了就是付费文章,前2段免费预览

  }),
});

export const collections = { posts };

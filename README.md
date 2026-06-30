# 我的财经站(Astro + Cloudflare Pages)

一个静态博客,用来发布贝乐斯式财经/哲学文章。免费托管,GoDaddy 域名指过来即可。

## 本地预览/构建

```bash
npm install      # 第一次,装依赖
npm run dev      # 本地预览,打开 http://localhost:4321
npm run build    # 生成静态站到 dist/
```

## 改成你自己的(只改一个文件)

打开 `src/config.mjs`,改这几行:
- `name` 站名
- `tagline` 副标题
- `author` 你的笔名(**切勿用"贝乐斯"或近似名**)
- `url` 你的 GoDaddy 域名(如 `https://yourdomain.com`)

## 怎么发新文章

在 `src/content/posts/` 新建一个 `.md` 文件,顶部写:

```markdown
---
title: 标题(带!)
date: 2026-07-01
description: 一句话摘要(列表页和分享用)
cover: /covers/你的封面.svg      # 可选,封面图放 public/covers/
coverCaption: 题图说明              # 可选
---

正文段落……

> 金句用这种引用块

<figure class="bls-diagram">
  <img src="/diagrams/你的图.svg" alt="" />
  <figcaption>图说</figcaption>
</figure>

<p class="kicker">末句金句,居中加重</p>
```

- 封面图放 `public/covers/`,机制示意图放 `public/diagrams/`,用 `/covers/x.svg`、`/diagrams/x.svg` 引用。
- 想存草稿不发布:frontmatter 加 `draft: true`。
- 免责声明每篇自动加,不用手写。

> 提示:`/beilesi-writer` 这个 skill 出的稿,可直接转成这里的 `.md` 文件 + SVG 图。

## 部署到 Cloudflare Pages(免费)+ 连 GoDaddy 域名

1. 把这个文件夹推到 GitHub 一个仓库。
2. Cloudflare 控制台 → Workers & Pages → 新建 Pages → 连接该仓库。
   - 构建命令:`npm run build`
   - 输出目录:`dist`
   - 框架预设选 Astro(会自动填好)。
3. 部署成功后会给你一个 `xxx.pages.dev` 网址。
4. 在 Pages 项目 → Custom domains 添加你的 GoDaddy 域名。
5. 到 GoDaddy 域名 DNS 设置,按 Cloudflare 给的提示:
   - 要么把 Nameservers 改成 Cloudflare 的(推荐,最省心);
   - 要么加一条 CNAME 指向 `xxx.pages.dev`。
6. 等 DNS 生效(几分钟到几小时),HTTPS 证书 Cloudflare 自动签。

以后改文章:`git push`,Cloudflare 自动重新部署。

## 以后加付费墙

静态站起步,等流量起来再接,几种思路:
- **Stripe Payment Links / Buy Me a Coffee**:先做"打赏/赞助",零改造。
- **Memberful / Ghost(membership)**:做真正的会员墙、把部分文章设为会员可见。
- 迁移到 Ghost:内容是 Markdown,搬家成本低。

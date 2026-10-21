# Nextdo Website

Nextdo 产品官网，使用 Astro 静态页面 + Cloudflare Pages Functions。

- 产品官网：https://nextdo.157712.xyz
- 客户端下载：/download（https://nextdo.157712.xyz/download/）
- 在线网页版 / PWA：https://nextdo-app.157712.xyz（备用地址：https://nextdo-cew.pages.dev）
- 代码仓库：https://github.com/nextdo-app/nextdo

## 本地运行

```bash
npm install
npm run dev
npm run build
```

Astro 以目录形式生成静态路由；构建后应有 `dist/download/index.html`。页面可以使用 Astro 本地服务器预览，但 `/api/releases` 和 `/api/download` 是 Cloudflare Pages Functions，本地要测试这两条接口，需要运行 Pages 的本地运行时（例如安装 Wrangler 后构建并运行 `npx wrangler pages dev dist`）。

## Cloudflare Pages

- Git repository: `nextdo-app/website`
- Root directory: 留空
- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`
- Functions directory: 仓库根目录的 `functions/`，自动识别

静态文件通过 Pages 托管；`functions/api/releases.js` 会读取 Nextdo 官方 GitHub Releases（稳定版与测试版）；`functions/api/download.js` 会验证文件名及发布资产后流式转发下载。客户端不需要进入 GitHub 的发布页面，但下载源仍是 GitHub Releases。由于代理所有安装包流量，可能受 Cloudflare Functions、外部源服务速率及流量政策限制；请在正式部署后逐平台试下载。

## 版本策略

稳定版自动读取 GitHub API `/releases/latest`；测试版从最近发布记录选取具有桌面安装包的 prerelease。前端提供最近核对过的版本作为显示回退，真正的下载接口会再次核验对应文件是否存在。

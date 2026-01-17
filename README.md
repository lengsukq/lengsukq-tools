# lengsukq-tools - 在线工具集合

一个基于 Next.js 14 和 HeroUI 的在线工具集合，提供多种实用工具，为用户带来便捷的在线体验。

## 📋 项目介绍

这个项目汇集了多种实用在线工具，采用现代化的 UI 设计，支持响应式布局和暗色模式，在移动端和桌面端都能提供良好的用户体验。所有工具都经过精心设计，确保操作简单直观，功能强大实用。

## 🚀 主要功能

### 实用工具

- **域名查询**: 快速查询域名是否已被注册，并获取详细的 WHOIS 信息。支持单个查询和批量查询，可自定义域名生成规则
- **电费计算器**: 简单快速地进行电费计算
- **流量消耗器**: 通过下载各种资源来消耗流量，支持自定义下载链接和循环下载
- **JSON格式化**: 在线JSON格式化、压缩、语法验证工具
- **随机数生成器**: 生成整数、浮点数、字符串、布尔值和UUID等多种类型的随机数
- **图片压缩**: 支持PNG和JPG格式的图片压缩，可自定义压缩质量
- **工资计算器**: 计算月薪和年薪，支持五险一金和补贴计算
- **Crontab计算器**: 解析crontab表达式，计算下次执行时间，生成可读的时间描述
- **Markdown预览**: 在线Markdown编辑器和预览工具，支持实时预览和可收起的编辑器
- **HTML预览**: 在线HTML编辑器和预览工具，支持实时预览和代码分享
- **PDF水印去除**: 批量去除PDF文件右下角水印，支持多文件处理

## 🛠️ 技术栈

- [Next.js 14](https://nextjs.org/docs/getting-started) - React 框架
- [HeroUI v2](https://heroui.com/) - UI 组件库
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Tailwind Variants](https://tailwind-variants.org) - Tailwind CSS 的变体系统
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的类型超集
- [Framer Motion](https://www.framer.com/motion/) - 动画库
- [next-themes](https://github.com/pacocoursey/next-themes) - 主题切换

## 🔧 如何使用

### 环境变量配置

您可以通过设置环境变量来自定义网站名称。创建一个 `.env.local` 文件在项目根目录，并添加以下内容：

```bash
NEXT_PUBLIC_SITE_NAME=您的自定义网站名称
```

如果不设置此环境变量，网站将使用默认名称 "lengsukq的tools站"。

### 安装依赖

使用以下命令之一安装项目依赖：

```bash
# 使用 npm
npm install

# 使用 yarn
yarn install

# 使用 pnpm
pnpm install
```

### 运行开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

服务器启动后，访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
# 或
yarn build
# 或
pnpm build
```

### 启动生产服务器

```bash
npm run start
# 或
yarn start
# 或
pnpm start
```

### 代码质量检查

```bash
npm run lint
# 或
yarn lint
# 或
pnpm lint
```

## 📝 注意事项

- 如果使用 pnpm，需要在 .npmrc 文件中添加以下配置：
  ```
  public-hoist-pattern[]=*@heroui/*
  ```
- 项目使用 Next.js 14 的 App Router 架构
- 所有工具都支持移动端和桌面端
- 支持亮色/暗色主题切换

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目基于 [MIT 许可证](LICENSE)。

## 🔗 相关链接

- 项目地址: [https://github.com/lengsukq/lengsukq-tools](https://github.com/lengsukq/lengsukq-tools)

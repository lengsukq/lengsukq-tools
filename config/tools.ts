export interface Tool {
  title: string;
  description: string;
  href: string;
}

export const TOOLS: Tool[] = [
  {
    title: "域名查询",
    description: "快速查询域名是否已被注册，并获取详细的 WHOIS 信息",
    href: "/domain-checker",
  },
  {
    title: "电费计算器",
    description: "快速简单的进行电费计算",
    href: "/electricity-calculator",
  },
  {
    title: "流量消耗器",
    description: "通过下载各种资源来消耗流量，支持自定义下载链接和循环下载",
    href: "/traffic-consumer",
  },
  {
    title: "JSON格式化",
    description: "在线JSON格式化、压缩、语法验证工具",
    href: "/json-formatter",
  },
  {
    title: "随机数生成器",
    description: "生成整数、浮点数、字符串、布尔值和UUID等多种类型的随机数",
    href: "/random-number-generator",
  },
  {
    title: "图片压缩",
    description: "支持PNG和JPG格式的图片压缩，可自定义压缩质量",
    href: "/image-compressor",
  },
  {
    title: "工资计算器",
    description: "计算月薪和年薪，支持五险一金和补贴计算",
    href: "/salary-calculator",
  },
  {
    title: "动画展示",
    description: "展示一些 CSS 或 JS 动画效果",
    href: "/animation-showcase.html",
  },
  {
    title: "Crontab计算器",
    description: "解析crontab表达式，计算下次执行时间，生成可读的时间描述",
    href: "/crontab-calculator",
  },
  {
    title: "Markdown预览",
    description: "在线Markdown编辑器和预览工具，支持实时预览和可收起的编辑器",
    href: "/markdown-preview",
  },
  {
    title: "HTML预览",
    description: "在线HTML编辑器和预览工具，支持实时预览和代码分享",
    href: "/html-preview",
  },
  {
    title: "PDF水印去除",
    description: "批量去除PDF文件右下角水印，支持多文件处理",
    href: "/pdf-watermark-remover",
  },
];

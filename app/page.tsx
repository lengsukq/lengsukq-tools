import { title, subtitle } from "@/components/primitives";
import { ToolCard } from "@/components/tool-card";
// import { SearchIcon } from "@heroui/icons";

const tools = [
  {
    title: "域名查询",
    description: "快速查询域名是否已被注册，并获取详细的 WHOIS 信息",
    // icon: <SearchIcon className="w-6 h-6 text-primary" />,
    href: "/domain-checker",
  },
  {
    title: "电费计算器",
    description: "快速简单的进行电费计算",
    href: "/electricity-calculator",
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
    title: "动画展示", // 新增标题
    description: "展示一些 CSS 或 JS 动画效果", // 新增描述
    href: "/animation-showcase.html", // 新增链接，指向 HTML 文件
  },
];

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        <span className={title()}>在线&nbsp;</span>
        <span className={title({ color: "violet" })}>工具&nbsp;</span>
        <span className={title()}>导航</span>
        <div className={subtitle({ class: "mt-4" })}>
          为您提供实用的在线工具集合
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
    </section>
  );
}

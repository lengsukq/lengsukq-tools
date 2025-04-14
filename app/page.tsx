import { title, subtitle } from "@/components/primitives";
import { ToolCard } from "@/components/tool-card";
// import { SearchIcon } from "@heroui/icons";

const tools = [
  {
    title: "域名查询",
    description: "快速查询域名是否已被注册，并获取详细的 WHOIS 信息",
    // icon: <SearchIcon className="w-6 h-6 text-primary" />,
    href: "/domain-checker"
  },
  {
    title: "JSON格式化",
    description: "在线JSON格式化、压缩、语法验证工具",
    href: "/json-formatter"
  },
  {
    title: "UUID生成器",
    description: "生成随机的UUID (v4版本)，支持批量生成",
    href: "/uuid-generator"
  },
  {
    title: "图片压缩",
    description: "支持PNG和JPG格式的图片压缩，可自定义压缩质量",
    href: "/image-compressor"
  }
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

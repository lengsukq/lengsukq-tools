import { title, subtitle } from "@/components/primitives";
import { ToolCard } from "@/components/tool-card";
// import { SearchIcon } from "@heroui/icons";

const tools = [
  {
    title: "域名查询",
    description: "快速查询域名是否已被注册，并获取详细的 WHOIS 信息",
    // icon: <SearchIcon className="w-6 h-6 text-primary" />,
    href: "/domain-checker"
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

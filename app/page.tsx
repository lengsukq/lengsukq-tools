import { title, subtitle } from "@/components/primitives";
import { ToolCard } from "@/components/tool-card";
import { GAMES } from "@/config/games";
import { TOOLS } from "@/config/tools";

export default function Home() {
  return (
    <section className="flex flex-col items-center gap-12 py-12 md:py-16 px-4">
      <div className="inline-block max-w-2xl text-center">
        <h1 className="mb-4">
          <span className={title()}>在线&nbsp;</span>
          <span className={title({ color: "violet" })}>工具&nbsp;</span>
          <span className={title()}>导航</span>
        </h1>
        <p className={subtitle({ class: "mt-4 text-default-500" })}>
          为您提供实用的在线工具集合，提高工作效率
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 w-full max-w-7xl">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>

      <div className="w-full max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl" aria-hidden="true">
            🎮
          </span>
          <h2 className="text-2xl font-bold">小游戏专区</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {GAMES.map((game) => (
            <ToolCard {...game} key={game.href} />
          ))}
        </div>
      </div>
    </section>
  );
}

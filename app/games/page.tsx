import { title, subtitle } from "@/components/primitives";
import { ToolCard } from "@/components/tool-card";

const games = [
  {
    title: "贪食蛇",
    description: "经典的贪食蛇游戏，使用方向键控制蛇的移动，吃到食物让蛇变长",
    href: "/games/snake",
  },
  {
    title: "俄罗斯方块",
    description: "经典的俄罗斯方块游戏，旋转和移动方块，消除完整的行",
    href: "/games/tetris",
  },
  {
    title: "2048",
    description: "数字益智游戏，通过滑动合并相同数字，达到2048获得胜利",
    href: "/games/2048",
  },
];

export default function GamesPage() {
  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        <span className={title()}>小&nbsp;</span>
        <span className={title({ color: "violet" })}>游戏&nbsp;</span>
        <span className={title()}>集合</span>
        <div className={subtitle({ class: "mt-4" })}>经典游戏，休闲娱乐</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
        {games.map((game) => (
          <ToolCard key={game.href} {...game} />
        ))}
      </div>
    </section>
  );
}

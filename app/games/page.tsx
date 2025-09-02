import { title, subtitle } from "@/components/primitives";
import { ToolCard } from "@/components/tool-card";

const games = [
  {
    title: "贪食蛇",
    description: "经典的贪食蛇游戏，使用方向键控制蛇的移动，吃到食物让蛇变长",
    href: "/games/snake",
    icon: (
      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    ),
  },
  {
    title: "俄罗斯方块",
    description: "经典的俄罗斯方块游戏，旋转和移动方块，消除完整的行",
    href: "/games/tetris",
    icon: (
      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
        </svg>
      </div>
    ),
  },
  {
    title: "2048",
    description: "数字益智游戏，通过滑动合并相同数字，达到2048获得胜利",
    href: "/games/2048",
    icon: (
      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M12 8v8m-4-4h8"/>
        </svg>
      </div>
    ),
  },
];

export default function GamesPage() {
  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="inline-block max-w-xl text-center justify-center mb-8">
        <span className={title()}>小&nbsp;</span>
        <span className={title({ color: "violet" })}>游戏&nbsp;</span>
        <span className={title()}>集合</span>
        <div className={subtitle({ class: "mt-4" })}>经典游戏，休闲娱乐</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl px-4">
        {games.map((game) => (
          <div key={game.href} className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden h-full flex flex-col">
              <div className="p-6 flex items-center space-x-4">
                {game.icon}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{game.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">{game.description}</p>
                </div>
              </div>
              <div className="mt-auto p-6 pt-0">
                <a 
                  href={game.href}
                  className="block w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium rounded-lg text-center transition-all duration-300"
                >
                  开始游戏
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-12 text-center max-w-2xl px-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">游戏说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">贪食蛇</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">使用方向键控制蛇的移动，吃到食物让蛇变长，避免撞到墙壁或自己的身体。</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">俄罗斯方块</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">旋转和移动方块，消除完整的行，尽可能获得高分。</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">2048</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">通过滑动合并相同数字，达到2048获得胜利，挑战更高分数。</p>
          </div>
        </div>
      </div>
    </section>
  );
}

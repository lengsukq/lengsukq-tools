import { title, subtitle } from "@/components/primitives";
import { Card, CardBody } from "@heroui/card";
import Link from "next/link";

const games = [
  {
    title: "2048",
    description: "数字益智游戏，通过滑动合并相同数字，达到2048获得胜利",
    href: "/games/2048",
    color: "from-yellow-400 to-yellow-600",
    icon: "🎯",
    features: ["触摸滑动控制", "流畅动画效果", "分数记录", "移动端优化"]
  },
  {
    title: "贪食蛇",
    description: "经典贪食蛇游戏，控制蛇移动吃食物，让蛇变长",
    href: "/games/snake",
    color: "from-green-400 to-green-600",
    icon: "🐍",
    features: ["触摸滑动控制", "暂停功能", "分数系统", "移动端优化"]
  },
  {
    title: "俄罗斯方块",
    description: "经典俄罗斯方块，旋转和移动方块，消除完整的行",
    href: "/games/tetris",
    color: "from-blue-400 to-blue-600",
    icon: "🧩",
    features: ["触摸滑动控制", "等级系统", "连击奖励", "移动端优化"]
  }
];

export default function GamesPage() {
  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="text-center mb-8">
        <h1 className={title({ size: "lg", fullWidth: true, color: "violet" })}>小游戏集合</h1>
        <div className={subtitle({ class: "mt-4 text-gray-300" })}>
          经典游戏重新设计，专为移动端优化，带来流畅的游戏体验
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {games.map((game) => (
          <Link key={game.href} href={game.href} className="group">
            <Card className="w-full bg-gray-800/50 border-gray-700/50 shadow-2xl backdrop-blur-sm transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-3xl hover:border-gray-600/50">
              <CardBody className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${game.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg`}>
                    {game.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-gray-200 transition-colors">
                      {game.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {game.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {game.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm text-gray-400">点击开始游戏</span>
                  <div className="w-6 h-6 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-xs group-hover:from-blue-400 group-hover:to-blue-600 transition-all duration-300">
                    →
                  </div>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="text-center mt-8">
        <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-700/30 max-w-2xl">
          <h3 className="text-lg font-semibold text-white mb-3">🎮 游戏特色</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                移动端触摸优化
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                流畅动画效果
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                响应式设计
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                键盘控制支持
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                分数记录系统
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                现代化UI设计
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

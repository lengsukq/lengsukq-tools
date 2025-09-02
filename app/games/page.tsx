import { title, subtitle } from "@/components/primitives";
import { Card, CardBody } from "@heroui/card";
import Link from "next/link";

const games = [
  {
    title: "2048",
    description: "数字益智游戏，通过滑动合并相同数字，达到2048获得胜利",
    href: "/games/2048",
    color: "from-yellow-400 to-orange-500",
    icon: "🎯",
    features: ["触摸滑动控制", "流畅动画效果", "分数记录", "移动端优化"]
  },
  {
    title: "贪食蛇",
    description: "经典贪食蛇游戏，控制蛇移动吃食物，让蛇变长",
    href: "/games/snake",
    color: "from-emerald-400 to-green-600",
    icon: "🐍",
    features: ["触摸滑动控制", "暂停功能", "分数系统", "移动端优化"]
  },
  {
    title: "俄罗斯方块",
    description: "经典俄罗斯方块，旋转和移动方块，消除完整的行",
    href: "/games/tetris",
    color: "from-blue-400 to-indigo-600",
    icon: "🧩",
    features: ["触摸滑动控制", "等级系统", "连击奖励", "移动端优化"]
  },
  {
    title: "扫雷",
    description: "经典扫雷游戏，找出所有地雷位置，标记或避开它们",
    href: "/games/minesweeper",
    color: "from-rose-500 to-red-600",
    icon: "💣",
    features: ["触摸控制", "难度选择", "计时系统", "移动端优化"]
  }
];

export default function GamesPage() {
  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10 min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 px-4 relative overflow-hidden">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      
      <div className="text-center mb-8 z-10">
        <h1 className={title({ size: "lg", fullWidth: true, color: "violet" })}>小游戏集合</h1>
        <div className={subtitle({ class: "mt-4 text-gray-300 max-w-2xl mx-auto" })}>
          经典游戏重新设计，专为移动端优化，带来流畅的游戏体验
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl z-10">
        {games.map((game) => (
          <Link key={game.href} href={game.href} className="group">
            <Card className="w-full h-full bg-slate-800/40 backdrop-blur-lg border-slate-700/50 shadow-xl transition-all duration-300 transform group-hover:-translate-y-2 group-hover:shadow-2xl hover:border-slate-600/50 overflow-hidden relative">
              {/* 卡片顶部装饰 */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${game.color}`}></div>
              
              <CardBody className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${game.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-colors duration-300"></div>
                    <span className="relative z-10">{game.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-gray-200 transition-colors">
                      {game.title}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {game.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mt-2 mb-4 flex-grow">
                  {game.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                      <div className={`w-2 h-2 bg-gradient-to-r ${game.color} rounded-full`}></div>
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-700/50">
                  <span className="text-sm text-gray-400">点击开始游戏</span>
                  <div className={`w-8 h-8 bg-gradient-to-r ${game.color} rounded-full flex items-center justify-center text-white text-sm transition-all duration-300 group-hover:scale-110`}>
                    →
                  </div>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="text-center mt-8 z-10 w-full max-w-4xl">
        <div className="bg-slate-800/30 backdrop-blur-lg p-8 rounded-2xl border border-slate-700/30 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center justify-center gap-2">
            <span className="text-2xl">🎮</span>
            <span>游戏特色</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/30">
              <div className="text-lg font-semibold text-emerald-400 mb-3">用户体验</div>
              <div className="space-y-2 text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  移动端触摸优化
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  流畅动画效果
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  响应式设计
                </div>
              </div>
            </div>
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/30">
              <div className="text-lg font-semibold text-blue-400 mb-3">游戏功能</div>
              <div className="space-y-2 text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span>
                  键盘控制支持
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span>
                  分数记录系统
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">✓</span>
                  多难度级别
                </div>
              </div>
            </div>
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/30">
              <div className="text-lg font-semibold text-violet-400 mb-3">技术特性</div>
              <div className="space-y-2 text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-violet-400">✓</span>
                  现代化UI设计
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-violet-400">✓</span>
                  高性能渲染
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-violet-400">✓</span>
                  离线游戏支持
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

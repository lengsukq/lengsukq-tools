export interface Game {
  title: string;
  description: string;
  href: string;
}

export const GAMES: Game[] = [
  {
    title: "一掷千金",
    description: "选定幸运箱，逐轮揭晓奖金，接受银行报价或继续冲击百万大奖",
    href: "/games/deal-or-no-deal",
  },
  {
    title: "霓虹幸存者：深空裂变",
    description:
      "霓虹太空割草幸存者，升级强力武器与模块，撑过狂暴潮水，击败终极机械领主",
    href: "/Game/neon_survivor.html",
  },
];

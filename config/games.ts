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
  {
    title: "雷霆战机：银河突围",
    description:
      "深空战机弹幕挑战：三款全新绘制的战机、分层旗舰 Boss、预警弹幕与弱点机制；擦弹超载、战术芯片构筑，支持键鼠、触屏和手柄",
    href: "/Game/thunder_assault.html",
  },
  {
    title: "棱镜花园：光之谜",
    description:
      "梦幻温室折射解谜：旋转镜片引导光束唤醒花朵，四座花园循序解锁，支持触屏、鼠标与键盘",
    href: "/Game/prism_garden.html",
  },
  {
    title: "深海拾光：微光远航",
    description:
      "驾驶手绘潜艇穿梭荧光海底，收集珍珠与氧气泡、躲开水母，体验潮汐浮力与渐进挑战",
    href: "/Game/abyss_glimmer.html",
  },
  {
    title: "云端邮局：星空来信",
    description:
      "温暖复古的邮票分拣小游戏，75 秒投递 18 封来信，支持点击、拖放和数字键操作，连续投递可得额外分数",
    href: "/Game/cloud_postoffice.html",
  },
];

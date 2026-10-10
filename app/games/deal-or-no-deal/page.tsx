import type { Metadata } from "next";

import { DealOrNoDealGame } from "./game-board";

export const metadata: Metadata = {
  title: "一掷千金",
  description: "选定幸运箱，逐轮揭晓虚拟奖金，接受银行报价或继续冲击百万大奖。",
};

export default function DealOrNoDealPage() {
  return <DealOrNoDealGame />;
}

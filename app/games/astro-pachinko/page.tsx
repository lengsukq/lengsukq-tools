import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "星穹弹珠：符文工坊",
  description:
    "弹珠碰撞肉鸽构筑：操控星穹发射器，引燃爆裂钉、雷霆连锁与双生分形，构筑专属符文弹珠与远古神器，冲击 8x 黄金大奖！",
};

export default function AstroPachinkoPage() {
  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#080c1d] overflow-hidden">
      <iframe
        src="/Game/astro_pachinko.html"
        title="星穹弹珠：符文工坊"
        className="w-full h-full border-0"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}

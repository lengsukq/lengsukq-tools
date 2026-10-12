import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "棱镜奇旅：光之交响",
  description:
    "空灵优雅的光学物理益智游戏：操控反射镜、分光三棱镜与时空星门，折射与融合七色光束唤醒共鸣水晶，内含24个精心关卡与自由沙盒。",
};

export default function ChromaPrismPage() {
  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#060914] overflow-hidden">
      <iframe
        src="/Game/chroma_prism.html"
        title="棱镜奇旅：光之交响"
        className="w-full h-full border-0"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}

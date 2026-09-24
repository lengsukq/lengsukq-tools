import type { Metadata } from "next";

import { LocalVideoWall } from "@/components/local-video-wall";

export const metadata: Metadata = {
  title: "本地视频墙",
  description:
    "在浏览器中选择硬盘上的视频，创建可拖拽排布的多屏本地播放墙。文件只在本机读取。",
};

export default function VideoWallPage() {
  return <LocalVideoWall />;
}

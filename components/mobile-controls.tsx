"use client";

import { Button } from "@heroui/button";

interface MobileControlsProps {
  onDirection: (direction: "up" | "down" | "left" | "right") => void;
  className?: string;
  cellSize?: number;
}

export function MobileControls({
  onDirection,
  className = "",
  cellSize = 48, // 默认大小
}: MobileControlsProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="text-sm text-gray-300 mb-2">移动端控制</div>
      <div className="grid grid-cols-3 gap-2">
        {/* 上 */}
        <div />
        <Button
          className="rounded-full bg-blue-600 text-white hover:bg-blue-700"
          style={{
            width: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
            height: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
          }}
          variant="flat"
          onPress={() => onDirection("up")}
        >
          ↑
        </Button>
        <div />

        {/* 左、下、右 */}
        <Button
          className="rounded-full bg-blue-600 text-white hover:bg-blue-700"
          style={{
            width: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
            height: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
          }}
          variant="flat"
          onPress={() => onDirection("left")}
        >
          ←
        </Button>
        <Button
          className="rounded-full bg-blue-600 text-white hover:bg-blue-700"
          style={{
            width: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
            height: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
          }}
          variant="flat"
          onPress={() => onDirection("down")}
        >
          ↓
        </Button>
        <Button
          className="rounded-full bg-blue-600 text-white hover:bg-blue-700"
          style={{
            width: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
            height: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
          }}
          variant="flat"
          onPress={() => onDirection("right")}
        >
          →
        </Button>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@heroui/button";

interface MobileControlsProps {
  onDirection: (direction: "up" | "down" | "left" | "right") => void;
  className?: string;
}

export function MobileControls({
  onDirection,
  className = "",
}: MobileControlsProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="text-sm text-gray-300 mb-2">移动端控制</div>
      <div className="grid grid-cols-3 gap-2">
        {/* 上 */}
        <div />
        <Button
          className="w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700"
          size="lg"
          variant="flat"
          onPress={() => onDirection("up")}
        >
          ↑
        </Button>
        <div />

        {/* 左、下、右 */}
        <Button
          className="w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700"
          size="lg"
          variant="flat"
          onPress={() => onDirection("left")}
        >
          ←
        </Button>
        <Button
          className="w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700"
          size="lg"
          variant="flat"
          onPress={() => onDirection("down")}
        >
          ↓
        </Button>
        <Button
          className="w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700"
          size="lg"
          variant="flat"
          onPress={() => onDirection("right")}
        >
          →
        </Button>
      </div>
    </div>
  );
}

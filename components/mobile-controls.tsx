"use client";

import { Button } from "@heroui/button";

interface MobileControlsProps {
  onDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  className?: string;
}

export function MobileControls({ onDirection, className = "" }: MobileControlsProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="text-sm text-gray-300 mb-2">移动端控制</div>
      <div className="grid grid-cols-3 gap-2">
        {/* 上 */}
        <div></div>
        <Button
          size="lg"
          variant="flat"
          className="w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700"
          onPress={() => onDirection('up')}
        >
          ↑
        </Button>
        <div></div>
        
        {/* 左、下、右 */}
        <Button
          size="lg"
          variant="flat"
          className="w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700"
          onPress={() => onDirection('left')}
        >
          ←
        </Button>
        <Button
          size="lg"
          variant="flat"
          className="w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700"
          onPress={() => onDirection('down')}
        >
          ↓
        </Button>
        <Button
          size="lg"
          variant="flat"
          className="w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700"
          onPress={() => onDirection('right')}
        >
          →
        </Button>
      </div>
    </div>
  );
}

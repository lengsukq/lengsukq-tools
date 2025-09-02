"use client";

import { Button } from "@heroui/button";
import { useState } from "react";

interface MobileControlsProps {
  onDirection: (direction: "up" | "down" | "left" | "right") => void;
  className?: string;
  cellSize?: number;
  variant?: "game" | "default";
}

export function MobileControls({
  onDirection,
  className = "",
  cellSize = 48,
  variant = "default"
}: MobileControlsProps) {
  const [activeButton, setActiveButton] = useState<string | null>(null);

  const handlePress = (direction: "up" | "down" | "left" | "right") => {
    setActiveButton(direction);
    onDirection(direction);
    
    // 添加触觉反馈（如果支持）
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // 清除活跃状态
    setTimeout(() => setActiveButton(null), 150);
  };

  if (variant === "game") {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <div className="text-sm text-gray-400 mb-2">🎮 触摸控制</div>
        
        {/* 游戏风格控制 */}
        <div className="relative">
          {/* 上 */}
          <div className="flex justify-center mb-2">
            <Button
              className={`rounded-full transition-all duration-200 transform ${
                activeButton === "up" 
                  ? "scale-110 bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg" 
                  : "bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700"
              } text-white font-bold shadow-md`}
              style={{
                width: `${Math.max(48, Math.min(cellSize * 1.2, 72))}px`,
                height: `${Math.max(48, Math.min(cellSize * 1.2, 72))}px`,
              }}
              variant="flat"
              onPress={() => handlePress("up")}
            >
              ↑
            </Button>
          </div>

          {/* 左、下、右 */}
          <div className="flex items-center justify-center gap-2">
            <Button
              className={`rounded-full transition-all duration-200 transform ${
                activeButton === "left" 
                  ? "scale-110 bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg" 
                  : "bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700"
              } text-white font-bold shadow-md`}
              style={{
                width: `${Math.max(48, Math.min(cellSize * 1.2, 72))}px`,
                height: `${Math.max(48, Math.min(cellSize * 1.2, 72))}px`,
              }}
              variant="flat"
              onPress={() => handlePress("left")}
            >
              ←
            </Button>
            
            <Button
              className={`rounded-full transition-all duration-200 transform ${
                activeButton === "down" 
                  ? "scale-110 bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg" 
                  : "bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700"
              } text-white font-bold shadow-md`}
              style={{
                width: `${Math.max(48, Math.min(cellSize * 1.2, 72))}px`,
                height: `${Math.max(48, Math.min(cellSize * 1.2, 72))}px`,
              }}
              variant="flat"
              onPress={() => handlePress("down")}
            >
              ↓
            </Button>
            
            <Button
              className={`rounded-full transition-all duration-200 transform ${
                activeButton === "right" 
                  ? "scale-110 bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg" 
                  : "bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700"
              } text-white font-bold shadow-md`}
              style={{
                width: `${Math.max(48, Math.min(cellSize * 1.2, 72))}px`,
                height: `${Math.max(48, Math.min(cellSize * 1.2, 72))}px`,
              }}
              variant="flat"
              onPress={() => handlePress("right")}
            >
              →
            </Button>
          </div>
        </div>

        {/* 触摸提示 */}
        <div className="text-xs text-gray-500 text-center mt-2">
          触摸按钮或滑动屏幕控制
        </div>
      </div>
    );
  }

  // 默认样式
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="text-sm text-gray-300 mb-2">移动端控制</div>
      <div className="grid grid-cols-3 gap-2">
        {/* 上 */}
        <div />
        <Button
          className={`rounded-full transition-all duration-200 transform ${
            activeButton === "up" 
              ? "scale-110 bg-blue-600 shadow-lg" 
              : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
          style={{
            width: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
            height: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
          }}
          variant="flat"
          onPress={() => handlePress("up")}
        >
          ↑
        </Button>
        <div />

        {/* 左、下、右 */}
        <Button
          className={`rounded-full transition-all duration-200 transform ${
            activeButton === "left" 
              ? "scale-110 bg-blue-600 shadow-lg" 
              : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
          style={{
            width: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
            height: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
          }}
          variant="flat"
          onPress={() => handlePress("left")}
        >
          ←
        </Button>
        <Button
          className={`rounded-full transition-all duration-200 transform ${
            activeButton === "down" 
              ? "scale-110 bg-blue-600 shadow-lg" 
              : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
          style={{
            width: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
            height: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
          }}
          variant="flat"
          onPress={() => handlePress("down")}
        >
          ↓
        </Button>
        <Button
          className={`rounded-full transition-all duration-200 transform ${
            activeButton === "right" 
              ? "scale-110 bg-blue-600 shadow-lg" 
              : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
          style={{
            width: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
            height: `${Math.max(36, Math.min(cellSize * 1.5, 60))}px`,
          }}
          variant="flat"
          onPress={() => handlePress("right")}
        >
          →
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";

import { MobileControls } from "@/components/mobile-controls";
import { useMobile } from "@/hooks/use-mobile";
import { title, subtitle } from "@/components/primitives";

interface Position {
  x: number;
  y: number;
}

export default function SnakeGame() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<string>("RIGHT");
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [CELL_SIZE, setCELL_SIZE] = useState<number>(20);
  const isMobile = useMobile();
  
  const GRID_SIZE = 20;
  
  // 根据屏幕宽度动态调整单元格大小
  useEffect(() => {
    const updateCellSize = () => {
      if (isMobile) {
        // 在移动端，根据屏幕宽度计算合适的单元格大小
        const screenWidth = window.innerWidth;
        const maxGameWidth = screenWidth - 64; // 减去边距
        const newSize = Math.min(20, Math.floor(maxGameWidth / GRID_SIZE));
        setCELL_SIZE(newSize);
      } else {
        setCELL_SIZE(20);
      }
    };
    
    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    
    return () => window.removeEventListener('resize', updateCellSize);
  }, [isMobile]);

  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };

    setFood(newFood);
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection("RIGHT");
    setGameOver(false);
    setScore(0);
    setGameStarted(false);
    generateFood();
  };

  const handleDirectionChange = (newDirection: string) => {
    if (!gameStarted) {
      setGameStarted(true);
    }

    switch (newDirection) {
      case "UP":
        if (direction !== "DOWN") setDirection("UP");
        break;
      case "DOWN":
        if (direction !== "UP") setDirection("DOWN");
        break;
      case "LEFT":
        if (direction !== "RIGHT") setDirection("LEFT");
        break;
      case "RIGHT":
        if (direction !== "LEFT") setDirection("RIGHT");
        break;
    }
  };

  const moveSnake = useCallback(() => {
    if (gameOver || !gameStarted) return;

    setSnake((prevSnake) => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      switch (direction) {
        case "UP":
          head.y = (head.y - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case "DOWN":
          head.y = (head.y + 1) % GRID_SIZE;
          break;
        case "LEFT":
          head.x = (head.x - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case "RIGHT":
          head.x = (head.x + 1) % GRID_SIZE;
          break;
      }

      // 检查是否撞到自己
      if (
        newSnake.some((segment) => segment.x === head.x && segment.y === head.y)
      ) {
        setGameOver(true);

        return prevSnake;
      }

      newSnake.unshift(head);

      // 检查是否吃到食物
      if (head.x === food.x && head.y === food.y) {
        setScore((prev) => prev + 10);
        generateFood();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, gameOver, gameStarted, generateFood]);

  useEffect(() => {
    const interval = setInterval(moveSnake, 150);

    return () => clearInterval(interval);
  }, [moveSnake]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted) {
        setGameStarted(true);

        return;
      }

      switch (e.key) {
        case "ArrowUp":
          if (direction !== "DOWN") setDirection("UP");
          break;
        case "ArrowDown":
          if (direction !== "UP") setDirection("DOWN");
          break;
        case "ArrowLeft":
          if (direction !== "RIGHT") setDirection("LEFT");
          break;
        case "ArrowRight":
          if (direction !== "LEFT") setDirection("RIGHT");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [direction, gameStarted]);

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
        
        @keyframes scoreUpdate {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .food-pulse {
          animation: pulse 1.5s infinite;
        }
        
        .score-update {
          animation: scoreUpdate 0.3s ease-out;
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        
        .slide-in {
          animation: slideIn 0.3s ease-out;
        }
        
        .snake-segment {
          transition: all 0.15s ease-out;
        }
      `}</style>
      <div className="w-full max-w-md">
        <div className="text-center mb-6 fade-in">
          <h1 className={title({ size: "lg", fullWidth: true })}>贪食蛇</h1>
          <div className={subtitle({ class: "mt-2" })}>
            使用方向键控制蛇的移动，吃到食物让蛇变长
          </div>
        </div>

        <Card className="w-full bg-white dark:bg-gray-800 shadow-xl border-0 slide-in">
          <CardBody className="flex flex-col items-center gap-6 p-6">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
                <span className={`text-xl font-bold text-gray-900 dark:text-white ${score > 0 ? 'score-update' : ''}`}>得分: {score}</span>
              </div>
              <Button
                color="primary"
                size="sm"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium transition-all duration-300 transform hover:scale-105"
                onPress={resetGame}
              >
                重新开始
              </Button>
            </div>

            <div className="relative w-full max-w-sm mx-auto">
              <div
                className="border-4 border-gray-800 dark:border-gray-600 bg-gray-900 rounded-lg overflow-hidden shadow-lg"
                style={{
                  width: GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * Math.max(1, Math.floor(CELL_SIZE * 0.05)),
                  height: GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * Math.max(1, Math.floor(CELL_SIZE * 0.05)),
                  position: "relative",
                  maxWidth: '100%',
                  margin: '0 auto',
                }}
              >
                {/* 网格背景 */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 opacity-30"></div>
                
                {/* 蛇身 */}
                {snake.map((segment, index) => (
                  <div
                    key={index}
                    className={`absolute rounded-sm snake-segment ${index === 0 ? 'bg-gradient-to-br from-green-400 to-green-600 z-10' : 'bg-gradient-to-br from-green-500 to-green-700'}`}
                    style={{
                      width: CELL_SIZE - 2,
                      height: CELL_SIZE - 2,
                      left: segment.x * CELL_SIZE + 1,
                      top: segment.y * CELL_SIZE + 1,
                      boxShadow: index === 0 ? '0 0 8px rgba(72, 187, 120, 0.7)' : 'none',
                      zIndex: snake.length - index,
                    }}
                  />
                ))}

                {/* 食物 */}
                <div
                  className="absolute bg-gradient-to-br from-red-500 to-red-600 rounded-full food-pulse"
                  style={{
                    width: CELL_SIZE - 2,
                    height: CELL_SIZE - 2,
                    left: food.x * CELL_SIZE + 1,
                    top: food.y * CELL_SIZE + 1,
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.7)',
                  }}
                />
              </div>
            </div>

            {!gameStarted && (
              <div className="text-center bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg w-full fade-in">
                <p className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">准备开始</p>
                <p className="text-blue-600 dark:text-blue-400">按任意方向键开始游戏</p>
              </div>
            )}

            {gameOver && (
              <div className="text-center bg-red-50 dark:bg-red-900/30 p-4 rounded-lg w-full animate-pulse fade-in">
                <p className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">游戏结束!</p>
                <p className="text-lg text-red-600 dark:text-red-400">最终得分: {score}</p>
              </div>
            )}

            <div className="text-sm text-gray-600 dark:text-gray-400 text-center bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg w-full fade-in">
              <p className="font-medium mb-1">游戏说明</p>
              <p>使用方向键控制蛇的移动</p>
              <p>吃到红色食物可以增加分数</p>
            </div>

            {isMobile && (
              <div className="w-full mt-4 fade-in">
                <MobileControls
                  className="w-full"
                  onDirection={(direction) =>
                    handleDirectionChange(direction.toUpperCase())
                  }
                  cellSize={CELL_SIZE}
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

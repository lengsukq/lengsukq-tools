"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import Link from "next/link";

// 游戏常量
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const MOBILE_CELL_SIZE = 15;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 5;

// 方向枚举
enum Direction {
  UP = "UP",
  DOWN = "DOWN",
  LEFT = "LEFT",
  RIGHT = "RIGHT"
}

// 游戏状态
enum GameState {
  READY = "ready",
  PLAYING = "playing",
  PAUSED = "paused",
  GAME_OVER = "game_over"
}

// 坐标接口
interface Position {
  x: number;
  y: number;
}

export default function SnakeGame() {
  // 游戏状态
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>(Direction.RIGHT);
  const [nextDirection, setNextDirection] = useState<Direction>(Direction.RIGHT);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>(GameState.READY);
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED);
  const [cellSize, setCellSize] = useState<number>(CELL_SIZE);
  
  // 布局相关
  const isMobile = useMobile();
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  
  // 动态调整单元格大小
  useEffect(() => {
    setCellSize(isMobile ? MOBILE_CELL_SIZE : CELL_SIZE);
  }, [isMobile]);
  
  // 生成食物
  const generateFood = useCallback((): Position => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    
    // 确保食物不会生成在蛇身上
    const isOnSnake = snake.some(segment => 
      segment.x === newFood.x && segment.y === newFood.y
    );
    
    if (isOnSnake) {
      return generateFood();
    }
    
    return newFood;
  }, [snake]);
  
  // 初始化游戏
  const initializeGame = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood());
    setDirection(Direction.RIGHT);
    setNextDirection(Direction.RIGHT);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setGameState(GameState.READY);
  }, [generateFood]);
  
  // 开始游戏
  const startGame = useCallback(() => {
    if (gameState === GameState.READY || gameState === GameState.GAME_OVER) {
      initializeGame();
      setTimeout(() => {
        setGameState(GameState.PLAYING);
      }, 100);
    } else if (gameState === GameState.PAUSED) {
      setGameState(GameState.PLAYING);
    }
  }, [gameState, initializeGame]);
  
  // 暂停游戏
  const pauseGame = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      setGameState(GameState.PAUSED);
    }
  }, [gameState]);
  
  // 移动蛇
  const moveSnake = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    
    // 更新方向
    setDirection(nextDirection);
    
    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };
      
      // 根据方向移动头部
      switch (nextDirection) {
        case Direction.UP:
          head.y -= 1;
          break;
        case Direction.DOWN:
          head.y += 1;
          break;
        case Direction.LEFT:
          head.x -= 1;
          break;
        case Direction.RIGHT:
          head.x += 1;
          break;
      }
      
      // 检查是否撞墙
      if (
        head.x < 0 || 
        head.x >= GRID_SIZE || 
        head.y < 0 || 
        head.y >= GRID_SIZE
      ) {
        setGameState(GameState.GAME_OVER);
        return prevSnake;
      }
      
      // 检查是否撞到自己
      if (prevSnake.some((segment, index) => index > 0 && segment.x === head.x && segment.y === head.y)) {
        setGameState(GameState.GAME_OVER);
        return prevSnake;
      }
      
      const newSnake = [head, ...prevSnake];
      
      // 检查是否吃到食物
      if (head.x === food.x && head.y === food.y) {
        // 增加分数
        const newScore = score + 10;
        setScore(newScore);
        
        // 更新最高分
        if (newScore > bestScore) {
          setBestScore(newScore);
        }
        
        // 增加速度
        setSpeed(prev => Math.max(prev - SPEED_INCREMENT, 50));
        
        // 生成新食物
        setFood(generateFood());
      } else {
        // 如果没有吃到食物，移除尾部
        newSnake.pop();
      }
      
      return newSnake;
    });
  }, [gameState, nextDirection, food, score, bestScore, generateFood]);
  
  // 游戏循环
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      gameLoopRef.current = setTimeout(moveSnake, speed);
    }
    
    return () => {
      if (gameLoopRef.current) {
        clearTimeout(gameLoopRef.current);
      }
    };
  }, [gameState, moveSnake, speed]);
  
  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 防止方向键滚动页面
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      
      switch (e.key) {
        case "ArrowUp":
          if (direction !== Direction.DOWN) {
            setNextDirection(Direction.UP);
          }
          break;
        case "ArrowDown":
          if (direction !== Direction.UP) {
            setNextDirection(Direction.DOWN);
          }
          break;
        case "ArrowLeft":
          if (direction !== Direction.RIGHT) {
            setNextDirection(Direction.LEFT);
          }
          break;
        case "ArrowRight":
          if (direction !== Direction.LEFT) {
            setNextDirection(Direction.RIGHT);
          }
          break;
        case " ":
          if (gameState === GameState.READY || gameState === GameState.GAME_OVER) {
            startGame();
          } else if (gameState === GameState.PLAYING) {
            pauseGame();
          } else if (gameState === GameState.PAUSED) {
            startGame();
          }
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [direction, gameState, startGame, pauseGame]);
  
  // 处理触摸事件
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      const touch = moveEvent.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      
      // 确定滑动方向
      if (Math.abs(deltaX) > 30 || Math.abs(deltaY) > 30) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // 水平滑动
          if (deltaX > 0 && direction !== Direction.LEFT) {
            setNextDirection(Direction.RIGHT);
          } else if (deltaX < 0 && direction !== Direction.RIGHT) {
            setNextDirection(Direction.LEFT);
          }
        } else {
          // 垂直滑动
          if (deltaY > 0 && direction !== Direction.UP) {
            setNextDirection(Direction.DOWN);
          } else if (deltaY < 0 && direction !== Direction.DOWN) {
            setNextDirection(Direction.UP);
          }
        }
        
        // 移除事件监听器
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      }
    };
    
    const handleTouchEnd = () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
    
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
  };
  
  // 初始化游戏
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);
  
  // 渲染游戏网格
  const renderGrid = () => {
    return (
      <div 
        className="relative bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700"
        style={{
          width: `${GRID_SIZE * cellSize}px`,
          height: `${GRID_SIZE * cellSize}px`,
        }}
        onTouchStart={handleTouchStart}
      >
        {/* 网格线 */}
        <div className="absolute inset-0 grid gap-px bg-gray-700" style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
        }}>
          {Array(GRID_SIZE * GRID_SIZE).fill(0).map((_, index) => (
            <div 
              key={`cell-${index}`} 
              className="bg-gray-900"
            />
          ))}
        </div>
        
        {/* 食物 */}
        <div
          className="absolute rounded-full bg-red-500 animate-pulse"
          style={{
            width: `${cellSize - 4}px`,
            height: `${cellSize - 4}px`,
            top: `${food.y * cellSize + 2}px`,
            left: `${food.x * cellSize + 2}px`,
          }}
        />
        
        {/* 蛇 */}
        {snake.map((segment, index) => (
          <div
            key={`segment-${index}`}
            className={`absolute rounded-sm ${index === 0 ? 'bg-green-500' : 'bg-green-400'}`}
            style={{
              width: `${cellSize - 2}px`,
              height: `${cellSize - 2}px`,
              top: `${segment.y * cellSize + 1}px`,
              left: `${segment.x * cellSize + 1}px`,
            }}
          />
        ))}
        
        {/* 游戏开始提示 */}
        {gameState === GameState.READY && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-white text-xl font-bold mb-2">按空格键开始游戏</div>
            <div className="text-gray-300 text-sm">使用方向键或滑动控制蛇的移动</div>
          </div>
        )}
        
        {/* 暂停提示 */}
        {gameState === GameState.PAUSED && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-white text-xl font-bold mb-2">游戏已暂停</div>
            <div className="text-gray-300 text-sm">按空格键继续游戏</div>
          </div>
        )}
        
        {/* 游戏结束提示 */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-white text-xl font-bold mb-2">游戏结束</div>
            <div className="text-gray-300 text-sm">按空格键重新开始</div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="text-center mb-6 w-full max-w-lg">
        <h1 className={title({ size: "lg", color: "green" })}>贪食蛇游戏</h1>
        <div className={subtitle({ class: "mt-2 text-gray-300" })}>
          控制蛇吃到食物，避免撞墙或撞到自己！
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <Card className="bg-gray-800/80 border-gray-700/50 shadow-2xl backdrop-blur-sm transition-all duration-300">
          <CardBody className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
              <div className="flex gap-4">
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">分数</div>
                  <div className="text-2xl font-bold text-white">
                    {score}
                  </div>
                </div>
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">最高分</div>
                  <div className="text-2xl font-bold text-white">
                    {bestScore}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="flat"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                  onPress={startGame}
                >
                  {gameState === GameState.READY || gameState === GameState.GAME_OVER ? "开始游戏" : 
                   gameState === GameState.PAUSED ? "继续游戏" : "重新开始"}
                </Button>
                {gameState === GameState.PLAYING && (
                  <Button
                    variant="flat"
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                    onPress={pauseGame}
                  >
                    暂停
                  </Button>
                )}
              </div>
            </div>

            <div className="flex justify-center mb-6">
              {renderGrid()}
            </div>

            <div className="text-center text-gray-400 text-sm mb-4">
              <p>使用方向键或滑动来控制蛇的移动</p>
              <p>按空格键开始/暂停游戏</p>
            </div>

            {gameState === GameState.GAME_OVER && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-8 rounded-xl text-center max-w-md">
                  <h2 className="text-3xl font-bold mb-4 text-white">
                    游戏结束！
                  </h2>
                  <p className="text-xl mb-6 text-gray-300">
                    最终得分: <span className="font-bold text-green-400">{score}</span>
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button
                      variant="flat"
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                      onPress={startGame}
                    >
                      再来一局
                    </Button>
                    <Button
                      as={Link}
                      href="/games"
                      variant="flat"
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                    >
                      返回游戏列表
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="mt-4 text-center text-gray-500 text-sm">
          <p>控制蛇吃到红色食物，每吃到一个食物得10分</p>
          <p>蛇会随着得分增加而变长，速度也会逐渐加快</p>
          <p>避免撞墙或撞到自己的身体！</p>
        </div>
      </div>
    </section>
  );
}
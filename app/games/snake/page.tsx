"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import { MobileControls } from "@/components/mobile-controls";

interface Position {
  x: number;
  y: number;
}

interface SnakeSegment {
  id: string;
  position: Position;
  isHead: boolean;
  isNew: boolean;
}

interface Food {
  position: Position;
  type: 'normal' | 'bonus';
  value: number;
}

const GRID_SIZE = 20;
const GAME_SPEED = 150;
const BONUS_FOOD_CHANCE = 0.15;

export default function SnakeGame() {
  const [snake, setSnake] = useState<SnakeSegment[]>([]);
  const [food, setFood] = useState<Food | null>(null);
  const [direction, setDirection] = useState<string>("RIGHT");
  const [nextDirection, setNextDirection] = useState<string>("RIGHT");
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [cellSize, setCellSize] = useState<number>(20);
  const [boardSize, setBoardSize] = useState<number>(400);
  const [scoreAnimation, setScoreAnimation] = useState<boolean>(false);
  const [gameSpeed, setGameSpeed] = useState<number>(GAME_SPEED);
  const isMobile = useMobile();
  const gameRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  // 动态调整游戏板大小
  useEffect(() => {
    const updateBoardSize = () => {
      if (isMobile) {
        const screenWidth = window.innerWidth;
        const maxWidth = Math.min(screenWidth - 48, 400);
        const newCellSize = Math.floor(maxWidth / GRID_SIZE);
        const newBoardSize = newCellSize * GRID_SIZE;
        setCellSize(newCellSize);
        setBoardSize(newBoardSize);
      } else {
        setCellSize(20);
        setBoardSize(400);
      }
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, [isMobile]);

  // 生成食物
  const generateFood = useCallback((): Food => {
    let newPosition: Position;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      newPosition = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      attempts++;
    } while (
      snake.some(segment => 
        segment.position.x === newPosition.x && 
        segment.position.y === newPosition.y
      ) && 
      attempts < maxAttempts
    );

    const isBonus = Math.random() < BONUS_FOOD_CHANCE && score > 50;
    
    return {
      position: newPosition,
      type: isBonus ? 'bonus' : 'normal',
      value: isBonus ? 25 : 10
    };
  }, [snake, score]);

  // 初始化游戏
  const initializeGame = useCallback(() => {
    const initialSnake: SnakeSegment[] = [
      {
        id: 'head',
        position: { x: 10, y: 10 },
        isHead: true,
        isNew: false
      },
      {
        id: 'body-1',
        position: { x: 9, y: 10 },
        isHead: false,
        isNew: false
      },
      {
        id: 'body-2',
        position: { x: 8, y: 10 },
        isHead: false,
        isNew: false
      }
    ];

    setSnake(initialSnake);
    setFood(generateFood());
    setDirection("RIGHT");
    setNextDirection("RIGHT");
    setGameOver(false);
    setScore(0);
    setGameStarted(false);
    setIsPaused(false);
    setGameSpeed(GAME_SPEED);
  }, [generateFood]);

  // 重置游戏
  const resetGame = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    setSnake([]);
    setFood(null);
    setDirection("RIGHT");
    setNextDirection("RIGHT");
    setGameOver(false);
    setScore(0);
    setGameStarted(false);
    setIsPaused(false);
    setGameSpeed(GAME_SPEED);
    setTimeout(initializeGame, 100);
  };

  // 处理方向改变
  const handleDirectionChange = useCallback((newDirection: string) => {
    if (!gameStarted) {
      setGameStarted(true);
    }

    // 防止反向移动
    const opposites = {
      'UP': 'DOWN',
      'DOWN': 'UP',
      'LEFT': 'RIGHT',
      'RIGHT': 'LEFT'
    };

    if (opposites[newDirection as keyof typeof opposites] !== direction) {
      setNextDirection(newDirection);
    }
  }, [direction, gameStarted]);

  // 移动蛇
  const moveSnake = useCallback(() => {
    if (gameOver || !gameStarted || isPaused) return;

    setDirection(nextDirection);
    
    setSnake((prevSnake) => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };
      const newHead: SnakeSegment = {
        ...head,
        id: `head-${Date.now()}`,
        position: { ...head.position },
        isNew: true
      };

      // 根据方向移动蛇头
      switch (nextDirection) {
        case "UP":
          newHead.position.y = (newHead.position.y - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case "DOWN":
          newHead.position.y = (newHead.position.y + 1) % GRID_SIZE;
          break;
        case "LEFT":
          newHead.position.x = (newHead.position.x - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case "RIGHT":
          newHead.position.x = (newHead.position.x + 1) % GRID_SIZE;
          break;
      }

      // 检查是否撞到自己
      if (newSnake.some((segment) => 
        segment.position.x === newHead.position.x && 
        segment.position.y === newHead.position.y
      )) {
        setGameOver(true);
        return prevSnake;
      }

      // 更新蛇身
      const updatedSnake = newSnake.map((segment, index) => ({
        ...segment,
        isHead: false,
        isNew: false
      }));

      // 添加新蛇头
      updatedSnake.unshift(newHead);

      // 检查是否吃到食物
      if (food && 
          newHead.position.x === food.position.x && 
          newHead.position.y === food.position.y) {
        
        // 增加分数
        setScore(prev => prev + food.value);
        setScoreAnimation(true);
        setTimeout(() => setScoreAnimation(false), 300);

        // 生成新食物
        setFood(generateFood());

        // 加速游戏
        if (score > 0 && score % 100 === 0) {
          setGameSpeed(prev => Math.max(prev - 10, 80));
        }
      } else {
        // 如果没有吃到食物，移除尾部
        updatedSnake.pop();
      }

      return updatedSnake;
    });
  }, [nextDirection, gameOver, gameStarted, isPaused, food, generateFood, score]);

  // 游戏循环
  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      gameLoopRef.current = setInterval(moveSnake, gameSpeed);
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, isPaused, gameSpeed, moveSnake]);

  // 触摸控制
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const minSwipeDistance = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        handleDirectionChange(deltaX > 0 ? 'RIGHT' : 'LEFT');
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        handleDirectionChange(deltaY > 0 ? 'DOWN' : 'UP');
      }
    }

    setTouchStart(null);
  };

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleDirectionChange('UP');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleDirectionChange('DOWN');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleDirectionChange('LEFT');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleDirectionChange('RIGHT');
          break;
        case ' ':
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleDirectionChange, gameOver]);

  // 初始化游戏
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // 暂停/继续游戏
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <style>{`
        @keyframes snakeMove {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
        
        @keyframes foodPulse {
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
        
        @keyframes bonusFoodGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.8);
          }
          50% {
            box-shadow: 0 0 30px rgba(245, 158, 11, 1), 0 0 40px rgba(245, 158, 11, 0.6);
          }
        }
        
        @keyframes scoreUpdate {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
            color: #10b981;
          }
          100% {
            transform: scale(1);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
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
        
        .snake-head {
          animation: snakeMove 0.3s ease-out;
        }
        
        .snake-body {
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .food-normal {
          animation: foodPulse 2s infinite;
        }
        
        .food-bonus {
          animation: bonusFoodGlow 1.5s infinite;
        }
        
        .score-update {
          animation: scoreUpdate 0.3s ease-out;
        }
        
        .fade-in {
          animation: fadeIn 0.6s ease-out;
        }
        
        .slide-in {
          animation: slideIn 0.4s ease-out;
        }
        
        .game-board {
          background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        .grid-cell {
          background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
          border: 1px solid rgba(75, 85, 99, 0.3);
        }
      `}</style>

      <div className="w-full max-w-md">
        <div className="text-center mb-6 fade-in">
          <h1 className={title({ size: "lg", fullWidth: true, color: "green" })}>贪食蛇</h1>
          <div className={subtitle({ class: "mt-2 text-gray-600 dark:text-gray-300" })}>
            使用方向键控制蛇的移动，吃到食物让蛇变长
          </div>
        </div>

        <Card className="w-full bg-white/80 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 shadow-2xl slide-in backdrop-blur-sm">
          <CardBody className="flex flex-col items-center gap-6 p-6">
            {/* 游戏信息栏 */}
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">得分</p>
                    <p className={`text-lg font-bold text-gray-900 dark:text-white ${scoreAnimation ? "score-update" : ""}`}>
                      {score}
                    </p>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">长度</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{snake.length}</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  color="secondary"
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
                  onPress={togglePause}
                >
                  {isPaused ? '继续' : '暂停'}
                </Button>
                
                <Button
                  color="primary"
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
                  onPress={resetGame}
                >
                  重新开始
                </Button>
              </div>
            </div>

            {/* 游戏板 */}
            <div className="relative w-full flex justify-center">
              <div
                ref={gameRef}
                className="game-board rounded-xl p-4 touch-none select-none"
                style={{
                  width: boardSize + 32,
                  height: boardSize + 32,
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* 背景网格 */}
                <div className="absolute inset-4 grid grid-cols-20 grid-rows-20 gap-px">
                  {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => (
                    <div
                      key={index}
                      className="grid-cell"
                      style={{
                        width: cellSize - 1,
                        height: cellSize - 1,
                      }}
                    />
                  ))}
                </div>

                {/* 蛇身 */}
                {snake.map((segment, index) => (
                  <div
                    key={segment.id}
                    className={`absolute rounded-sm snake-body ${
                      segment.isHead 
                        ? 'bg-gradient-to-br from-green-400 to-green-600 snake-head z-20' 
                        : 'bg-gradient-to-br from-green-500 to-green-700'
                    }`}
                    style={{
                      width: cellSize - 2,
                      height: cellSize - 2,
                      left: segment.position.x * cellSize + 1,
                      top: segment.position.y * cellSize + 1,
                      boxShadow: segment.isHead 
                        ? '0 0 12px rgba(72, 187, 120, 0.8)' 
                        : '0 2px 4px rgba(0, 0, 0, 0.3)',
                      zIndex: snake.length - index + 10,
                    }}
                  />
                ))}

                {/* 食物 */}
                {food && (
                  <div
                    className={`absolute rounded-full ${
                      food.type === 'bonus' 
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 food-bonus' 
                        : 'bg-gradient-to-br from-red-500 to-red-600 food-normal'
                    }`}
                    style={{
                      width: cellSize - 2,
                      height: cellSize - 2,
                      left: food.position.x * cellSize + 1,
                      top: food.position.y * cellSize + 1,
                      boxShadow: food.type === 'bonus' 
                        ? '0 0 20px rgba(245, 158, 11, 0.8)' 
                        : '0 0 8px rgba(239, 68, 68, 0.7)',
                    }}
                  />
                )}
              </div>
            </div>

            {/* 游戏状态提示 */}
            {!gameStarted && (
              <div className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-4 rounded-xl w-full fade-in border border-blue-200/50 dark:border-blue-500/30">
                <p className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-2">🎮 准备开始</p>
                <p className="text-blue-600 dark:text-blue-400">按任意方向键开始游戏</p>
              </div>
            )}

            {isPaused && (
              <div className="text-center bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 p-4 rounded-xl w-full fade-in border border-yellow-200/50 dark:border-yellow-500/30">
                <p className="text-lg font-semibold text-yellow-700 dark:text-yellow-300 mb-2">⏸️ 游戏暂停</p>
                <p className="text-yellow-600 dark:text-yellow-400">按空格键继续游戏</p>
              </div>
            )}

            {gameOver && (
              <div className="text-center bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 p-4 rounded-xl w-full animate-pulse fade-in border border-red-200/50 dark:border-red-500/30">
                <p className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">💀 游戏结束!</p>
                <p className="text-red-600 dark:text-red-400">最终得分: {score}</p>
              </div>
            )}

            {/* 游戏说明 */}
            <div className="text-sm text-gray-600 dark:text-gray-300 text-center bg-gray-100/50 dark:bg-gray-700/30 p-4 rounded-xl w-full fade-in border border-gray-200/50 dark:border-gray-600/30">
              <p className="font-medium mb-2 text-gray-700 dark:text-gray-200">🎮 游戏说明</p>
              <p>使用方向键控制蛇的移动</p>
              <p>吃到红色食物增加10分</p>
              <p>吃到金色食物增加25分</p>
              <p>按空格键暂停/继续游戏</p>
            </div>

            {/* 移动端控制 */}
            {isMobile && (
              <div className="w-full mt-4 fade-in">
                <MobileControls
                  className="w-full"
                  onDirection={(direction) =>
                    handleDirectionChange(direction.toUpperCase())
                  }
                  cellSize={cellSize}
                  variant="game"
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

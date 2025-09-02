"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import { MobileControls } from "@/components/mobile-controls";
import Link from "next/link";

// 游戏常量
const BOARD_SIZE = 20;
const INITIAL_SPEED = 150;
const MIN_SPEED = 70;
const SPEED_INCREASE = 3;
const ANIMATION_DURATION = 100;

// 位置接口
interface Position {
  x: number;
  y: number;
}

type Direction = 'up' | 'down' | 'left' | 'right';

// 蛇身段接口
interface SnakeSegment {
  id: number;
  position: Position;
}

// 食物接口
interface Food {
  id: number;
  position: Position;
}

export default function SnakeGame() {
  // 游戏状态
  const [snake, setSnake] = useState<SnakeSegment[]>([
    { id: 1, position: { x: 10, y: 10 } },
    { id: 2, position: { x: 9, y: 10 } },
    { id: 3, position: { x: 8, y: 10 } }
  ]);
  const [food, setFood] = useState<Food>({ id: 1, position: { x: 5, y: 10 } });
  const [direction, setDirection] = useState<Direction>('right');
  const [nextDirection, setNextDirection] = useState<Direction>('right');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [gameBoardSize, setGameBoardSize] = useState<number>(400);
  const [cellSize, setCellSize] = useState<number>(20);
  const [theme, setTheme] = useState<'green' | 'blue' | 'purple' | 'orange'>('green');
  
  // 布局相关
  const isMobile = useMobile();
  const gameRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const previousDirectionRef = useRef<Direction>('right');
  const nextId = useRef<number>(4);
  
  // 颜色主题
  const colorThemes = {
    green: {
      head: 'bg-gradient-to-br from-emerald-500 to-green-600',
      body: 'bg-gradient-to-br from-green-400 to-emerald-500',
      food: 'bg-gradient-to-br from-red-500 to-rose-600',
      grid: 'bg-gray-700/20',
      border: 'border-gray-600/30',
      accent: 'from-green-500 to-emerald-600',
    },
    blue: {
      head: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      body: 'bg-gradient-to-br from-cyan-400 to-blue-500',
      food: 'bg-gradient-to-br from-yellow-500 to-amber-600',
      grid: 'bg-gray-700/20',
      border: 'border-gray-600/30',
      accent: 'from-blue-500 to-cyan-600',
    },
    purple: {
      head: 'bg-gradient-to-br from-purple-500 to-violet-600',
      body: 'bg-gradient-to-br from-violet-400 to-purple-500',
      food: 'bg-gradient-to-br from-pink-500 to-rose-600',
      grid: 'bg-gray-700/20',
      border: 'border-gray-600/30',
      accent: 'from-purple-500 to-violet-600',
    },
    orange: {
      head: 'bg-gradient-to-br from-orange-500 to-amber-600',
      body: 'bg-gradient-to-br from-amber-400 to-orange-500',
      food: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      grid: 'bg-gray-700/20',
      border: 'border-gray-600/30',
      accent: 'from-orange-500 to-amber-600',
    }
  };

  // 动态调整游戏板大小
  useEffect(() => {
    const updateBoardSize = () => {
      if (isMobile) {
        const screenWidth = window.innerWidth;
        const maxWidth = Math.min(screenWidth - 48, 400);
        const newCellSize = Math.floor(maxWidth / BOARD_SIZE);
        const newBoardSize = newCellSize * BOARD_SIZE;
        setCellSize(newCellSize);
        setGameBoardSize(newBoardSize);
      } else {
        setCellSize(20);
        setGameBoardSize(400);
      }
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, [isMobile]);

  // 生成食物
  const generateFood = useCallback((): Food => {
    const getRandomPosition = () => ({
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE)
    });

    let newFoodPosition = getRandomPosition();
    // 确保食物不会生成在蛇身上
    while (snake.some(segment => 
      segment.position.x === newFoodPosition.x && 
      segment.position.y === newFoodPosition.y
    )) {
      newFoodPosition = getRandomPosition();
    }

    return {
      id: nextId.current++,
      position: newFoodPosition
    };
  }, [snake]);

  // 检查碰撞
  const checkCollision = useCallback((head: Position): boolean => {
    // 检查是否撞到边界
    if (head.x < 0 || head.x >= BOARD_SIZE || head.y < 0 || head.y >= BOARD_SIZE) {
      return true;
    }

    // 检查是否撞到自己（从第二个身体段开始检查）
    for (let i = 1; i < snake.length; i++) {
      if (snake[i].position.x === head.x && snake[i].position.y === head.y) {
        return true;
      }
    }

    return false;
  }, [snake]);

  // 游戏循环
  const gameLoop = useCallback(() => {
    if (gameOver || !gameStarted) {
      return;
    }

    setIsAnimating(true);
    
    // 更新方向
    setDirection(nextDirection);
    previousDirectionRef.current = nextDirection;

    // 计算新的头部位置
    const head = { ...snake[0].position };
    switch (nextDirection) {
      case 'up':
        head.y -= 1;
        break;
      case 'down':
        head.y += 1;
        break;
      case 'left':
        head.x -= 1;
        break;
      case 'right':
        head.x += 1;
        break;
    }

    // 检查碰撞
    if (checkCollision(head)) {
      setGameOver(true);
      setIsAnimating(false);
      if (score > highScore) {
        setHighScore(score);
        if (typeof window !== 'undefined') {
          localStorage.setItem('snake-high-score', score.toString());
        }
      }
      return;
    }

    // 检查是否吃到食物
    const ateFood = head.x === food.position.x && head.y === food.position.y;

    // 创建新的蛇身
    const newSnake: SnakeSegment[] = [
      { id: nextId.current++, position: head },
      ...snake
    ];

    // 如果没有吃到食物，移除尾部
    if (!ateFood) {
      newSnake.pop();
    }

    // 更新分数和速度
    if (ateFood) {
      setScore(prev => {
        const newScore = prev + 10;
        // 每得30分加快速度
        if (newScore % 30 === 0 && speed > MIN_SPEED) {
          setSpeed(prevSpeed => prevSpeed - SPEED_INCREASE);
        }
        return newScore;
      });
      
      // 生成新食物
      setFood(generateFood());
      
      // 随机切换主题
      const themes: Array<'green' | 'blue' | 'purple' | 'orange'> = ['green', 'blue', 'purple', 'orange'];
      setTheme(themes[Math.floor(Math.random() * themes.length)]);
    }

    setSnake(newSnake);
    setIsAnimating(false);
  }, [snake, food, nextDirection, gameOver, gameStarted, checkCollision, generateFood, score, highScore, speed]);

  // 开始游戏循环
  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoopRef.current = setInterval(gameLoop, speed);
    } else if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameStarted, gameOver, gameLoop, speed]);

  // 初始化游戏
  const initializeGame = useCallback(() => {
    setSnake([
      { id: 1, position: { x: 10, y: 10 } },
      { id: 2, position: { x: 9, y: 10 } },
      { id: 3, position: { x: 8, y: 10 } }
    ]);
    setFood(generateFood());
    setDirection('right');
    setNextDirection('right');
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setSpeed(INITIAL_SPEED);
    setTheme('green');
    previousDirectionRef.current = 'right';
    nextId.current = 4;
  }, [generateFood]);

  // 重置游戏
  const resetGame = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    initializeGame();
  };

  // 暂停/继续游戏
  const toggleGame = () => {
    if (gameOver) {
      resetGame();
    } else {
      setGameStarted(!gameStarted);
    }
  };

  // 处理方向键
  const handleDirection = (newDirection: Direction) => {
    // 防止180度转向
    const oppositeDirections: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left'
    };

    if (newDirection !== oppositeDirections[previousDirectionRef.current]) {
      setNextDirection(newDirection);
    }
  };

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || isAnimating) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleDirection('up');
          if (!gameStarted) setGameStarted(true);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleDirection('down');
          if (!gameStarted) setGameStarted(true);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleDirection('left');
          if (!gameStarted) setGameStarted(true);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleDirection('right');
          if (!gameStarted) setGameStarted(true);
          break;
        case ' ': // 空格键暂停/继续
          e.preventDefault();
          toggleGame();
          break;
        case 'r':
        case 'R':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            resetGame();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, isAnimating, gameStarted, handleDirection, toggleGame, resetGame]);

  // 触摸控制
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || gameOver || isAnimating) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const minSwipeDistance = 20;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        handleDirection(deltaX > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        handleDirection(deltaY > 0 ? 'down' : 'up');
      }
    }

    if (!gameStarted) {
      setGameStarted(true);
    }

    setTouchStart(null);
  };

  // 移动端控制
  const handleMobileControl = (newDirection: Direction) => {
    handleDirection(newDirection);
    if (!gameStarted) {
      setGameStarted(true);
    }
  };

  // 初始化游戏
  useEffect(() => {
    // 加载最高分
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('snake-high-score');
      if (saved) {
        setHighScore(parseInt(saved, 10));
      }
    }
    
    initializeGame();
  }, [initializeGame]);

  // 渲染游戏板网格
  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        cells.push(
          <div
            key={`grid-${x}-${y}`}
            className={`absolute ${colorThemes[theme].grid} rounded-sm`}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              left: `${x * cellSize}px`,
              top: `${y * cellSize}px`,
            }}
          />
        );
      }
    }
    return cells;
  };

  // 获取蛇的头部方向类
  const getHeadDirectionClass = () => {
    const classes = {
      up: 'rotate-180',
      down: 'rotate-0',
      left: '-rotate-90',
      right: 'rotate-90'
    };
    return classes[direction];
  };

  // 渲染蛇
  const renderSnake = () => {
    return snake.map((segment, index) => {
      const isHead = index === 0;
      const segmentClass = `absolute rounded-sm transition-all duration-${ANIMATION_DURATION} ease-in-out ${
        isHead 
          ? `${colorThemes[theme].head} shadow-md z-10` 
          : `${colorThemes[theme].body} shadow-sm`
      }`;
      
      return (
        <div
          key={segment.id}
          className={segmentClass}
          style={{
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            left: `${segment.position.x * cellSize}px`,
            top: `${segment.position.y * cellSize}px`,
            transform: isHead ? `scale(1.1) ${getHeadDirectionClass()}` : 'scale(1)',
            transformOrigin: 'center',
          }}
        >
          {isHead && (
            <div className="w-full h-full flex items-center justify-center">
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="white" 
                className={`transition-transform duration-200 ${getHeadDirectionClass()}`}
              >
                <path d="M9 18l6-6-6-6v12z"/>
              </svg>
            </div>
          )}
        </div>
      );
    });
  };

  // 渲染食物
  const renderFood = () => {
    return (
      <div
        className={`absolute ${colorThemes[theme].food} rounded-md shadow-md transition-all duration-200 animate-pulse`}
        style={{
          width: `${cellSize * 0.8}px`,
          height: `${cellSize * 0.8}px`,
          left: `${food.position.x * cellSize + cellSize * 0.1}px`,
          top: `${food.position.y * cellSize + cellSize * 0.1}px`,
        }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M12 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="text-center mb-6 w-full max-w-lg">
        <h1 className={title({ size: "lg", color: "green" })}>贪吃蛇游戏</h1>
        <div className={subtitle({ class: "mt-2 text-gray-300" })}>
          控制蛇吃到食物，让它变得更长，但要避免撞到墙壁或自己的身体！
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <Card className="bg-gray-800/80 border-gray-700/50 shadow-2xl backdrop-blur-sm transition-all duration-300">
          <CardBody className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
              <div className="flex gap-4">
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">当前得分</div>
                  <div className="text-2xl font-bold text-white">{score}</div>
                </div>
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">最高分</div>
                  <div className="text-2xl font-bold text-white">{highScore}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="flat"
                  className={`bg-gradient-to-r ${colorThemes[theme].accent} hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105`}
                  onPress={toggleGame}
                >
                  {gameOver ? '新游戏' : (gameStarted ? '暂停' : '开始')}
                </Button>
                <Button
                  variant="flat"
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                  onPress={resetGame}
                >
                  重置
                </Button>
              </div>
            </div>

            <div 
              ref={gameRef}
              className={`relative border-4 ${colorThemes[theme].border} rounded-xl overflow-hidden shadow-lg transition-all duration-300`}
              style={{ width: `${gameBoardSize}px`, height: `${gameBoardSize}px` }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* 游戏网格 */}
              {renderGrid()}
               
              {/* 蛇 */}
              {renderSnake()}

              {/* 食物 */}
              {renderFood()}
              
              {/* 游戏开始提示 */}
              {!gameStarted && !gameOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="text-white text-xl font-bold mb-4 animate-bounce">按方向键开始游戏</div>
                  <div className="text-gray-300 text-sm">空格键暂停/继续游戏</div>
                </div>
              )}

              {/* 暂停提示 */}
              {gameStarted && !gameOver && gameLoopRef.current === null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="text-white text-xl font-bold mb-4 animate-pulse">游戏已暂停</div>
                  <div className="text-gray-300 text-sm">按空格键继续</div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* 移动端控制 */}
        {isMobile && (
          <MobileControls
            onDirection={handleMobileControl}
            className="mt-4"
            variant="game"
            cellSize={cellSize * 2}
          />
        )}

        {/* 游戏结束覆盖层 */}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
            <Card className="bg-gray-800/95 border-gray-600 shadow-2xl max-w-md w-full mx-4">
              <CardBody className="p-6 text-center">
                <h2 className="text-2xl font-bold text-red-400 mb-2">游戏结束！</h2>
                <p className="text-gray-300 mb-2">你撞到了</p>
                <p className="text-gray-300 mb-6">最终得分: <span className="text-yellow-400 font-bold">{score}</span></p>
                {score > highScore && (
                  <div className="bg-green-900/50 border border-green-500/30 rounded-lg p-3 mb-6 animate-pulse">
                    <p className="text-green-400 font-bold">新纪录！🎉</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="flat"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all duration-300"
                    onPress={resetGame}
                  >
                    再玩一次
                  </Button>
                  <Link href="/games">
                    <Button
                      variant="flat"
                      className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg transition-all duration-300"
                    >
                      返回游戏列表
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
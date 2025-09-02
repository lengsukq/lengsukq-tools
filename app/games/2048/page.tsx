"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import { MobileControls } from "@/components/mobile-controls";
import Link from "next/link";

const BOARD_SIZE = 4;
const ANIMATION_DURATION = 200;

interface Tile {
  id: string;
  value: number;
  row: number;
  col: number;
  mergedFrom: string[];
  isNew?: boolean;
  isMerged?: boolean;
  animate?: {
    fromRow?: number;
    fromCol?: number;
  };
}

export default function Game2048() {
  // 游戏状态
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('2048-best-score');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [won, setWon] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [scoreAnimation, setScoreAnimation] = useState<boolean>(false);
  const [gameBoard, setGameBoard] = useState<number[][]>([]);
  
  // 布局相关
  const [cellSize, setCellSize] = useState<number>(80);
  const [boardSize, setBoardSize] = useState<number>(320);
  const isMobile = useMobile();
  const gameRef = useRef<HTMLDivElement>(null);
  
  // 动态调整游戏板大小
  useEffect(() => {
    const updateBoardSize = () => {
      if (isMobile) {
        const screenWidth = window.innerWidth;
        const maxWidth = Math.min(screenWidth - 48, 400);
        const newCellSize = Math.floor(maxWidth / BOARD_SIZE);
        const newBoardSize = newCellSize * BOARD_SIZE;
        setCellSize(newCellSize);
        setBoardSize(newBoardSize);
      } else {
        setCellSize(80);
        setBoardSize(320);
      }
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, [isMobile]);

  // 生成随机瓦片
  const generateRandomTile = useCallback((): Tile | null => {
    const emptyCells: [number, number][] = [];
    
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (!tiles.some(tile => tile.row === i && tile.col === j)) {
          emptyCells.push([i, j]);
        }
      }
    }

    if (emptyCells.length === 0) return null;

    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    const id = `tile-${Date.now()}-${Math.random()}`;

    return {
      id,
      value,
      row,
      col,
      mergedFrom: [],
      isNew: true
    };
  }, [tiles]);

  // 初始化游戏
  const initializeGame = useCallback(() => {
    const newTiles: Tile[] = [];
    const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    
    // 生成两个初始瓦片
    for (let i = 0; i < 2; i++) {
      const tile = generateRandomTile();
      if (tile) {
        newTiles.push(tile);
        newBoard[tile.row][tile.col] = tile.value;
      }
    }

    setTiles(newTiles);
    setGameBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setGameStarted(true);
    setIsAnimating(false);
  }, [generateRandomTile]);

  // 重置游戏
  const resetGame = () => {
    initializeGame();
  };

  // 获取瓦片颜色
  const getTileColor = (value: number) => {
    const colors: Record<number, string> = {
      2: 'bg-gradient-to-br from-amber-50 to-amber-200 text-gray-800',
      4: 'bg-gradient-to-br from-amber-200 to-amber-300 text-gray-800',
      8: 'bg-gradient-to-br from-orange-400 to-orange-500 text-white',
      16: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white',
      32: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white',
      64: 'bg-gradient-to-br from-rose-600 to-rose-700 text-white',
      128: 'bg-gradient-to-br from-amber-300 to-yellow-400 text-gray-900',
      256: 'bg-gradient-to-br from-amber-400 to-yellow-500 text-gray-900',
      512: 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-gray-900',
      1024: 'bg-gradient-to-br from-yellow-500 to-yellow-700 text-white',
      2048: 'bg-gradient-to-br from-green-400 to-green-600 text-white',
    };
    
    return colors[value] || 'bg-gradient-to-br from-violet-600 to-violet-800 text-white';
  };

  // 获取瓦片文本大小
  const getTileTextSize = (value: number) => {
    if (value < 100) return 'text-3xl';
    if (value < 1000) return 'text-2xl';
    return 'text-xl';
  };

  // 移动瓦片
  const moveTiles = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (isAnimating || gameOver) return;

    setIsAnimating(true);
    const newBoard = gameBoard.map(row => [...row]);
    const newTiles: Tile[] = [];
    let moved = false;
    let scoreIncrement = 0;

    // 根据方向确定遍历顺序
    const getTraversalOrder = () => {
      switch (direction) {
        case 'left':
          return { row: [0, BOARD_SIZE - 1], col: [0, BOARD_SIZE - 1], step: 1 };
        case 'right':
          return { row: [0, BOARD_SIZE - 1], col: [BOARD_SIZE - 1, 0], step: -1 };
        case 'up':
          return { row: [0, BOARD_SIZE - 1], col: [0, BOARD_SIZE - 1], step: 1 };
        case 'down':
          return { row: [BOARD_SIZE - 1, 0], col: [0, BOARD_SIZE - 1], step: -1 };
      }
    };

    const order = getTraversalOrder();
    const isHorizontal = direction === 'left' || direction === 'right';

    // 遍历每一行/列
    for (let i = order.row[0]; 
         isHorizontal ? i <= order.row[1] : i >= order.row[1]; 
         i += isHorizontal ? 1 : order.step) {
      const line: {value: number, tile?: Tile}[] = [];

      // 收集非零值
      for (let j = order.col[0]; 
           j !== order.col[1] + order.step; 
           j += order.step) {
        const value = isHorizontal ? newBoard[i][j] : newBoard[j][i];
        if (value !== 0) {
          const tile = tiles.find(t => 
            isHorizontal ? (t.row === i && t.col === j) : (t.row === j && t.col === i)
          );
          line.push({value, tile});
          newBoard[isHorizontal ? i : j][isHorizontal ? j : i] = 0;
        }
      }

      // 合并相同值
      let mergedCount = 0;
      for (let j = 0; j < line.length; j++) {
        if (j < line.length - 1 && line[j].value === line[j + 1].value) {
          // 合并瓦片
          const mergedValue = line[j].value * 2;
          scoreIncrement += mergedValue;
          
          // 创建合并后的瓦片
          const mergedTile: Tile = {
            id: `merged-${Date.now()}-${j}`,
            value: mergedValue,
            row: isHorizontal ? i : j,
            col: isHorizontal ? j : i,
            isMerged: true,
            mergedFrom: []
          };
          // 使用临时变量解决类型推断问题
          const firstTile = line[j].tile;
          if (firstTile !== undefined) {
            mergedTile.mergedFrom.push(firstTile.id);
          }
          if (line[j + 1] !== undefined) {
            const secondTile = line[j + 1].tile;
            if (secondTile !== undefined) {
              mergedTile.mergedFrom.push(secondTile.id);
            }
          }
          
          line[j] = {value: mergedValue, tile: mergedTile};
          line.splice(j + 1, 1);
          mergedCount++;
        }
      }

      // 移动瓦片到新位置
      let newPosition = order.col[0];
      for (let j = 0; j < line.length; j++) {
        const targetRow = isHorizontal ? i : newPosition;
        const targetCol = isHorizontal ? newPosition : i;
        
        newBoard[targetRow][targetCol] = line[j].value;
        
        if (line[j].tile !== undefined) {
          // 使用临时变量和非空断言操作符
          const originalTile = line[j].tile!;
          const movedTile: Tile = {
            id: originalTile.id,
            value: originalTile.value,
            row: targetRow,
            col: targetCol,
            mergedFrom: originalTile.mergedFrom || [],
            isNew: originalTile.isNew,
            isMerged: originalTile.isMerged,
            animate: {
              fromRow: originalTile.row,
              fromCol: originalTile.col
            }
          };
          newTiles.push(movedTile);
        }
        
        newPosition += order.step;
      }
      
      if (line.length > 0 || mergedCount > 0) {
        moved = true;
      }
    }

    if (!moved) {
      setIsAnimating(false);
      return;
    }

    if (scoreIncrement > 0) {
      setScore(prev => {
        const newScore = prev + scoreIncrement;
        // 更新最高分
        if (newScore > bestScore) {
        setBestScore(newScore);
        if (typeof window !== 'undefined') {
          localStorage.setItem('2048-best-score', newScore.toString());
        }
      }
        return newScore;
      });
      setScoreAnimation(true);
      setTimeout(() => setScoreAnimation(false), 300);
    }

    // 生成新瓦片
    const newTile = generateRandomTile();
    if (newTile) {
      newTiles.push(newTile);
      newBoard[newTile.row][newTile.col] = newTile.value;
    }

    setTiles(newTiles);
    setGameBoard(newBoard);

    // 检查游戏状态
    setTimeout(() => {
      checkGameState(newBoard);
      setIsAnimating(false);
      
      // 清除动画标记
      setTiles(prev => prev.map(tile => ({
        ...tile,
        isNew: false,
        isMerged: false,
        mergedFrom: [],
        animate: undefined
      })));
    }, ANIMATION_DURATION);
  }, [gameBoard, tiles, isAnimating, gameOver, generateRandomTile, bestScore]);

  // 检查游戏状态
  const checkGameState = useCallback((board: number[][]) => {
    // 检查是否获胜
    const hasWon = board.some(row => row.some(cell => cell === 2048));
    if (hasWon && !won) {
      setWon(true);
    }

    // 检查是否游戏结束
    const hasEmptyCell = board.some(row => row.some(cell => cell === 0));
    if (!hasEmptyCell) {
      // 检查是否可以合并
      let canMerge = false;
      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          const current = board[i][j];
          if (
            (i < BOARD_SIZE - 1 && board[i + 1][j] === current) ||
            (j < BOARD_SIZE - 1 && board[i][j + 1] === current)
          ) {
            canMerge = true;
            break;
          }
        }
        if (canMerge) break;
      }
      
      if (!canMerge) {
        setGameOver(true);
      }
    }
  }, [won]);

  // 触摸控制
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || isAnimating) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const minSwipeDistance = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        moveTiles(deltaX > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        moveTiles(deltaY > 0 ? 'down' : 'up');
      }
    }

    setTouchStart(null);
  };

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isAnimating || gameOver || !gameStarted) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveTiles('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveTiles('right');
          break;
        case 'ArrowUp':
          e.preventDefault();
          moveTiles('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveTiles('down');
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

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAnimating, gameOver, gameStarted, moveTiles, resetGame]);

  // 初始化游戏
  useEffect(() => {
    initializeGame();
  }, []);

  // 计算瓦片位置和动画
  const getTileStyle = (tile: Tile) => {
    const style: React.CSSProperties = {
      width: `${cellSize}px`,
      height: `${cellSize}px`,
      left: `${tile.col * cellSize}px`,
      top: `${tile.row * cellSize}px`,
      zIndex: tile.isNew || tile.isMerged ? 10 : 1,
      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
    };

    if (tile.animate) {
      // 添加移动动画
      const translateX = (tile.animate.fromCol! - tile.col) * cellSize;
      const translateY = (tile.animate.fromRow! - tile.row) * cellSize;
      style.transform = `translate(${translateX}px, ${translateY}px)`;
      setTimeout(() => {
        setTiles(prev => prev.map(t => 
          t.id === tile.id ? { ...t, animate: undefined } : t
        ));
      }, 10);
    }

    return style;
  };

  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="text-center mb-6 w-full max-w-lg">
        <h1 className={title({ size: "lg", color: "yellow" })}>2048 游戏</h1>
        <div className={subtitle({ class: "mt-2 text-gray-300" })}>
          滑动数字方块，合并相同数字，尝试达到 2048！
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <Card className="bg-gray-800/80 border-gray-700/50 shadow-2xl backdrop-blur-sm transition-all duration-300">
          <CardBody className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
              <div className="flex gap-4">
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">分数</div>
                  <div 
                    className={`text-2xl font-bold text-white ${scoreAnimation ? 'scale-110 text-yellow-400' : ''} transition-all duration-300`}
                  >
                    {score}
                  </div>
                </div>
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">最高分</div>
                  <div className="text-2xl font-bold text-white">{bestScore}</div>
                </div>
              </div>
              <Button
                variant="flat"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                onPress={resetGame}
              >
                重新开始
              </Button>
            </div>

            <div 
              ref={gameRef}
              className="relative border-4 border-gray-700 rounded-xl overflow-hidden shadow-lg"
              style={{ width: `${boardSize}px`, height: `${boardSize}px` }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* 游戏背景网格 */}
              <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-1.5 bg-gray-800 p-1.5">
                {Array(16).fill(0).map((_, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-md"></div>
                ))}
              </div>
              
              {/* 瓦片 */}
              {tiles.map((tile) => (
                <div
                  key={tile.id}
                  className={`absolute rounded-md flex items-center justify-center font-bold ${getTileColor(tile.value)} ${getTileTextSize(tile.value)} shadow-md ${tile.isNew ? 'scale-110' : ''} ${tile.isMerged ? 'scale-125' : ''} transition-all duration-200 ease-out`}
                  style={getTileStyle(tile)}
                >
                  {tile.value}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* 移动端控制 */}
        {isMobile && (
          <MobileControls
            onDirection={(direction) => moveTiles(direction)}
            className="mt-4"
            variant="game"
            cellSize={cellSize}
          />
        )}

        {/* 游戏结束/获胜覆盖层 */}
        {(gameOver || won) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
            <Card className="bg-gray-800/95 border-gray-600 shadow-2xl max-w-md w-full mx-4">
              <CardBody className="p-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {gameOver ? '游戏结束！' : '恭喜你获胜！'}
                </h2>
                <p className="text-gray-300 mb-6">
                  {gameOver ? '再接再厉！' : '你已经达到了 2048！'}
                </p>
                <p className="text-gray-300 mb-6">
                  最终得分: <span className="text-yellow-400 font-bold">{score}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {won && !gameOver && (
                    <Button
                      variant="flat"
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-300"
                      onPress={() => setWon(false)}
                    >
                      继续游戏
                    </Button>
                  )}
                  <Button
                    variant="flat"
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-300"
                    onPress={resetGame}
                  >
                    重新开始
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

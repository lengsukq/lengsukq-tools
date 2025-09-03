"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import Link from "next/link";

// 游戏常量
const GRID_SIZE = 4;
const CELL_SIZE = 80;
const MOBILE_CELL_SIZE = 60;
const ANIMATION_DURATION = 150;

// 方向枚举
enum Direction {
  UP = "UP",
  DOWN = "DOWN",
  LEFT = "LEFT",
  RIGHT = "RIGHT"
}

// 单元格接口
interface Cell {
  id: number;
  value: number;
  row: number;
  col: number;
  merged: boolean;
  newTile: boolean;
}

// 游戏状态
enum GameState {
  READY = "ready",
  PLAYING = "playing",
  WON = "won",
  LOST = "lost"
}

export default function Game2048() {
  // 游戏状态
  const [grid, setGrid] = useState<number[][]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>(GameState.READY);
  const [cellSize, setCellSize] = useState<number>(CELL_SIZE);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  
  // 布局相关
  const isMobile = useMobile();
  const nextId = useRef<number>(1);
  
  // 动态调整单元格大小
  useEffect(() => {
    setCellSize(isMobile ? MOBILE_CELL_SIZE : CELL_SIZE);
  }, [isMobile]);
  
  // 初始化游戏
  const initializeGame = useCallback(() => {
    // 创建空网格
    const newGrid: number[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    setGrid(newGrid);
    setCells([]);
    setScore(0);
    setGameState(GameState.READY);
    
    // 添加两个初始方块
    setTimeout(() => {
      addRandomTile(newGrid);
      addRandomTile(newGrid);
      setGrid([...newGrid]);
      setGameState(GameState.PLAYING);
    }, 100);
  }, []);
  
  // 添加随机方块
  const addRandomTile = useCallback((currentGrid: number[][]) => {
    const emptyCells: [number, number][] = [];
    
    // 找出所有空单元格
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (currentGrid[row][col] === 0) {
          emptyCells.push([row, col]);
        }
      }
    }
    
    if (emptyCells.length > 0) {
      // 随机选择一个空单元格
      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      const [row, col] = emptyCells[randomIndex];
      
      // 90%概率生成2，10%概率生成4
      const value = Math.random() < 0.9 ? 2 : 4;
      
      // 更新网格
      currentGrid[row][col] = value;
      
      // 添加新方块到cells数组
      setCells(prev => [
        ...prev,
        {
          id: nextId.current++,
          value,
          row,
          col,
          merged: false,
          newTile: true
        }
      ]);
      
      return true;
    }
    
    return false;
  }, []);
  
  // 移动方块
  const moveTiles = useCallback((direction: Direction) => {
    if (gameState !== GameState.PLAYING || isAnimating) return;
    
    setIsAnimating(true);
    
    // 创建网格的深拷贝
    const newGrid = grid.map(row => [...row]);
    let moved = false;
    let newScore = score;
    
    // 重置所有方块的merged和newTile状态
    setCells(prev => prev.map(cell => ({
      ...cell,
      merged: false,
      newTile: false
    })));
    
    // 根据方向处理移动
    const processCell = (row: number, col: number) => {
      if (newGrid[row][col] === 0) return;
      
      let newRow = row;
      let newCol = col;
      
      // 根据方向确定移动路径
      switch (direction) {
        case Direction.UP:
          for (let r = row - 1; r >= 0; r--) {
            if (newGrid[r][col] === 0) {
              newRow = r;
            } else if (newGrid[r][col] === newGrid[row][col]) {
              newRow = r;
              break;
            } else {
              break;
            }
          }
          break;
        case Direction.DOWN:
          for (let r = row + 1; r < GRID_SIZE; r++) {
            if (newGrid[r][col] === 0) {
              newRow = r;
            } else if (newGrid[r][col] === newGrid[row][col]) {
              newRow = r;
              break;
            } else {
              break;
            }
          }
          break;
        case Direction.LEFT:
          for (let c = col - 1; c >= 0; c--) {
            if (newGrid[row][c] === 0) {
              newCol = c;
            } else if (newGrid[row][c] === newGrid[row][col]) {
              newCol = c;
              break;
            } else {
              break;
            }
          }
          break;
        case Direction.RIGHT:
          for (let c = col + 1; c < GRID_SIZE; c++) {
            if (newGrid[row][c] === 0) {
              newCol = c;
            } else if (newGrid[row][c] === newGrid[row][col]) {
              newCol = c;
              break;
            } else {
              break;
            }
          }
          break;
      }
      
      // 如果位置发生了变化
      if (newRow !== row || newCol !== col) {
        // 检查是否可以合并
        if (newGrid[newRow][newCol] === newGrid[row][col] && newRow !== row && newCol !== col) {
          // 合并方块
          newGrid[newRow][newCol] *= 2;
          newGrid[row][col] = 0;
          
          // 更新分数
          newScore += newGrid[newRow][newCol];
          
          // 更新cells数组
          setCells(prev => {
            const newCells = prev.filter(cell => !(cell.row === row && cell.col === col));
            const mergedCell = newCells.find(cell => cell.row === newRow && cell.col === newCol);
            
            if (mergedCell) {
              return newCells.map(cell => 
                cell.id === mergedCell.id 
                  ? { ...cell, value: newGrid[newRow][newCol], merged: true } 
                  : cell
              );
            }
            
            return newCells;
          });
          
          // 检查是否获胜
          if (newGrid[newRow][newCol] === 2048 && gameState === GameState.PLAYING) {
            setGameState(GameState.WON);
          }
        } else {
          // 移动方块
          newGrid[newRow][newCol] = newGrid[row][col];
          newGrid[row][col] = 0;
          
          // 更新cells数组
          setCells(prev => prev.map(cell => 
            cell.row === row && cell.col === col 
              ? { ...cell, row: newRow, col: newCol } 
              : cell
          ));
        }
        
        moved = true;
      }
    };
    
    // 根据方向确定遍历顺序
    if (direction === Direction.UP || direction === Direction.LEFT) {
      // 从左上到右下
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          processCell(row, col);
        }
      }
    } else {
      // 从右下到左上
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        for (let col = GRID_SIZE - 1; col >= 0; col--) {
          processCell(row, col);
        }
      }
    }
    
    // 更新网格和分数
    if (moved) {
      setGrid(newGrid);
      setScore(newScore);
      
      // 更新最高分
      if (newScore > bestScore) {
        setBestScore(newScore);
      }
      
      // 添加新方块
      setTimeout(() => {
        const added = addRandomTile(newGrid);
        setGrid([...newGrid]);
        
        // 检查游戏是否结束
        if (!checkGameStatus(newGrid) && !added) {
          setGameState(GameState.LOST);
        }
        
        setIsAnimating(false);
      }, ANIMATION_DURATION);
    } else {
      setIsAnimating(false);
    }
  }, [grid, score, bestScore, gameState, isAnimating, addRandomTile]);
  
  // 检查游戏状态（是否还有可移动的方块）
  const checkGameStatus = useCallback((currentGrid: number[][]) => {
    // 检查是否有空单元格
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (currentGrid[row][col] === 0) {
          return true;
        }
      }
    }
    
    // 检查是否有相邻的相同值方块
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const value = currentGrid[row][col];
        
        // 检查右侧
        if (col < GRID_SIZE - 1 && currentGrid[row][col + 1] === value) {
          return true;
        }
        
        // 检查下方
        if (row < GRID_SIZE - 1 && currentGrid[row + 1][col] === value) {
          return true;
        }
      }
    }
    
    return false;
  }, []);
  
  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          moveTiles(Direction.UP);
          break;
        case "ArrowDown":
          e.preventDefault();
          moveTiles(Direction.DOWN);
          break;
        case "ArrowLeft":
          e.preventDefault();
          moveTiles(Direction.LEFT);
          break;
        case "ArrowRight":
          e.preventDefault();
          moveTiles(Direction.RIGHT);
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveTiles]);
  
  // 处理触摸事件
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };
    
    const dx = touchEnd.x - touchStart.x;
    const dy = touchEnd.y - touchStart.y;
    
    // 确定滑动方向
    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平滑动
      if (dx > 0) {
        moveTiles(Direction.RIGHT);
      } else {
        moveTiles(Direction.LEFT);
      }
    } else {
      // 垂直滑动
      if (dy > 0) {
        moveTiles(Direction.DOWN);
      } else {
        moveTiles(Direction.UP);
      }
    }
    
    setTouchStart(null);
  };
  
  // 初始化游戏
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);
  
  // 获取方块背景颜色
  const getTileColor = (value: number) => {
    const colors: Record<number, string> = {
      0: "bg-gray-300/20",
      2: "bg-yellow-100 text-gray-700",
      4: "bg-yellow-200 text-gray-700",
      8: "bg-orange-300 text-white",
      16: "bg-orange-400 text-white",
      32: "bg-red-400 text-white",
      64: "bg-red-500 text-white",
      128: "bg-yellow-300 text-white",
      256: "bg-yellow-400 text-white",
      512: "bg-yellow-500 text-white",
      1024: "bg-yellow-600 text-white",
      2048: "bg-yellow-700 text-white",
    };
    
    return colors[value] || "bg-purple-600 text-white";
  };
  
  // 渲染游戏网格
  const renderGrid = () => {
    return (
      <div 
        className="relative bg-gray-400/30 rounded-lg p-2"
        style={{
          width: `${GRID_SIZE * cellSize + (GRID_SIZE + 1) * 8}px`,
          height: `${GRID_SIZE * cellSize + (GRID_SIZE + 1) * 8}px`,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 背景网格 */}
        <div className="absolute inset-0 grid gap-2 p-2" style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
        }}>
          {Array(GRID_SIZE * GRID_SIZE).fill(0).map((_, index) => (
            <div 
              key={`bg-${index}`} 
              className="bg-gray-300/20 rounded-md"
            />
          ))}
        </div>
        
        {/* 方块 */}
        {cells.map(cell => (
          <div
            key={cell.id}
            className={`absolute flex items-center justify-center rounded-md font-bold text-xl md:text-2xl transition-all duration-${ANIMATION_DURATION} ${getTileColor(cell.value)} ${cell.newTile ? "scale-90" : "scale-100"} ${cell.merged ? "animate-pulse" : ""}`}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              top: `${cell.row * (cellSize + 8) + 8}px`,
              left: `${cell.col * (cellSize + 8) + 8}px`,
              zIndex: cell.value,
            }}
          >
            {cell.value}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="text-center mb-6 w-full max-w-lg">
        <h1 className={title({ size: "lg", color: "yellow" })}>2048 游戏</h1>
        <div className={subtitle({ class: "mt-2 text-gray-300" })}>
          合并相同数字的方块，尝试达到2048！
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
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                  onPress={initializeGame}
                >
                  新游戏
                </Button>
              </div>
            </div>

            <div className="flex justify-center mb-6">
              {renderGrid()}
            </div>

            <div className="text-center text-gray-400 text-sm mb-4">
              <p>使用方向键或滑动来移动方块</p>
            </div>

            {(gameState === GameState.WON || gameState === GameState.LOST) && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-8 rounded-xl text-center max-w-md">
                  <h2 className="text-3xl font-bold mb-4 text-white">
                    {gameState === GameState.WON ? "恭喜你赢了！" : "游戏结束！"}
                  </h2>
                  <p className="text-xl mb-6 text-gray-300">
                    最终得分: <span className="font-bold text-yellow-400">{score}</span>
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button
                      variant="flat"
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                      onPress={initializeGame}
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
          <p>合并相同数字的方块，每次移动后会随机生成一个新的方块</p>
          <p>当两个相同数字的方块碰撞时，它们会合并成一个！</p>
        </div>
      </div>
    </section>
  );
}

// 添加ref支持
import { useRef } from "react";
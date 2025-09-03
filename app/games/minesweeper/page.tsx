"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import Link from "next/link";

// 游戏常量
const BOARD_SIZES = {
  easy: { width: 9, height: 9, mines: 10 },
  medium: { width: 16, height: 16, mines: 40 },
  hard: { width: 30, height: 16, mines: 99 }
};

const CELL_SIZE = 30;
const MOBILE_CELL_SIZE = 20;

// 单元格状态
enum CellState {
  HIDDEN = "hidden",
  REVEALED = "revealed",
  FLAGGED = "flagged"
}

// 游戏状态
enum GameState {
  READY = "ready",
  PLAYING = "playing",
  WON = "won",
  LOST = "lost"
}

// 难度类型
type Difficulty = "easy" | "medium" | "hard";

// 单元格接口
interface Cell {
  isMine: boolean;
  state: CellState;
  adjacentMines: number;
}

// 游戏板接口
interface Board {
  cells: Cell[][];
  width: number;
  height: number;
  mines: number;
}

export default function MinesweeperGame() {
  // 游戏状态
  const [board, setBoard] = useState<Board | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [gameState, setGameState] = useState<GameState>(GameState.READY);
  const [flags, setFlags] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);
  const [bestScores, setBestScores] = useState<Record<Difficulty, number>>({
    easy: 0,
    medium: 0,
    hard: 0
  });
  const [cellSize, setCellSize] = useState<number>(CELL_SIZE);
  
  // 布局相关
  const isMobile = useMobile();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 动态调整单元格大小
  useEffect(() => {
    setCellSize(isMobile ? MOBILE_CELL_SIZE : CELL_SIZE);
  }, [isMobile]);
  
  // 初始化游戏板
  const initializeBoard = useCallback((width: number, height: number, mines: number): Board => {
    // 创建空板
    const cells: Cell[][] = Array(height).fill(null).map(() => 
      Array(width).fill(null).map(() => ({
        isMine: false,
        state: CellState.HIDDEN,
        adjacentMines: 0
      }))
    );
    
    return { cells, width, height, mines };
  }, []);
  
  // 放置地雷
  const placeMines = useCallback((board: Board, excludeX: number, excludeY: number): Board => {
    const { cells, width, height, mines } = board;
    const newCells = cells.map(row => row.map(cell => ({ ...cell })));
    
    let minesPlaced = 0;
    
    while (minesPlaced < mines) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      
      // 确保第一次点击的位置及其周围没有地雷
      const isExcluded = 
        (x === excludeX && y === excludeY) ||
        (x >= excludeX - 1 && x <= excludeX + 1 && y >= excludeY - 1 && y <= excludeY + 1);
      
      if (!isExcluded && !newCells[y][x].isMine) {
        newCells[y][x].isMine = true;
        minesPlaced++;
        
        // 更新周围单元格的地雷计数
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              newCells[ny][nx].adjacentMines++;
            }
          }
        }
      }
    }
    
    return { ...board, cells: newCells };
  }, []);
  
  // 开始新游戏
  const startNewGame = useCallback(() => {
    const { width, height, mines } = BOARD_SIZES[difficulty];
    const newBoard = initializeBoard(width, height, mines);
    
    setBoard(newBoard);
    setGameState(GameState.READY);
    setFlags(0);
    setTimer(0);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [difficulty, initializeBoard]);
  
  // 改变难度
  const changeDifficulty = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
  }, []);
  
  // 计时器
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState]);
  
  // 初始化游戏
  useEffect(() => {
    startNewGame();
  }, [startNewGame]);
  
  // 揭示单元格
  const revealCell = useCallback((x: number, y: number) => {
    if (!board || gameState !== GameState.PLAYING && gameState !== GameState.READY) return;
    
    const cell = board.cells[y][x];
    
    // 如果单元格已经揭示或标记，则忽略
    if (cell.state !== CellState.HIDDEN) return;
    
    const newCells = board.cells.map(row => row.map(cell => ({ ...cell })));
    
    // 如果是第一次点击，放置地雷
    if (gameState === GameState.READY) {
      const newBoard = placeMines(board, x, y);
      setBoard(newBoard);
      setGameState(GameState.PLAYING);
      return revealCell(x, y);
    }
    
    // 如果点击到地雷，游戏结束
    if (cell.isMine) {
      newCells[y][x].state = CellState.REVEALED;
      
      // 揭示所有地雷
      for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
          if (newCells[y][x].isMine) {
            newCells[y][x].state = CellState.REVEALED;
          }
        }
      }
      
      setBoard({ ...board, cells: newCells });
      setGameState(GameState.LOST);
      return;
    }
    
    // 揭示单元格
    newCells[y][x].state = CellState.REVEALED;
    
    // 如果是空单元格（周围没有地雷），递归揭示周围的单元格
    if (cell.adjacentMines === 0) {
      const queue = [{ x, y }];
      const visited = new Set<string>();
      
      while (queue.length > 0) {
        const { x: cx, y: cy } = queue.shift()!;
        const key = `${cx},${cy}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = cx + dx;
            const ny = cy + dy;
            
            if (nx >= 0 && nx < board.width && ny >= 0 && ny < board.height) {
              const neighbor = newCells[ny][nx];
              
              if (neighbor.state === CellState.HIDDEN && !neighbor.isMine) {
                newCells[ny][nx].state = CellState.REVEALED;
                
                if (neighbor.adjacentMines === 0) {
                  queue.push({ x: nx, y: ny });
                }
              }
            }
          }
        }
      }
    }
    
    const newBoard = { ...board, cells: newCells };
    setBoard(newBoard);
    
    // 检查是否获胜
    let revealedCount = 0;
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        if (newCells[y][x].state === CellState.REVEALED) {
          revealedCount++;
        }
      }
    }
    
    if (revealedCount === board.width * board.height - board.mines) {
      setGameState(GameState.WON);
      
      // 更新最佳成绩
      if (bestScores[difficulty] === 0 || timer < bestScores[difficulty]) {
        const newBestScores = { ...bestScores, [difficulty]: timer };
        setBestScores(newBestScores);
        
        // 保存到本地存储
        if (typeof window !== 'undefined') {
          localStorage.setItem('minesweeper-best-scores', JSON.stringify(newBestScores));
        }
      }
    }
  }, [board, gameState, placeMines, bestScores, difficulty, timer]);
  
  // 标记单元格（插旗）
  const toggleFlag = useCallback((x: number, y: number) => {
    if (!board || gameState !== GameState.PLAYING && gameState !== GameState.READY) return;
    
    const cell = board.cells[y][x];
    
    // 如果单元格已经揭示，则忽略
    if (cell.state === CellState.REVEALED) return;
    
    const newCells = board.cells.map(row => row.map(cell => ({ ...cell })));
    
    // 切换标记状态
    if (cell.state === CellState.HIDDEN) {
      newCells[y][x].state = CellState.FLAGGED;
      setFlags(prev => prev + 1);
    } else if (cell.state === CellState.FLAGGED) {
      newCells[y][x].state = CellState.HIDDEN;
      setFlags(prev => prev - 1);
    }
    
    setBoard({ ...board, cells: newCells });
  }, [board, gameState]);
  
  // 渲染单元格
  const renderCell = (cell: Cell, x: number, y: number) => {
    let content = null;
    let bgColor = "bg-gray-700 hover:bg-gray-600";
    
    switch (cell.state) {
      case CellState.REVEALED:
        bgColor = "bg-gray-500";
        
        if (cell.isMine) {
          content = (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-3/4 h-3/4 bg-red-500 rounded-full"></div>
            </div>
          );
        } else if (cell.adjacentMines > 0) {
          // 根据周围地雷数量设置不同颜色
          const colors = [
            "text-blue-400",    // 1
            "text-green-400",   // 2
            "text-red-400",     // 3
            "text-purple-400",  // 4
            "text-yellow-400",  // 5
            "text-cyan-400",    // 6
            "text-black",       // 7
            "text-gray-300"     // 8
          ];
          
          content = (
            <div className={`w-full h-full flex items-center justify-center font-bold ${colors[cell.adjacentMines - 1]}`}>
              {cell.adjacentMines}
            </div>
          );
        }
        break;
        
      case CellState.FLAGGED:
        content = (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-red-500"></div>
          </div>
        );
        break;
    }
    
    return (
      <div
        key={`cell-${x}-${y}`}
        className={`${bgColor} border border-gray-600 rounded-sm transition-all duration-150 cursor-pointer flex items-center justify-center`}
        style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
        onClick={() => revealCell(x, y)}
        onContextMenu={(e) => {
          e.preventDefault();
          toggleFlag(x, y);
        }}
      >
        {content}
      </div>
    );
  };
  
  // 渲染游戏板
  const renderBoard = () => {
    if (!board) return null;
    
    return (
      <div 
        className="grid gap-px bg-gray-600 p-1 rounded-lg"
        style={{
          gridTemplateColumns: `repeat(${board.width}, 1fr)`,
          width: `${board.width * cellSize + board.width + 2}px`,
        }}
      >
        {board.cells.map((row, y) => 
          row.map((cell, x) => renderCell(cell, x, y))
        )}
      </div>
    );
  };
  
  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="text-center mb-6 w-full max-w-lg">
        <h1 className={title({ size: "lg", color: "blue" })}>扫雷</h1>
        <div className={subtitle({ class: "mt-2 text-gray-300" })}>
          找出所有地雷，避免踩到它们！
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <Card className="bg-gray-800/80 border-gray-700/50 shadow-2xl backdrop-blur-sm transition-all duration-300">
          <CardBody className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
              <div className="flex gap-4">
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">地雷</div>
                  <div className="text-2xl font-bold text-white">
                    {board ? board.mines - flags : 0}
                  </div>
                </div>
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">时间</div>
                  <div className="text-2xl font-bold text-white">
                    {formatTime(timer)}
                  </div>
                </div>
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">最佳</div>
                  <div className="text-2xl font-bold text-white">
                    {formatTime(bestScores[difficulty])}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="flat"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                  onPress={startNewGame}
                >
                  新游戏
                </Button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex justify-center">
                {renderBoard()}
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-white text-center mb-2 font-medium">难度选择</h3>
                  <div className="flex flex-col gap-2">
                    {Object.entries(BOARD_SIZES).map(([key, size]) => (
                      <Button
                        key={key}
                        variant="flat"
                        className={`${difficulty === key ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-700'} hover:opacity-90 text-white rounded-lg transition-all duration-300`}
                        onPress={() => changeDifficulty(key as Difficulty)}
                      >
                        {key === 'easy' ? '初级' : key === 'medium' ? '中级' : '高级'}
                        <span className="text-xs opacity-70 ml-2">
                          ({size.width}×{size.height}, {size.mines}雷)
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-white text-center mb-2 font-medium">操作说明</h3>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>左键点击：揭示单元格</li>
                    <li>右键点击：标记/取消标记</li>
                    <li>数字：周围地雷数量</li>
                    <li>🚩：标记为地雷</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="mt-4 text-center text-gray-500 text-sm">
          <p>左键点击揭示单元格，右键点击标记地雷</p>
          <p>数字表示周围8个单元格中的地雷数量</p>
          <p>揭示所有非地雷单元格即可获胜</p>
        </div>
      </div>
      
      {(gameState === GameState.WON || gameState === GameState.LOST) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl text-center max-w-md">
            <h2 className="text-3xl font-bold mb-4 text-white">
              {gameState === GameState.WON ? "恭喜获胜！" : "游戏结束！"}
            </h2>
            <p className="text-xl mb-2 text-gray-300">
              用时: <span className="font-bold text-blue-400">{formatTime(timer)}</span>
            </p>
            <p className="text-lg mb-6 text-gray-300">
              难度: <span className="font-bold text-purple-400">
                {difficulty === 'easy' ? '初级' : difficulty === 'medium' ? '中级' : '高级'}
              </span>
            </p>
            {gameState === GameState.WON && timer === bestScores[difficulty] && (
              <div className="bg-green-900/50 border border-green-500/30 rounded-lg p-3 mb-6">
                <p className="text-green-400 font-bold">新纪录！🎉</p>
              </div>
            )}
            <div className="flex justify-center gap-4">
              <Button
                variant="flat"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                onPress={startNewGame}
              >
                再来一局
              </Button>
              <Button
                as={Link}
                href="/games"
                variant="flat"
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                返回游戏列表
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
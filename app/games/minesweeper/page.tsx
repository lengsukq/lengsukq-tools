"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import { MobileControls } from "@/components/mobile-controls";
import Link from "next/link";

// 游戏常量
const DEFAULT_SIZE = { rows: 10, cols: 10, mines: 10 };
const DIFFICULTIES = {
  easy: { rows: 8, cols: 8, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 }
};

// 单元格类型
type CellState = 'hidden' | 'revealed' | 'flagged' | 'question' | 'exploded';
interface Cell {
  hasMine: boolean;
  adjacentMines: number;
  state: CellState;
  isFirstClick?: boolean;
}

// 游戏状态类型
type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export default function MinesweeperGame() {
  // 游戏状态
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [timer, setTimer] = useState<number>(0);
  const [minesLeft, setMinesLeft] = useState<number>(DIFFICULTIES.easy.mines);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [rows, setRows] = useState<number>(DIFFICULTIES.easy.rows);
  const [cols, setCols] = useState<number>(DIFFICULTIES.easy.cols);
  const [mines, setMines] = useState<number>(DIFFICULTIES.easy.mines);
  const [firstClick, setFirstClick] = useState<boolean>(true);
  const [revealAnimation, setRevealAnimation] = useState<Set<string>>(new Set());
  
  // 布局相关
  const isMobile = useMobile();
  const gameRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [cellSize, setCellSize] = useState<number>(32);
  const [boardSize, setBoardSize] = useState<{ width: number; height: number }>({
    width: cols * 32,
    height: rows * 32
  });

  // 动态调整游戏板大小
  useEffect(() => {
    const updateBoardSize = () => {
      if (isMobile) {
        const screenWidth = window.innerWidth;
        const maxWidth = Math.min(screenWidth - 32, 600);
        const newCellSize = Math.floor(maxWidth / cols);
        const newBoardSize = {
          width: newCellSize * cols,
          height: newCellSize * rows
        };
        setCellSize(newCellSize);
        setBoardSize(newBoardSize);
      } else {
        setCellSize(32);
        setBoardSize({ width: cols * 32, height: rows * 32 });
      }
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, [isMobile, rows, cols]);

  // 初始化游戏板
  const initializeBoard = useCallback(() => {
    const newBoard: Cell[][] = [];
    for (let y = 0; y < rows; y++) {
      newBoard[y] = [];
      for (let x = 0; x < cols; x++) {
        newBoard[y][x] = {
          hasMine: false,
          adjacentMines: 0,
          state: 'hidden'
        };
      }
    }
    return newBoard;
  }, [rows, cols]);

  // 放置地雷
  const placeMines = useCallback((board: Cell[][], firstClickX: number, firstClickY: number): Cell[][] => {
    const newBoard = board.map(row => [...row]);
    const placedMines = new Set<string>();
    
    // 排除第一次点击的位置及其周围3x3区域
    const excludeArea = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = firstClickX + dx;
        const ny = firstClickY + dy;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
          excludeArea.add(`${nx},${ny}`);
        }
      }
    }
    
    // 随机放置地雷
    while (placedMines.size < mines) {
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      const key = `${x},${y}`;
      
      if (!excludeArea.has(key) && !placedMines.has(key)) {
        newBoard[y][x].hasMine = true;
        placedMines.add(key);
      }
    }
    
    return newBoard;
  }, [cols, rows, mines]);

  // 计算相邻地雷数
  const calculateAdjacentMines = useCallback((board: Cell[][]): Cell[][] => {
    const newBoard = board.map(row => [...row]);
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!newBoard[y][x].hasMine) {
          let count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && newBoard[ny][nx].hasMine) {
                count++;
              }
            }
          }
          newBoard[y][x].adjacentMines = count;
        }
      }
    }
    
    return newBoard;
  }, [rows, cols]);

  // 重置游戏
  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setBoard(initializeBoard());
    setGameStatus('idle');
    setTimer(0);
    setMinesLeft(mines);
    setFirstClick(true);
    setRevealAnimation(new Set());
  }, [initializeBoard, mines]);

  // 更改难度
  const changeDifficulty = useCallback((newDifficulty: 'easy' | 'medium' | 'hard') => {
    setDifficulty(newDifficulty);
    setRows(DIFFICULTIES[newDifficulty].rows);
    setCols(DIFFICULTIES[newDifficulty].cols);
    setMines(DIFFICULTIES[newDifficulty].mines);
    resetGame();
  }, [resetGame]);

  // 开始游戏计时器
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  }, []);

  // 停止游戏计时器
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 检查游戏是否胜利
  const checkWin = useCallback((board: Cell[][]): boolean => {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!board[y][x].hasMine && board[y][x].state === 'hidden') {
          return false;
        }
      }
    }
    return true;
  }, [rows, cols]);

  // 递归揭示空白单元格
  const revealEmptyCells = useCallback((board: Cell[][], x: number, y: number): Cell[][] => {
    const newBoard = board.map(row => [...row]);
    const queue: [number, number][] = [[x, y]];
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const [currentX, currentY] = queue.shift()!;
      const key = `${currentX},${currentY}`;
      
      if (
        currentX < 0 || currentX >= cols || 
        currentY < 0 || currentY >= rows || 
        visited.has(key) || 
        newBoard[currentY][currentX].state !== 'hidden'
      ) {
        continue;
      }
      
      visited.add(key);
      newBoard[currentY][currentX].state = 'revealed';
      
      // 添加到动画队列
      setRevealAnimation(prev => new Set(prev).add(key));
      
      // 如果周围没有地雷，继续揭示相邻的单元格
      if (newBoard[currentY][currentX].adjacentMines === 0 && !newBoard[currentY][currentX].hasMine) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx !== 0 || dy !== 0) {
              queue.push([currentX + dx, currentY + dy]);
            }
          }
        }
      }
    }
    
    return newBoard;
  }, [cols, rows]);

  // 揭示所有地雷
  const revealAllMines = useCallback((board: Cell[][], explodedX?: number, explodedY?: number): Cell[][] => {
    const newBoard = board.map(row => [...row]);
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (newBoard[y][x].hasMine) {
          if (x === explodedX && y === explodedY) {
            newBoard[y][x].state = 'exploded';
          } else if (newBoard[y][x].state !== 'flagged') {
            newBoard[y][x].state = 'revealed';
          }
        } else if (newBoard[y][x].state === 'flagged') {
          // 错误标记的单元格
          newBoard[y][x].state = 'question';
        }
      }
    }
    
    return newBoard;
  }, [rows, cols]);

  // 处理单元格点击
  const handleCellClick = useCallback((x: number, y: number) => {
    // 游戏已经结束或已标记的单元格，不处理
    if (gameStatus === 'won' || gameStatus === 'lost' || board[y][x].state === 'flagged') {
      return;
    }
    
    let newBoard = [...board];
    
    // 第一次点击
    if (firstClick) {
      // 放置地雷（排除第一次点击位置）
      newBoard = placeMines(newBoard, x, y);
      // 计算相邻地雷数
      newBoard = calculateAdjacentMines(newBoard);
      // 标记第一次点击
      newBoard[y][x].isFirstClick = true;
      setFirstClick(false);
      setGameStatus('playing');
      startTimer();
    }
    
    // 如果点击的是地雷，游戏结束
    if (newBoard[y][x].hasMine) {
      newBoard = revealAllMines(newBoard, x, y);
      setBoard(newBoard);
      setGameStatus('lost');
      stopTimer();
      return;
    }
    
    // 如果点击的是有数字的单元格，直接揭示
    if (newBoard[y][x].adjacentMines > 0 && newBoard[y][x].state === 'hidden') {
      const updatedBoard = newBoard.map(row => [...row]);
      updatedBoard[y][x].state = 'revealed';
      setBoard(updatedBoard);
      
      // 检查是否胜利
      if (checkWin(updatedBoard)) {
        setGameStatus('won');
        stopTimer();
      }
      return;
    }
    
    // 揭示空白单元格和其周围的单元格
    newBoard = revealEmptyCells(newBoard, x, y);
    setBoard(newBoard);
    
    // 检查是否胜利
    if (checkWin(newBoard)) {
      setGameStatus('won');
      stopTimer();
    }
  }, [board, gameStatus, firstClick, placeMines, calculateAdjacentMines, startTimer, revealAllMines, revealEmptyCells, checkWin, stopTimer]);

  // 处理右键标记
  const handleCellRightClick = useCallback((e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    
    // 游戏已经结束或已揭示的单元格，不处理
    if (gameStatus === 'won' || gameStatus === 'lost' || board[y][x].state === 'revealed') {
      return;
    }
    
    // 第一次右键点击也开始游戏
    if (firstClick) {
      let newBoard = [...board];
      // 放置地雷（排除当前点击位置）
      newBoard = placeMines(newBoard, x, y);
      // 计算相邻地雷数
      newBoard = calculateAdjacentMines(newBoard);
      setBoard(newBoard);
      setFirstClick(false);
      setGameStatus('playing');
      startTimer();
      return;
    }
    
    const newBoard = board.map(row => [...row]);
    
    // 循环切换状态：hidden -> flagged -> question -> hidden
    switch (newBoard[y][x].state) {
      case 'hidden':
        newBoard[y][x].state = 'flagged';
        setMinesLeft(prev => Math.max(0, prev - 1));
        break;
      case 'flagged':
        newBoard[y][x].state = 'question';
        setMinesLeft(prev => prev + 1);
        break;
      case 'question':
        newBoard[y][x].state = 'hidden';
        break;
    }
    
    setBoard(newBoard);
    
    // 检查是否胜利
    if (checkWin(newBoard)) {
      setGameStatus('won');
      stopTimer();
    }
  }, [board, gameStatus, firstClick, placeMines, calculateAdjacentMines, startTimer, checkWin, stopTimer]);

  // 处理双击已揭示单元格（快速揭示周围未标记的单元格）
  const handleCellDoubleClick = useCallback((x: number, y: number) => {
    if (gameStatus !== 'playing' || board[y][x].state !== 'revealed' || board[y][x].adjacentMines === 0) {
      return;
    }
    
    // 计算周围已标记的地雷数量
    let flaggedCount = 0;
    const adjacentCells: [number, number][] = [];
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
          if (board[ny][nx].state === 'flagged') {
            flaggedCount++;
          } else if (board[ny][nx].state === 'hidden') {
            adjacentCells.push([nx, ny]);
          }
        }
      }
    }
    
    // 如果周围标记的地雷数量等于实际地雷数量，揭示周围未标记的单元格
    if (flaggedCount === board[y][x].adjacentMines) {
      let newBoard = board.map(row => [...row]);
      let hitMine = false;
      
      // 检查是否点击到地雷
      for (const [nx, ny] of adjacentCells) {
        if (newBoard[ny][nx].hasMine) {
          hitMine = true;
          break;
        }
      }
      
      if (hitMine) {
        // 点击到地雷，游戏结束
        newBoard = revealAllMines(newBoard);
        setBoard(newBoard);
        setGameStatus('lost');
        stopTimer();
      } else {
        // 没有点击到地雷，揭示周围单元格
        for (const [nx, ny] of adjacentCells) {
          if (newBoard[ny][nx].adjacentMines === 0) {
            newBoard = revealEmptyCells(newBoard, nx, ny);
          } else {
            newBoard[ny][nx].state = 'revealed';
            setRevealAnimation(prev => new Set(prev).add(`${nx},${ny}`));
          }
        }
        
        setBoard(newBoard);
        
        // 检查是否胜利
        if (checkWin(newBoard)) {
          setGameStatus('won');
          stopTimer();
        }
      }
    }
  }, [board, gameStatus, cols, rows, revealAllMines, revealEmptyCells, checkWin, stopTimer]);

  // 清理动画队列
  useEffect(() => {
    if (revealAnimation.size > 0) {
      const timer = setTimeout(() => {
        setRevealAnimation(new Set());
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [revealAnimation]);

  // 初始化游戏
  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 获取单元格颜色
  const getCellColor = (adjacentMines: number): string => {
    const colors: Record<number, string> = {
      1: 'text-blue-500',
      2: 'text-green-500',
      3: 'text-red-500',
      4: 'text-purple-500',
      5: 'text-amber-600',
      6: 'text-cyan-500',
      7: 'text-pink-500',
      8: 'text-gray-500'
    };
    return colors[adjacentMines] || 'text-gray-300';
  };

  // 渲染游戏板
  const renderBoard = () => {
    return (
      <div 
        className="grid gap-px bg-gray-600/50 rounded-lg overflow-hidden"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          width: `${boardSize.width}px`,
          height: `${boardSize.height}px`
        }}
      >
        {board.map((row, y) =>
          row.map((cell, x) => {
            const isAnimating = revealAnimation.has(`${x},${y}`);
            let cellContent = '';
            let cellClassName = '';
            let emoji = '';
            
            switch (cell.state) {
              case 'hidden':
                cellClassName = 'bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-300 hover:to-gray-400 cursor-pointer active:from-gray-500 active:to-gray-600';
                break;
              case 'revealed':
                cellClassName = 'bg-gray-200';
                if (cell.hasMine) {
                  emoji = '💣';
                } else if (cell.adjacentMines > 0) {
                  cellContent = cell.adjacentMines.toString();
                }
                break;
              case 'flagged':
                cellClassName = 'bg-gradient-to-br from-yellow-400 to-amber-500 cursor-pointer';
                emoji = '🚩';
                break;
              case 'question':
                cellClassName = 'bg-gradient-to-br from-blue-400 to-blue-500 cursor-pointer';
                emoji = '❓';
                break;
              case 'exploded':
                cellClassName = 'bg-gradient-to-br from-red-500 to-red-600';
                emoji = '💥';
                break;
            }
            
            return (
              <div
                key={`${x}-${y}`}
                className={`flex items-center justify-center font-bold text-xl ${cellClassName} transition-all duration-150 ease-out relative ${cell.state === 'revealed' && cell.adjacentMines > 0 ? getCellColor(cell.adjacentMines) : ''} ${isAnimating ? 'animate-pulse scale-95' : ''}`}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  fontSize: cell.adjacentMines > 0 ? `${Math.max(12, cellSize * 0.5)}px` : 'inherit',
                  lineHeight: '1',
                  userSelect: 'none',
                  minWidth: `${cellSize}px`
                }}
                onClick={() => handleCellClick(x, y)}
                onContextMenu={(e) => handleCellRightClick(e, x, y)}
                onDoubleClick={() => handleCellDoubleClick(x, y)}
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    handleCellClick(x, y);
                  } else if (e.key === 'f' || e.key === 'F') {
                    handleCellRightClick(e as any, x, y);
                  }
                }}
              >
                {emoji || cellContent}
                {cell.isFirstClick && (
                  <div className="absolute inset-0 bg-blue-300/30 rounded-sm" />
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  // 渲染游戏状态栏
  const renderStatusBar = () => {
    const getFaceEmoji = () => {
      switch (gameStatus) {
        case 'idle':
          return '😊';
        case 'playing':
          return '😐';
        case 'won':
          return '😎';
        case 'lost':
          return '😵';
        default:
          return '😊';
      }
    };

    return (
      <div className="flex items-center justify-between gap-4 mb-4 bg-gray-700/50 p-3 rounded-lg">
        <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-2 rounded-lg">
          <span className="text-lg">💣</span>
          <span className="text-xl font-bold text-white">{minesLeft}</span>
        </div>
        
        <Button
          variant="flat"
          className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 p-2 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95"
          onPress={resetGame}
          style={{ width: '50px', height: '50px', minWidth: '50px' }}
        >
          <span className="text-2xl">{getFaceEmoji()}</span>
        </Button>
        
        <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-2 rounded-lg">
          <span className="text-lg">⏱️</span>
          <span className="text-xl font-bold text-white">{timer}</span>
        </div>
      </div>
    );
  };

  // 渲染难度选择
  const renderDifficultySelector = () => {
    return (
      <div className="flex gap-2 mb-4 flex-wrap justify-center">
        <Button
          variant="flat"
          className={`${difficulty === 'easy' ? 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' : 'from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'} text-white rounded-lg transition-all duration-300`}
          onPress={() => changeDifficulty('easy')}
        >
          简单 (8×8)
        </Button>
        <Button
          variant="flat"
          className={`${difficulty === 'medium' ? 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' : 'from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'} text-white rounded-lg transition-all duration-300`}
          onPress={() => changeDifficulty('medium')}
        >
          中等 (16×16)
        </Button>
        <Button
          variant="flat"
          className={`${difficulty === 'hard' ? 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'} text-white rounded-lg transition-all duration-300`}
          onPress={() => changeDifficulty('hard')}
        >
          困难 (16×30)
        </Button>
      </div>
    );
  };

  // 渲染操作说明
  const renderInstructions = () => {
    return (
      <div className="bg-gray-700/50 rounded-lg p-3 text-center text-xs text-gray-300 mt-4">
        <div className="font-medium mb-1 text-gray-200">操作说明</div>
        <div>左键点击揭示单元格</div>
        <div>右键点击标记地雷</div>
        <div>双击已揭示的数字单元格快速揭示周围</div>
        {isMobile && <div>在移动设备上，可以使用下方的控制按钮</div>}
      </div>
    );
  };

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-6 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="text-center mb-6 w-full max-w-md">
        <h1 className={title({ size: "lg", color: "blue" })}>扫雷</h1>
        <div className={subtitle({ class: "mt-2 text-gray-300" })}>
          揭示所有没有地雷的单元格，避开所有地雷！
        </div>
      </div>

      <Card className="bg-gray-800/80 border-gray-700/50 shadow-2xl backdrop-blur-sm transition-all duration-300 max-w-4xl w-full mx-auto">
        <CardBody className="p-4 md:p-6 relative">
          {/* 游戏状态栏 */}
          {renderStatusBar()}
          
          {/* 难度选择 */}
          {renderDifficultySelector()}

          {/* 游戏板 */}
          <div className="flex justify-center mb-4">
            <div 
              ref={gameRef}
              className="p-4 bg-gray-700/30 rounded-xl shadow-inner"
              style={{ 
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {renderBoard()}
            </div>
          </div>

          {/* 操作说明 */}
          {renderInstructions()}

          {/* 游戏状态覆盖层 */}
          {(gameStatus === 'won' || gameStatus === 'lost') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
              <Card className="bg-gray-800/95 border-gray-600 shadow-2xl max-w-md w-full mx-4">
                <CardBody className="p-6 text-center">
                  <h2 className={`text-2xl font-bold mb-2 ${gameStatus === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                    {gameStatus === 'won' ? '恭喜你赢了！' : '游戏结束！'}
                  </h2>
                  <p className="text-gray-300 mb-4">
                    {gameStatus === 'won' 
                      ? `你用了 ${timer} 秒完成了游戏！` 
                      : '你踩到地雷了！'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      variant="flat"
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-300"
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
        </CardBody>
      </Card>

      {/* 移动端控制 */}
      {isMobile && (
        <MobileControls
          className="mt-4"
          onDirection={(dir) => {
            // 这里可以添加方向控制逻辑
          }}
          variant="game"
          cellSize={cellSize * 2}
        />
      )}
    </section>
  );
}
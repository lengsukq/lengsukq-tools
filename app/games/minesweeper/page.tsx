"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import Link from "next/link";

// 游戏常量
const BOARD_SIZES = [
  { name: "初级", rows: 9, cols: 9, mines: 10 },
  { name: "中级", rows: 16, cols: 16, mines: 40 },
  { name: "高级", rows: 16, cols: 30, mines: 99 }
];

const ANIMATION_DURATION = 200;
const CELL_SIZE = 30;
const MOBILE_CELL_SIZE = 25;

// 单元格状态
enum CellState {
  HIDDEN = "hidden",
  REVEALED = "revealed",
  FLAGGED = "flagged"
}

// 单元格内容
enum CellContent {
  EMPTY = 0,
  MINE = -1,
  NUMBER_1 = 1,
  NUMBER_2 = 2,
  NUMBER_3 = 3,
  NUMBER_4 = 4,
  NUMBER_5 = 5,
  NUMBER_6 = 6,
  NUMBER_7 = 7,
  NUMBER_8 = 8
}

// 单元格接口
interface Cell {
  id: number;
  row: number;
  col: number;
  state: CellState;
  content: CellContent;
  isMine: boolean;
  adjacentMines: number;
}

// 游戏状态
enum GameState {
  READY = "ready",
  PLAYING = "playing",
  WON = "won",
  LOST = "lost"
}

export default function MinesweeperGame() {
  // 游戏状态
  const [board, setBoard] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<GameState>(GameState.READY);
  const [difficulty, setDifficulty] = useState<number>(0); // 0: 初级, 1: 中级, 2: 高级
  const [flagsCount, setFlagsCount] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);
  const [gameBoardSize, setGameBoardSize] = useState<{ width: number; height: number }>({ width: 270, height: 270 });
  const [cellSize, setCellSize] = useState<number>(CELL_SIZE);
  const [theme, setTheme] = useState<'blue' | 'green' | 'purple' | 'red'>('blue');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  
  // 布局相关
  const isMobile = useMobile();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextId = useRef<number>(1);
  
  // 颜色主题
  const colorThemes = {
    blue: {
      hidden: 'bg-gradient-to-br from-blue-600 to-blue-700',
      revealed: 'bg-gradient-to-br from-blue-200 to-blue-300',
      mine: 'bg-gradient-to-br from-red-500 to-red-600',
      flag: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      border: 'border-blue-500/30',
      accent: 'from-blue-500 to-blue-600',
      numbers: [
        '', // 0
        'text-blue-600', // 1
        'text-green-600', // 2
        'text-red-600', // 3
        'text-purple-600', // 4
        'text-yellow-600', // 5
        'text-cyan-600', // 6
        'text-black', // 7
        'text-gray-600' // 8
      ]
    },
    green: {
      hidden: 'bg-gradient-to-br from-green-600 to-green-700',
      revealed: 'bg-gradient-to-br from-green-200 to-green-300',
      mine: 'bg-gradient-to-br from-red-500 to-red-600',
      flag: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      border: 'border-green-500/30',
      accent: 'from-green-500 to-green-600',
      numbers: [
        '', // 0
        'text-blue-600', // 1
        'text-green-600', // 2
        'text-red-600', // 3
        'text-purple-600', // 4
        'text-yellow-600', // 5
        'text-cyan-600', // 6
        'text-black', // 7
        'text-gray-600' // 8
      ]
    },
    purple: {
      hidden: 'bg-gradient-to-br from-purple-600 to-purple-700',
      revealed: 'bg-gradient-to-br from-purple-200 to-purple-300',
      mine: 'bg-gradient-to-br from-red-500 to-red-600',
      flag: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      border: 'border-purple-500/30',
      accent: 'from-purple-500 to-purple-600',
      numbers: [
        '', // 0
        'text-blue-600', // 1
        'text-green-600', // 2
        'text-red-600', // 3
        'text-purple-600', // 4
        'text-yellow-600', // 5
        'text-cyan-600', // 6
        'text-black', // 7
        'text-gray-600' // 8
      ]
    },
    red: {
      hidden: 'bg-gradient-to-br from-red-600 to-red-700',
      revealed: 'bg-gradient-to-br from-red-200 to-red-300',
      mine: 'bg-gradient-to-br from-gray-700 to-gray-800',
      flag: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      border: 'border-red-500/30',
      accent: 'from-red-500 to-red-600',
      numbers: [
        '', // 0
        'text-blue-600', // 1
        'text-green-600', // 2
        'text-red-600', // 3
        'text-purple-600', // 4
        'text-yellow-600', // 5
        'text-cyan-600', // 6
        'text-black', // 7
        'text-gray-600' // 8
      ]
    }
  };

  // 动态调整游戏板大小
  useEffect(() => {
    const updateBoardSize = () => {
      const currentDifficulty = BOARD_SIZES[difficulty];
      const newCellSize = isMobile ? MOBILE_CELL_SIZE : CELL_SIZE;
      
      setCellSize(newCellSize);
      setGameBoardSize({
        width: currentDifficulty.cols * newCellSize,
        height: currentDifficulty.rows * newCellSize
      });
    };

    updateBoardSize();
  }, [difficulty, isMobile]);

  // 初始化游戏板
  const initializeBoard = useCallback((firstClickRow: number, firstClickCol: number): Cell[][] => {
    const { rows, cols, mines } = BOARD_SIZES[difficulty];
    const newBoard: Cell[][] = [];
    
    // 创建空板
    for (let row = 0; row < rows; row++) {
      const rowCells: Cell[] = [];
      for (let col = 0; col < cols; col++) {
        rowCells.push({
          id: nextId.current++,
          row,
          col,
          state: CellState.HIDDEN,
          content: CellContent.EMPTY,
          isMine: false,
          adjacentMines: 0
        });
      }
      newBoard.push(rowCells);
    }
    
    // 放置地雷（避开第一次点击的位置及其周围）
    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      
      // 确保不在第一次点击位置及其周围放置地雷
      const isFirstClickArea = Math.abs(row - firstClickRow) <= 1 && Math.abs(col - firstClickCol) <= 1;
      
      if (!newBoard[row][col].isMine && !isFirstClickArea) {
        newBoard[row][col].isMine = true;
        newBoard[row][col].content = CellContent.MINE;
        minesPlaced++;
        
        // 更新周围单元格的地雷计数
        for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
          for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
            if (!(r === row && c === col)) {
              newBoard[r][c].adjacentMines++;
              if (newBoard[r][c].adjacentMines > 0) {
                newBoard[r][c].content = newBoard[r][c].adjacentMines as CellContent;
              }
            }
          }
        }
      }
    }
    
    return newBoard;
  }, [difficulty]);

  // 重置游戏
  const resetGame = useCallback(() => {
    setGameState(GameState.READY);
    setTimer(0);
    setFlagsCount(0);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // 初始化一个空板，等待第一次点击
    const { rows, cols } = BOARD_SIZES[difficulty];
    const emptyBoard: Cell[][] = [];
    
    for (let row = 0; row < rows; row++) {
      const rowCells: Cell[] = [];
      for (let col = 0; col < cols; col++) {
        rowCells.push({
          id: nextId.current++,
          row,
          col,
          state: CellState.HIDDEN,
          content: CellContent.EMPTY,
          isMine: false,
          adjacentMines: 0
        });
      }
      emptyBoard.push(rowCells);
    }
    
    setBoard(emptyBoard);
  }, [difficulty]);

  // 开始计时器
  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  }, []);

  // 停止计时器
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 揭示单元格
  const revealCell = useCallback((row: number, col: number) => {
    if (gameState === GameState.WON || gameState === GameState.LOST) return;
    if (board[row][col].state !== CellState.HIDDEN) return;
    
    setIsAnimating(true);
    
    // 如果是第一次点击，初始化游戏板
    if (gameState === GameState.READY) {
      const newBoard = initializeBoard(row, col);
      setBoard(newBoard);
      setGameState(GameState.PLAYING);
      startTimer();
      
      // 直接揭示点击的单元格，不使用递归调用
      const cell = newBoard[row][col];
      cell.state = CellState.REVEALED;
      
      // 如果是空单元格，递归揭示周围的单元格
      if (cell.content === CellContent.EMPTY) {
        const { rows, cols } = BOARD_SIZES[difficulty];
        
        const revealAdjacent = (r: number, c: number) => {
          if (r < 0 || r >= rows || c < 0 || c >= cols) return;
          if (newBoard[r][c].state !== CellState.HIDDEN) return;
          
          newBoard[r][c].state = CellState.REVEALED;
          
          if (newBoard[r][c].content === CellContent.EMPTY) {
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                revealAdjacent(r + dr, c + dc);
              }
            }
          }
        };
        
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            revealAdjacent(row + dr, col + dc);
          }
        }
      }
      
      setBoard(newBoard);
      setIsAnimating(false);
      return;
    }
    
    const newBoard = [...board];
    const cell = newBoard[row][col];
    
    // 如果是地雷，游戏结束
    if (cell.isMine) {
      cell.state = CellState.REVEALED;
      setBoard(newBoard);
      setGameState(GameState.LOST);
      stopTimer();
      
      // 显示所有地雷
      setTimeout(() => {
        const finalBoard = [...newBoard];
        for (let r = 0; r < finalBoard.length; r++) {
          for (let c = 0; c < finalBoard[r].length; c++) {
            if (finalBoard[r][c].isMine) {
              finalBoard[r][c].state = CellState.REVEALED;
            }
          }
        }
        setBoard(finalBoard);
      }, 500);
      
      setIsAnimating(false);
      return;
    }
    
    // 揭示单元格
    cell.state = CellState.REVEALED;
    
    // 如果是空单元格，递归揭示周围的单元格
    if (cell.content === CellContent.EMPTY) {
      const { rows, cols } = BOARD_SIZES[difficulty];
      
      const revealAdjacent = (r: number, c: number) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return;
        if (newBoard[r][c].state !== CellState.HIDDEN) return;
        
        newBoard[r][c].state = CellState.REVEALED;
        
        if (newBoard[r][c].content === CellContent.EMPTY) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              revealAdjacent(r + dr, c + dc);
            }
          }
        }
      };
      
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          revealAdjacent(row + dr, col + dc);
        }
      }
    }
    
    setBoard(newBoard);
    
    // 检查是否获胜
    const { mines } = BOARD_SIZES[difficulty];
    let revealedCount = 0;
    
    for (let r = 0; r < newBoard.length; r++) {
      for (let c = 0; c < newBoard[r].length; c++) {
        if (newBoard[r][c].state === CellState.REVEALED && !newBoard[r][c].isMine) {
          revealedCount++;
        }
      }
    }
    
    const totalCells = BOARD_SIZES[difficulty].rows * BOARD_SIZES[difficulty].cols;
    if (revealedCount === totalCells - mines) {
      setGameState(GameState.WON);
      stopTimer();
      
      // 自动标记所有地雷
      setTimeout(() => {
        const finalBoard = [...newBoard];
        for (let r = 0; r < finalBoard.length; r++) {
          for (let c = 0; c < finalBoard[r].length; c++) {
            if (finalBoard[r][c].isMine && finalBoard[r][c].state === CellState.HIDDEN) {
              finalBoard[r][c].state = CellState.FLAGGED;
            }
          }
        }
        setBoard(finalBoard);
      }, 500);
    }
    
    setIsAnimating(false);
  }, [board, gameState, difficulty, initializeBoard, startTimer, stopTimer]);

  // 标记单元格（插旗）
  const toggleFlag = useCallback((row: number, col: number) => {
    if (gameState === GameState.WON || gameState === GameState.LOST) return;
    if (board[row][col].state === CellState.REVEALED) return;
    
    const newBoard = [...board];
    const cell = newBoard[row][col];
    
    if (cell.state === CellState.HIDDEN) {
      cell.state = CellState.FLAGGED;
      setFlagsCount(prev => prev + 1);
    } else if (cell.state === CellState.FLAGGED) {
      cell.state = CellState.HIDDEN;
      setFlagsCount(prev => prev - 1);
    }
    
    setBoard(newBoard);
  }, [board, gameState]);

  // 处理单元格点击
  const handleCellClick = useCallback((row: number, col: number) => {
    if (isAnimating) return;
    revealCell(row, col);
  }, [revealCell, isAnimating]);

  // 处理单元格右键点击
  const handleCellRightClick = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    if (isAnimating) return;
    toggleFlag(row, col);
  }, [toggleFlag, isAnimating]);

  // 处理单元格长按（移动端）
  const handleCellLongPress = useCallback((row: number, col: number) => {
    if (isAnimating) return;
    toggleFlag(row, col);
  }, [toggleFlag, isAnimating]);

  // 更改难度
  const changeDifficulty = useCallback((newDifficulty: number) => {
    if (gameState === GameState.PLAYING) {
      if (!confirm('确定要更改难度吗？当前游戏进度将会丢失。')) {
        return;
      }
    }
    
    setDifficulty(newDifficulty);
    resetGame();
    
    // 更改主题
    const themes: Array<'blue' | 'green' | 'purple' | 'red'> = ['blue', 'green', 'purple', 'red'];
    setTheme(themes[newDifficulty % themes.length]);
  }, [gameState, resetGame]);

  // 初始化游戏
  useEffect(() => {
    resetGame();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [resetGame]);
  
  // 确保游戏板正确初始化
  useEffect(() => {
    if (board.length === 0) {
      resetGame();
    }
  }, [board, resetGame]);

  // 格式化时间
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 渲染游戏板
  const renderBoard = () => {
    return (
      <div 
        className="grid gap-px bg-gray-600/30 p-1 rounded-lg border-2 border-gray-600/30"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZES[difficulty].cols}, ${cellSize}px)`,
          width: `${gameBoardSize.width + 16}px`,
        }}
      >
        {board.map((row, rowIndex) => (
          row.map((cell, colIndex) => (
            <div
              key={cell.id}
              className={`relative flex items-center justify-center rounded-sm transition-all duration-${ANIMATION_DURATION} cursor-pointer ${
                cell.state === CellState.HIDDEN 
                  ? `${colorThemes[theme].hidden} shadow-md hover:shadow-lg transform hover:scale-105` 
                  : cell.state === CellState.REVEALED 
                    ? `${colorThemes[theme].revealed} shadow-inner` 
                    : `${colorThemes[theme].flag} shadow-md`
              } ${cell.state === CellState.REVEALED && cell.isMine ? colorThemes[theme].mine : ''}`}
              style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
              onClick={() => handleCellClick(rowIndex, colIndex)}
              onContextMenu={(e) => handleCellRightClick(e, rowIndex, colIndex)}
              onTouchStart={() => {
                // 长按处理
                const longPressTimer = setTimeout(() => {
                  handleCellLongPress(rowIndex, colIndex);
                }, 500);
                
                const handleTouchEnd = () => {
                  clearTimeout(longPressTimer);
                  document.removeEventListener('touchend', handleTouchEnd);
                };
                
                document.addEventListener('touchend', handleTouchEnd);
              }}
            >
              {cell.state === CellState.REVEALED && (
                <>
                  {cell.isMine ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="black">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                      </svg>
                    </div>
                  ) : cell.content > 0 ? (
                    <span className={`font-bold ${colorThemes[theme].numbers[cell.content]}`}>
                      {cell.content}
                    </span>
                  ) : null}
                </>
              )}
              
              {cell.state === CellState.FLAGGED && (
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
                  </svg>
                </div>
              )}
            </div>
          ))
        ))}
      </div>
    );
  };

  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="text-center mb-6 w-full max-w-lg">
        <h1 className={title({ size: "lg", color: "blue" })}>扫雷游戏</h1>
        <div className={subtitle({ class: "mt-2 text-gray-300" })}>
          找出所有地雷，但不要踩到它们！使用数字提示周围地雷的数量。
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <Card className="bg-gray-800/80 border-gray-700/50 shadow-2xl backdrop-blur-sm transition-all duration-300">
          <CardBody className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
              <div className="flex gap-4">
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">剩余地雷</div>
                  <div className="text-2xl font-bold text-white">
                    {BOARD_SIZES[difficulty].mines - flagsCount}
                  </div>
                </div>
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">用时</div>
                  <div className="text-2xl font-bold text-white">
                    {formatTime(timer)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="flat"
                  className={`bg-gradient-to-r ${colorThemes[theme].accent} hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105`}
                  onPress={resetGame}
                >
                  新游戏
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {BOARD_SIZES.map((size, index) => (
                <Button
                  key={index}
                  variant={difficulty === index ? "solid" : "flat"}
                  className={`transition-all duration-300 ${
                    difficulty === index 
                      ? `bg-gradient-to-r ${colorThemes[theme].accent} text-white` 
                      : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600'
                  }`}
                  onPress={() => changeDifficulty(index)}
                >
                  {size.name}
                </Button>
              ))}
            </div>

            <div className="flex justify-center mb-4">
              {renderBoard()}
            </div>
            
            <div className="text-center text-gray-400 text-sm mt-4">
              <p>左键点击: 揭示单元格 | 右键点击: 标记地雷</p>
              {isMobile && <p className="mt-1">移动端: 点击揭示 | 长按标记地雷</p>}
            </div>
          </CardBody>
        </Card>

        {/* 游戏结束覆盖层 */}
        {(gameState === GameState.WON || gameState === GameState.LOST) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
            <Card className="bg-gray-800/95 border-gray-600 shadow-2xl max-w-md w-full mx-4">
              <CardBody className="p-6 text-center">
                <h2 className={`text-2xl font-bold mb-2 ${
                  gameState === GameState.WON ? 'text-green-400' : 'text-red-400'
                }`}>
                  {gameState === GameState.WON ? '恭喜你赢了！' : '游戏结束！'}
                </h2>
                <p className="text-gray-300 mb-2">
                  {gameState === GameState.WON 
                    ? '你成功找到了所有地雷！' 
                    : '你踩到了地雷！'}
                </p>
                <p className="text-gray-300 mb-6">
                  用时: <span className="text-yellow-400 font-bold">{formatTime(timer)}</span>
                </p>
                {gameState === GameState.WON && (
                  <div className="bg-green-900/50 border border-green-500/30 rounded-lg p-3 mb-6 animate-pulse">
                    <p className="text-green-400 font-bold">胜利！🎉</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="flat"
                    className={`bg-gradient-to-r ${colorThemes[theme].accent} hover:opacity-90 text-white rounded-lg transition-all duration-300`}
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
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import { MobileControls } from "@/components/mobile-controls";
import Link from "next/link";

// 游戏常量
const BOARD_SIZE = 4;
const WINNING_VALUE = 2048;
const ANIMATION_DURATION = 150;

// 瓦片接口
interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  isNew?: boolean;
  isMerged?: boolean;
  mergedFrom?: { row: number; col: number }[];
  animate?: 'appear' | 'merge' | 'move';
}

// 游戏状态
export default function Game2048() {
  // 游戏状态
  const [gameBoard, setGameBoard] = useState<number[][]>([]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [won, setWon] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [scoreAnimation, setScoreAnimation] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [tileSize, setTileSize] = useState<number>(80);
  const [boardSize, setBoardSize] = useState<number>(400);
  
  // 布局相关
  const isMobile = useMobile();
  const gameRef = useRef<HTMLDivElement>(null);
  const nextTileId = useRef<number>(1);
  
  // 瓦片颜色主题
  const tileColors: Record<number, string> = {
    0: 'bg-gray-700/30',
    2: 'bg-gradient-to-br from-amber-100 to-amber-200 text-gray-800',
    4: 'bg-gradient-to-br from-amber-200 to-amber-300 text-gray-800',
    8: 'bg-gradient-to-br from-orange-300 to-orange-400 text-white',
    16: 'bg-gradient-to-br from-orange-400 to-orange-500 text-white',
    32: 'bg-gradient-to-br from-red-400 to-red-500 text-white',
    64: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
    128: 'bg-gradient-to-br from-yellow-300 to-yellow-400 text-white',
    256: 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white',
    512: 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white',
    1024: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white text-sm',
    2048: 'bg-gradient-to-br from-amber-600 to-amber-700 text-white text-sm',
  };

  // 动态调整游戏板大小
  useEffect(() => {
    const updateBoardSize = () => {
      if (isMobile) {
        const screenWidth = window.innerWidth;
        const maxWidth = Math.min(screenWidth - 48, 400);
        const newTileSize = Math.floor(maxWidth / BOARD_SIZE);
        const newBoardSize = newTileSize * BOARD_SIZE;
        setTileSize(newTileSize);
        setBoardSize(newBoardSize);
      } else {
        setTileSize(80);
        setBoardSize(400);
      }
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, [isMobile]);

  // 初始化游戏
  const initializeGame = useCallback(() => {
    // 创建空游戏板
    const newBoard: number[][] = Array(BOARD_SIZE).fill(null).map(() => 
      Array(BOARD_SIZE).fill(0)
    );
    
    setGameBoard(newBoard);
    setTiles([]);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setGameStarted(false);
    nextTileId.current = 1;
    
    // 加载最高分
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('2048-best-score');
      if (saved) {
        setBestScore(parseInt(saved, 10));
      }
    }
  }, []);

  // 生成随机瓦片
  const generateRandomTile = useCallback((): Tile | null => {
    const emptyCells: { row: number; col: number }[] = [];
    
    // 查找所有空单元格
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (gameBoard[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }
    
    if (emptyCells.length === 0) {
      return null;
    }
    
    // 随机选择一个空单元格
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    
    // 90%概率生成2，10%概率生成4
    const value = Math.random() < 0.9 ? 2 : 4;
    
    return {
      id: nextTileId.current++,
      value,
      row: randomCell.row,
      col: randomCell.col,
      isNew: true,
      animate: 'appear'
    };
  }, [gameBoard]);

  // 添加初始瓦片
  const addInitialTiles = useCallback(() => {
    const newTiles: Tile[] = [];
    const newBoard = [...gameBoard];
    
    // 添加两个初始瓦片
    for (let i = 0; i < 2; i++) {
      const newTile = generateRandomTile();
      if (newTile) {
        newTiles.push(newTile);
        newBoard[newTile.row][newTile.col] = newTile.value;
      }
    }
    
    setTiles(newTiles);
    setGameBoard(newBoard);
    setGameStarted(true);
  }, [gameBoard, generateRandomTile]);

  // 移动瓦片
  const moveTiles = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (isAnimating || gameOver) return;
    
    setIsAnimating(true);
    
    // 创建游戏板副本
    const newBoard = gameBoard.map(row => [...row]);
    const newTiles: Tile[] = [];
    let moved = false;
    let scoreIncrement = 0;
    
    // 根据方向确定遍历顺序
    const rowStart = direction === 'down' ? BOARD_SIZE - 1 : 0;
    const rowEnd = direction === 'down' ? -1 : BOARD_SIZE;
    const rowStep = direction === 'down' ? -1 : 1;
    
    const colStart = direction === 'right' ? BOARD_SIZE - 1 : 0;
    const colEnd = direction === 'right' ? -1 : BOARD_SIZE;
    const colStep = direction === 'right' ? -1 : 1;
    
    // 确定主要和次要遍历方向
    const isRowPrimary = direction === 'left' || direction === 'right';
    
    // 遍历游戏板
    for (let i = isRowPrimary ? 0 : rowStart; 
         isRowPrimary ? i < BOARD_SIZE : i !== rowEnd; 
         i += isRowPrimary ? 1 : rowStep) {
      
      const line: number[] = [];
      const tilePositions: { row: number; col: number }[] = [];
      
      // 收集当前行/列的瓦片
      for (let j = isRowPrimary ? colStart : i; 
           isRowPrimary ? j !== colEnd : j !== (isRowPrimary ? i : colEnd); 
           j += isRowPrimary ? colStep : 1) {
        
        const row = isRowPrimary ? i : j;
        const col = isRowPrimary ? j : i;
        
        if (newBoard[row][col] !== 0) {
          line.push(newBoard[row][col]);
          tilePositions.push({ row, col });
          newBoard[row][col] = 0;
        }
      }
      
      // 合并相同值的瓦片
      const mergedLine: number[] = [];
      const mergedPositions: { row: number; col: number }[] = [];
      let mergedCount = 0;
      
      for (let j = 0; j < line.length; j++) {
        if (j < line.length - 1 && line[j] === line[j + 1]) {
          // 合并瓦片
          const mergedValue = line[j] * 2;
          mergedLine.push(mergedValue);
          scoreIncrement += mergedValue;
          
          // 记录合并位置
          const mergedFrom = [tilePositions[j], tilePositions[j + 1]];
          mergedPositions.push({
            row: isRowPrimary ? i : (direction === 'up' || direction === 'down' ? j - mergedCount : i),
            col: isRowPrimary ? (direction === 'left' || direction === 'right' ? j - mergedCount : i) : j
          });
          
          // 创建合并后的瓦片
          newTiles.push({
            id: nextTileId.current++,
            value: mergedValue,
            row: mergedPositions[mergedPositions.length - 1].row,
            col: mergedPositions[mergedPositions.length - 1].col,
            isMerged: true,
            mergedFrom,
            animate: 'merge'
          });
          
          j++; // 跳过下一个瓦片，因为它已经被合并
          mergedCount++;
        } else {
          // 不合并，直接添加
          mergedLine.push(line[j]);
          mergedPositions.push({
            row: isRowPrimary ? i : (direction === 'up' || direction === 'down' ? j - mergedCount : i),
            col: isRowPrimary ? (direction === 'left' || direction === 'right' ? j - mergedCount : i) : j
          });
          
          // 创建移动后的瓦片
          if (tilePositions[j].row !== mergedPositions[mergedPositions.length - 1].row || 
              tilePositions[j].col !== mergedPositions[mergedPositions.length - 1].col) {
            newTiles.push({
              id: nextTileId.current++,
              value: line[j],
              row: mergedPositions[mergedPositions.length - 1].row,
              col: mergedPositions[mergedPositions.length - 1].col,
              animate: 'move'
            });
          }
        }
      }
      
      // 将合并后的行/列放回游戏板
      for (let j = 0; j < mergedLine.length; j++) {
        const row = isRowPrimary ? i : (direction === 'up' || direction === 'down' ? j : i);
        const col = isRowPrimary ? (direction === 'left' || direction === 'right' ? j : i) : j;
        newBoard[row][col] = mergedLine[j];
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
    const hasWon = board.some(row => row.some(cell => cell === WINNING_VALUE));
    if (hasWon && !won) {
      setWon(true);
    }

    // 检查是否游戏结束
    const hasEmptyCell = board.some(row => row.some(cell => cell === 0));
    if (!hasEmptyCell) {
      // 检查是否有可合并的相邻瓦片
      let canMerge = false;
      
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const current = board[row][col];
          
          // 检查右侧
          if (col < BOARD_SIZE - 1 && board[row][col + 1] === current) {
            canMerge = true;
            break;
          }
          
          // 检查下方
          if (row < BOARD_SIZE - 1 && board[row + 1][col] === current) {
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

  // 重置游戏
  const resetGame = () => {
    initializeGame();
    setTimeout(() => {
      addInitialTiles();
    }, 100);
  };

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating || (!gameStarted && e.key !== ' ')) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveTiles('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveTiles('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moveTiles('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveTiles('right');
          break;
        case ' ':
          e.preventDefault();
          if (!gameStarted) {
            addInitialTiles();
          }
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
  }, [isAnimating, gameStarted, moveTiles, addInitialTiles, resetGame]);

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

    if (!gameStarted) {
      addInitialTiles();
    }

    setTouchStart(null);
  };

  // 移动端控制
  const handleMobileControl = (direction: 'up' | 'down' | 'left' | 'right') => {
    moveTiles(direction);
    if (!gameStarted) {
      addInitialTiles();
    }
  };

  // 初始化游戏
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // 渲染游戏板背景
  const renderBoardBackground = () => {
    const cells = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        cells.push(
          <div
            key={`bg-${row}-${col}`}
            className="absolute bg-gray-700/30 rounded-lg"
            style={{
              width: `${tileSize - 8}px`,
              height: `${tileSize - 8}px`,
              left: `${col * tileSize + 4}px`,
              top: `${row * tileSize + 4}px`,
            }}
          />
        );
      }
    }
    return cells;
  };

  // 渲染瓦片
  const renderTiles = () => {
    return tiles.map(tile => {
      const tileClass = `absolute rounded-lg flex items-center justify-center font-bold text-xl md:text-2xl shadow-lg transition-all duration-${ANIMATION_DURATION} ease-in-out ${tileColors[tile.value] || 'bg-gray-800'}`;
      
      // 根据动画类型添加不同的动画效果
      let animationClass = '';
      if (tile.animate === 'appear') {
        animationClass = 'scale-0 animate-in fade-in-90 zoom-in-90';
      } else if (tile.animate === 'merge') {
        animationClass = 'scale-110 animate-in fade-in-90 zoom-in-90';
      }
      
      return (
        <div
          key={tile.id}
          className={`${tileClass} ${animationClass}`}
          style={{
            width: `${tileSize - 8}px`,
            height: `${tileSize - 8}px`,
            left: `${tile.col * tileSize + 4}px`,
            top: `${tile.row * tileSize + 4}px`,
            zIndex: tile.value,
          }}
        >
          {tile.value}
        </div>
      );
    });
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
              <div className="flex gap-2">
                <Button
                  variant="flat"
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                  onPress={resetGame}
                >
                  新游戏
                </Button>
              </div>
            </div>

            <div 
              ref={gameRef}
              className="relative bg-gray-700/30 rounded-xl p-2 shadow-inner"
              style={{ width: `${boardSize}px`, height: `${boardSize}px` }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* 游戏板背景 */}
              {renderBoardBackground()}
              
              {/* 瓦片 */}
              {renderTiles()}
              
              {/* 游戏开始提示 */}
              {!gameStarted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
                  <div className="text-white text-xl font-bold mb-4 animate-bounce">按方向键开始游戏</div>
                  <div className="text-gray-300 text-sm">或滑动屏幕</div>
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
            cellSize={tileSize}
          />
        )}

        {/* 游戏结束覆盖层 */}
        {(gameOver || won) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
            <Card className="bg-gray-800/95 border-gray-600 shadow-2xl max-w-md w-full mx-4">
              <CardBody className="p-6 text-center">
                <h2 className={`text-2xl font-bold mb-2 ${won ? 'text-yellow-400' : 'text-red-400'}`}>
                  {won ? '恭喜你赢了！' : '游戏结束！'}
                </h2>
                <p className="text-gray-300 mb-2">{won ? '你成功达到了2048！' : '没有可移动的方块了'}</p>
                <p className="text-gray-300 mb-6">最终得分: <span className="text-yellow-400 font-bold">{score}</span></p>
                {score > bestScore && (
                  <div className="bg-green-900/50 border border-green-500/30 rounded-lg p-3 mb-6 animate-pulse">
                    <p className="text-green-400 font-bold">新纪录！🎉</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="flat"
                    className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white rounded-lg transition-all duration-300"
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
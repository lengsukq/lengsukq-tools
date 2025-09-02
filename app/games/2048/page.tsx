"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import { MobileControls } from "@/components/mobile-controls";

const BOARD_SIZE = 4;
const ANIMATION_DURATION = 200;

interface Tile {
  id: string;
  value: number;
  row: number;
  col: number;
  mergedFrom?: string[];
  isNew?: boolean;
  isMerged?: boolean;
}

export default function Game2048() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [won, setWon] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [scoreAnimation, setScoreAnimation] = useState<boolean>(false);
  const [gameBoard, setGameBoard] = useState<number[][]>([]);
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
  }, [generateRandomTile]);

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
          return { row: [0, BOARD_SIZE - 1], col: [0, BOARD_SIZE - 1] };
        case 'right':
          return { row: [0, BOARD_SIZE - 1], col: [BOARD_SIZE - 1, 0, -1] };
        case 'up':
          return { row: [0, BOARD_SIZE - 1], col: [0, BOARD_SIZE - 1] };
        case 'down':
          return { row: [BOARD_SIZE - 1, 0, -1], col: [0, BOARD_SIZE - 1] };
      }
    };

    const order = getTraversalOrder();
    const isHorizontal = direction === 'left' || direction === 'right';

    // 遍历每一行/列
    for (let i = order.row[0]; isHorizontal ? i <= order.row[1] : i >= order.row[1]; i += order.row[2] || 1) {
      const line: number[] = [];
      const lineTiles: Tile[] = [];

      // 收集非零值
      for (let j = order.col[0]; j !== order.col[1] + (order.col[2] || 1); j += order.col[2] || 1) {
        const value = isHorizontal ? newBoard[i][j] : newBoard[j][i];
        if (value !== 0) {
          line.push(value);
          const tile = tiles.find(t => 
            isHorizontal ? (t.row === i && t.col === j) : (t.row === j && t.col === i)
          );
          if (tile) lineTiles.push(tile);
        }
      }

      // 合并相同值
      for (let j = 0; j < line.length - 1; j++) {
        if (line[j] === line[j + 1]) {
          line[j] *= 2;
          scoreIncrement += line[j];
          line.splice(j + 1, 1);
          
          // 标记合并的瓦片
          if (lineTiles[j] && lineTiles[j + 1]) {
            lineTiles[j].value = line[j];
            lineTiles[j].isMerged = true;
            lineTiles[j].mergedFrom = [lineTiles[j].id, lineTiles[j + 1].id];
            lineTiles.splice(j + 1, 1);
          }
        }
      }

      // 填充零
      while (line.length < BOARD_SIZE) {
        line.push(0);
      }

      // 更新棋盘
      for (let j = 0; j < BOARD_SIZE; j++) {
        const value = line[j];
        const col = isHorizontal ? j : i;
        const row = isHorizontal ? i : j;
        
        newBoard[row][col] = value;
        
        if (value !== 0) {
          const existingTile = lineTiles.find(t => 
            isHorizontal ? (t.row === i && t.col === j) : (t.row === j && t.col === i)
          );
          
          if (existingTile) {
            existingTile.row = row;
            existingTile.col = col;
            newTiles.push(existingTile);
          }
        }
      }
    }

    if (scoreIncrement > 0) {
      setScore(prev => prev + scoreIncrement);
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
        mergedFrom: undefined
      })));
    }, ANIMATION_DURATION);
  }, [gameBoard, tiles, isAnimating, gameOver, generateRandomTile]);

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
      if (isAnimating || gameOver) return;

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
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [moveTiles, isAnimating, gameOver]);

  // 初始化游戏
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // 更新最高分
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem('2048-best-score', score.toString());
    }
  }, [score, bestScore]);

  // 加载最高分
  useEffect(() => {
    const savedBestScore = localStorage.getItem('2048-best-score');
    if (savedBestScore) {
      setBestScore(parseInt(savedBestScore));
    }
  }, []);

  const resetGame = () => {
    setTiles([]);
    setGameBoard([]);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setGameStarted(false);
    setIsAnimating(false);
    setTimeout(initializeGame, 100);
  };

  const getTileColor = (value: number) => {
    const colors: { [key: number]: string } = {
      2: 'from-yellow-400 to-yellow-600',
      4: 'from-orange-400 to-orange-600',
      8: 'from-red-400 to-red-600',
      16: 'from-pink-400 to-pink-600',
      32: 'from-purple-400 to-purple-600',
      64: 'from-indigo-400 to-indigo-600',
      128: 'from-blue-400 to-blue-600',
      256: 'from-cyan-400 to-cyan-600',
      512: 'from-teal-400 to-teal-600',
      1024: 'from-green-400 to-green-600',
      2048: 'from-yellow-300 to-yellow-500',
    };
    return colors[value] || 'from-gray-400 to-gray-600';
  };

  const getTileTextColor = (value: number) => {
    return value <= 4 ? 'text-gray-800' : 'text-white';
  };

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <style>{`
        @keyframes tileAppear {
          0% {
            transform: scale(0) rotate(180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(90deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        
        @keyframes tileMerge {
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
        
        @keyframes scoreUpdate {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
            color: #fbbf24;
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
        
        .tile-new {
          animation: tileAppear 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        .tile-merged {
          animation: tileMerge 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
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
          background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        .tile {
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 
            0 4px 8px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        .tile:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 8px 16px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
      `}</style>

      <div className="w-full max-w-md">
        <div className="text-center mb-6 fade-in">
          <h1 className={title({ size: "lg", fullWidth: true, color: "yellow" })}>2048</h1>
          <div className={subtitle({ class: "mt-2 text-gray-300" })}>
            数字益智游戏，通过滑动合并相同数字，达到2048获得胜利
          </div>
        </div>

        <Card className="w-full bg-gray-800/50 border-gray-700/50 shadow-2xl slide-in backdrop-blur-sm">
          <CardBody className="flex flex-col items-center gap-6 p-6">
            {/* 游戏信息栏 */}
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M12 8v8m-4-4h8"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400">得分</p>
                    <p className={`text-lg font-bold text-white ${scoreAnimation ? "score-update" : ""}`}>
                      {score.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-400">最高分</p>
                  <p className="text-lg font-bold text-white">{bestScore.toLocaleString()}</p>
                </div>
              </div>
              
              <Button
                color="primary"
                size="sm"
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
                onPress={resetGame}
              >
                重新开始
              </Button>
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
                <div className="absolute inset-4 grid grid-cols-4 grid-rows-4 gap-2">
                  {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, index) => (
                    <div
                      key={index}
                      className="bg-gray-700/30 rounded-lg border border-gray-600/30"
                    />
                  ))}
                </div>

                {/* 瓦片 */}
                {tiles.map((tile) => (
                  <div
                    key={tile.id}
                    className={`absolute tile rounded-lg flex items-center justify-center font-bold text-lg ${getTileColor(tile.value)} ${getTileTextColor(tile.value)} ${
                      tile.isNew ? 'tile-new' : ''
                    } ${tile.isMerged ? 'tile-merged' : ''}`}
                    style={{
                      width: cellSize - 8,
                      height: cellSize - 8,
                      left: tile.col * cellSize + 4,
                      top: tile.row * cellSize + 4,
                      zIndex: tile.isNew || tile.isMerged ? 20 : 10,
                    }}
                  >
                    {tile.value}
                  </div>
                ))}
              </div>
            </div>

            {/* 游戏状态提示 */}
            {won && !gameOver && (
              <div className="text-center bg-gradient-to-r from-green-900/50 to-emerald-900/50 p-4 rounded-xl w-full animate-pulse fade-in border border-green-500/30">
                <p className="text-xl font-bold text-green-300 mb-2">🎉 恭喜获胜!</p>
                <p className="text-lg text-green-200">你达到了2048!</p>
              </div>
            )}

            {gameOver && (
              <div className="text-center bg-gradient-to-r from-red-900/50 to-pink-900/50 p-4 rounded-xl w-full animate-pulse fade-in border border-red-500/30">
                <p className="text-xl font-bold text-red-300 mb-2">💀 游戏结束!</p>
                <p className="text-lg text-red-200">最终得分: {score.toLocaleString()}</p>
              </div>
            )}

            {/* 游戏说明 */}
            <div className="text-sm text-gray-300 text-center bg-gray-700/30 p-4 rounded-xl w-full fade-in border border-gray-600/30">
              <p className="font-medium mb-2 text-gray-200">🎮 游戏说明</p>
              <p>使用方向键或触摸滑动移动方块</p>
              <p>相同数字的方块会合并</p>
              <p>达到2048获得胜利</p>
            </div>

            {/* 移动端控制 */}
            {isMobile && (
              <div className="w-full mt-4 fade-in">
                <MobileControls
                  className="w-full"
                  onDirection={(direction: "up" | "down" | "left" | "right") => {
                    moveTiles(direction);
                  }}
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

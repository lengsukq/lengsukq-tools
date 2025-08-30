"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { MobileControls } from "@/components/mobile-controls";
import { useMobile } from "@/hooks/use-mobile";

const BOARD_SIZE = 4;

export default function Game2048() {
  const [board, setBoard] = useState<number[][]>([]);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [won, setWon] = useState<boolean>(false);
  const [animating, setAnimating] = useState<boolean>(false);
  const [newTiles, setNewTiles] = useState<Set<string>>(new Set());
  const [mergedTiles, setMergedTiles] = useState<Set<string>>(new Set());
  const [scoreAnimation, setScoreAnimation] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const isMobile = useMobile();

  const addRandomTile = useCallback((boardState: number[][]) => {
    const emptyCells: [number, number][] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (boardState[i][j] === 0) {
          emptyCells.push([i, j]);
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      boardState[row][col] = Math.random() < 0.9 ? 2 : 4;
      setNewTiles(new Set([`${row}-${col}`]));
    }
  }, []);

  const initializeBoard = useCallback(() => {
    const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setGameStarted(true);
  }, [addRandomTile]);

  const moveLeft = useCallback((boardState: number[][]): boolean => {
    let moved = false;
    const merged = new Set<string>();
    
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = boardState[i].filter(cell => cell !== 0);
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1]) {
          row[j] *= 2;
          row.splice(j + 1, 1);
          merged.add(`${i}-${j}`);
          moved = true;
        }
      }
      const newRow = row.concat(Array(BOARD_SIZE - row.length).fill(0));
      if (JSON.stringify(boardState[i]) !== JSON.stringify(newRow)) {
        moved = true;
      }
      boardState[i] = newRow;
    }
    
    if (merged.size > 0) {
      setMergedTiles(merged);
    }
    return moved;
  }, []);

  const moveRight = useCallback((boardState: number[][]): boolean => {
    let moved = false;
    const merged = new Set<string>();
    
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = boardState[i].filter(cell => cell !== 0);
      for (let j = row.length - 1; j > 0; j--) {
        if (row[j] === row[j - 1]) {
          row[j] *= 2;
          row.splice(j - 1, 1);
          const actualCol = BOARD_SIZE - row.length + j;
          merged.add(`${i}-${actualCol}`);
          moved = true;
        }
      }
      const newRow = Array(BOARD_SIZE - row.length).fill(0).concat(row);
      if (JSON.stringify(boardState[i]) !== JSON.stringify(newRow)) {
        moved = true;
      }
      boardState[i] = newRow;
    }
    
    if (merged.size > 0) {
      setMergedTiles(merged);
    }
    return moved;
  }, []);

  const moveUp = useCallback((boardState: number[][]): boolean => {
    let moved = false;
    const merged = new Set<string>();
    
    for (let j = 0; j < BOARD_SIZE; j++) {
      const column = [];
      for (let i = 0; i < BOARD_SIZE; i++) {
        if (boardState[i][j] !== 0) {
          column.push(boardState[i][j]);
        }
      }
      for (let i = 0; i < column.length - 1; i++) {
        if (column[i] === column[i + 1]) {
          column[i] *= 2;
          column.splice(i + 1, 1);
          merged.add(`${i}-${j}`);
          moved = true;
        }
      }
      const newColumn = column.concat(Array(BOARD_SIZE - column.length).fill(0));
      for (let i = 0; i < BOARD_SIZE; i++) {
        if (boardState[i][j] !== newColumn[i]) {
          moved = true;
        }
        boardState[i][j] = newColumn[i];
      }
    }
    
    if (merged.size > 0) {
      setMergedTiles(merged);
    }
    return moved;
  }, []);

  const moveDown = useCallback((boardState: number[][]): boolean => {
    let moved = false;
    const merged = new Set<string>();
    
    for (let j = 0; j < BOARD_SIZE; j++) {
      const column = [];
      for (let i = 0; i < BOARD_SIZE; i++) {
        if (boardState[i][j] !== 0) {
          column.push(boardState[i][j]);
        }
      }
      for (let i = column.length - 1; i > 0; i--) {
        if (column[i] === column[i - 1]) {
          column[i] *= 2;
          column.splice(i - 1, 1);
          const actualRow = BOARD_SIZE - column.length + i;
          merged.add(`${actualRow}-${j}`);
          moved = true;
        }
      }
      const newColumn = Array(BOARD_SIZE - column.length).fill(0).concat(column);
      for (let i = 0; i < BOARD_SIZE; i++) {
        if (boardState[i][j] !== newColumn[i]) {
          moved = true;
        }
        boardState[i][j] = newColumn[i];
      }
    }
    
    if (merged.size > 0) {
      setMergedTiles(merged);
    }
    return moved;
  }, []);

  const isGameOver = useCallback((boardState: number[][]): boolean => {
    // 检查是否有空格
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (boardState[i][j] === 0) return false;
      }
    }

    // 检查是否可以合并
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        const current = boardState[i][j];
        if (
          (i < BOARD_SIZE - 1 && boardState[i + 1][j] === current) ||
          (j < BOARD_SIZE - 1 && boardState[i][j + 1] === current)
        ) {
          return false;
        }
      }
    }
    return true;
  }, []);

  const move = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver || animating) return;

    setAnimating(true);
    const newBoard = board.map(row => [...row]);
    let moved = false;

    switch (direction) {
      case 'left':
        moved = moveLeft(newBoard);
        break;
      case 'right':
        moved = moveRight(newBoard);
        break;
      case 'up':
        moved = moveUp(newBoard);
        break;
      case 'down':
        moved = moveDown(newBoard);
        break;
    }

    if (moved) {
      addRandomTile(newBoard);
      setBoard(newBoard);
      
      // 计算分数
      let newScore = 0;
      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          newScore += newBoard[i][j];
        }
      }
      setScore(newScore);
      setScoreAnimation(true);
      
      if (newScore > bestScore) {
        setBestScore(newScore);
      }
      
      setTimeout(() => setScoreAnimation(false), 300);

      // 检查是否获胜
      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          if (newBoard[i][j] === 2048) {
            setWon(true);
          }
        }
      }

      // 检查游戏是否结束
      if (isGameOver(newBoard)) {
        setGameOver(true);
      }

      // 清除动画状态
      setTimeout(() => {
        setAnimating(false);
        setNewTiles(new Set());
        setMergedTiles(new Set());
      }, 300);
    } else {
      setAnimating(false);
    }
  }, [board, gameOver, animating, moveLeft, moveRight, moveUp, moveDown, addRandomTile, bestScore, isGameOver]);

  const handleDirectionChange = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!animating) {
      move(direction);
    }
  };

  // 触摸控制
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || animating) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const minSwipeDistance = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平滑动
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          move('right');
        } else {
          move('left');
        }
      }
    } else {
      // 垂直滑动
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          move('down');
        } else {
          move('up');
        }
      }
    }

    setTouchStart(null);
  };

  const resetGame = () => {
    setAnimating(false);
    setNewTiles(new Set());
    setMergedTiles(new Set());
    initializeBoard();
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          move('left');
          break;
        case 'ArrowRight':
          move('right');
          break;
        case 'ArrowUp':
          move('up');
          break;
        case 'ArrowDown':
          move('down');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [move]);

  useEffect(() => {
    initializeBoard();
  }, [initializeBoard]);

  const getTileColor = (value: number) => {
    const colors: { [key: number]: string } = {
      0: 'bg-gray-700',
      2: 'bg-red-500',
      4: 'bg-orange-500',
      8: 'bg-yellow-500',
      16: 'bg-lime-500',
      32: 'bg-green-500',
      64: 'bg-teal-500',
      128: 'bg-blue-500',
      256: 'bg-indigo-500',
      512: 'bg-purple-500',
      1024: 'bg-pink-500',
      2048: 'bg-red-600 text-white',
    };
    return colors[value] || 'bg-gray-600';
  };

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10 bg-gray-900 min-h-screen">
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes merge {
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
        
        @keyframes slide {
          from {
            transform: translateX(0) translateY(0);
          }
          to {
            transform: translateX(var(--slide-x, 0)) translateY(var(--slide-y, 0));
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
        
        .tile-new {
          animation: slideIn 0.3s ease-out;
        }
        
        .tile-merged {
          animation: merge 0.3s ease-out;
        }
        
        .tile-slide {
          animation: slide 0.3s ease-out;
        }
        
        .score-update {
          animation: scoreUpdate 0.3s ease-out;
        }
        
        .game-board {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
      <div className="inline-block text-center justify-center mb-4">
        <h1 className="text-3xl font-bold text-white">2048</h1>
        <p className="text-gray-300 mt-2">
          数字益智游戏，通过滑动合并相同数字，达到2048获得胜利
        </p>
      </div>

      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardBody className="flex flex-col items-center gap-4">
          <div className="flex justify-between w-full">
            <div className="text-center">
              <p className="text-sm text-gray-300">得分</p>
              <p className={`text-lg font-semibold text-white ${scoreAnimation ? 'score-update' : ''}`}>
                {score}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-300">最高分</p>
              <p className="text-lg font-semibold text-white">{bestScore}</p>
            </div>
            <Button
              color="primary"
              variant="flat"
              onPress={resetGame}
              size="sm"
            >
              重新开始
            </Button>
          </div>

          <div
            className={`grid grid-cols-4 gap-2 p-4 bg-gray-700 rounded-lg touch-none select-none ${gameStarted ? 'game-board' : ''}`}
            style={{ width: 352, height: 352 }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {board.map((row, i) =>
              row.map((cell, j) => {
                const tileKey = `${i}-${j}`;
                const isNew = newTiles.has(tileKey);
                const isMerged = mergedTiles.has(tileKey);
                
                return (
                  <div
                    key={tileKey}
                    className={`w-16 h-16 flex items-center justify-center text-xl font-bold rounded-lg border-2 transition-all duration-300 ${
                      cell === 0 ? 'bg-gray-700 border-gray-600' : 
                      `${getTileColor(cell)} border-gray-500 text-white`
                    } ${
                      isNew ? 'tile-new' : ''
                    } ${
                      isMerged ? 'tile-merged' : ''
                    }`}
                  >
                    {cell !== 0 ? cell : ''}
                  </div>
                );
              })
            )}
          </div>

          {won && !gameOver && (
            <div className="text-center">
              <p className="text-xl font-bold text-green-500 mb-2">恭喜获胜!</p>
              <p className="text-lg text-white">你达到了2048!</p>
            </div>
          )}

          {gameOver && (
            <div className="text-center">
              <p className="text-xl font-bold text-red-500 mb-2">游戏结束!</p>
              <p className="text-lg text-white">最终得分: {score}</p>
            </div>
          )}

          <div className="text-sm text-gray-300 text-center">
            <p>使用方向键或触摸滑动移动方块</p>
            <p>相同数字的方块会合并</p>
            <p>达到2048获得胜利</p>
          </div>

          {isMobile && (
            <MobileControls
              onDirection={handleDirectionChange}
              className="mt-4"
            />
          )}
        </CardBody>
      </Card>
    </section>
  );
}

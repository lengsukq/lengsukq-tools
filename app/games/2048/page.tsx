"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";

import { MobileControls } from "@/components/mobile-controls";
import { useMobile } from "@/hooks/use-mobile";
import { title, subtitle } from "@/components/primitives";

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
  const [newTilePositions, setNewTilePositions] = useState<{row: number, col: number}[]>([]);
  const [CELL_SIZE, setCELL_SIZE] = useState(80);
  const isMobile = useMobile();
  
  // 根据屏幕宽度动态调整单元格大小
  useEffect(() => {
    const updateCellSize = () => {
      if (isMobile) {
        // 在移动端，根据屏幕宽度计算合适的单元格大小
        const screenWidth = window.innerWidth;
        const maxGameWidth = screenWidth - 64; // 减去边距
        const newSize = Math.min(80, Math.floor(maxGameWidth / BOARD_SIZE));
        setCELL_SIZE(newSize);
      } else {
        setCELL_SIZE(80);
      }
    };
    
    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    
    return () => window.removeEventListener('resize', updateCellSize);
  }, [isMobile]);

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
      const [row, col] =
        emptyCells[Math.floor(Math.random() * emptyCells.length)];

      boardState[row][col] = Math.random() < 0.9 ? 2 : 4;
      setNewTiles(new Set([`${row}-${col}`]));
      
      // 记录新方块位置用于动画
      setNewTilePositions([{row, col}]);
      
      // 清除新方块位置标记
      setTimeout(() => {
        setNewTilePositions([]);
      }, 300);
    }
  }, []);

  const initializeBoard = useCallback(() => {
    const newBoard = Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill(0));

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
    let scoreIncrement = 0;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = boardState[i].filter((cell) => cell !== 0);

      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1]) {
          row[j] *= 2;
          scoreIncrement += row[j];
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

    // 更新分数并添加动画
    if (scoreIncrement > 0) {
      setScore(prev => {
        setScoreAnimation(true);
        setTimeout(() => setScoreAnimation(false), 300);
        return prev + scoreIncrement;
      });
    }

    return moved;
  }, []);

  const moveRight = useCallback((boardState: number[][]): boolean => {
    let moved = false;
    const merged = new Set<string>();
    let scoreIncrement = 0;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = boardState[i].filter((cell) => cell !== 0);

      for (let j = row.length - 1; j > 0; j--) {
        if (row[j] === row[j - 1]) {
          row[j] *= 2;
          scoreIncrement += row[j];
          row.splice(j - 1, 1);
          const actualCol = BOARD_SIZE - row.length + j;

          merged.add(`${i}-${actualCol}`);
          moved = true;
        }
      }
      const newRow = Array(BOARD_SIZE - row.length)
        .fill(0)
        .concat(row);

      if (JSON.stringify(boardState[i]) !== JSON.stringify(newRow)) {
        moved = true;
      }
      boardState[i] = newRow;
    }

    if (merged.size > 0) {
      setMergedTiles(merged);
    }

    // 更新分数并添加动画
    if (scoreIncrement > 0) {
      setScore(prev => {
        setScoreAnimation(true);
        setTimeout(() => setScoreAnimation(false), 300);
        return prev + scoreIncrement;
      });
    }

    return moved;
  }, []);

  const moveUp = useCallback((boardState: number[][]): boolean => {
    let moved = false;
    const merged = new Set<string>();
    let scoreIncrement = 0;

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
          scoreIncrement += column[i];
          column.splice(i + 1, 1);
          merged.add(`${i}-${j}`);
          moved = true;
        }
      }
      const newColumn = column.concat(
        Array(BOARD_SIZE - column.length).fill(0),
      );

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

    // 更新分数并添加动画
    if (scoreIncrement > 0) {
      setScore(prev => {
        setScoreAnimation(true);
        setTimeout(() => setScoreAnimation(false), 300);
        return prev + scoreIncrement;
      });
    }

    return moved;
  }, []);

  const moveDown = useCallback((boardState: number[][]): boolean => {
    let moved = false;
    const merged = new Set<string>();
    let scoreIncrement = 0;

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
          scoreIncrement += column[i];
          column.splice(i - 1, 1);
          const actualRow = BOARD_SIZE - column.length + i;

          merged.add(`${actualRow}-${j}`);
          moved = true;
        }
      }
      const newColumn = Array(BOARD_SIZE - column.length)
        .fill(0)
        .concat(column);

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

    // 更新分数并添加动画
    if (scoreIncrement > 0) {
      setScore(prev => {
        setScoreAnimation(true);
        setTimeout(() => setScoreAnimation(false), 300);
        return prev + scoreIncrement;
      });
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

  const move = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (gameOver || animating) return;

      setAnimating(true);
      const newBoard = board.map((row) => [...row]);
      let moved = false;

      switch (direction) {
        case "left":
          moved = moveLeft(newBoard);
          break;
        case "right":
          moved = moveRight(newBoard);
          break;
        case "up":
          moved = moveUp(newBoard);
          break;
        case "down":
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
    },
    [
      board,
      gameOver,
      animating,
      moveLeft,
      moveRight,
      moveUp,
      moveDown,
      addRandomTile,
      bestScore,
      isGameOver,
    ],
  );

  const handleDirectionChange = (
    direction: "up" | "down" | "left" | "right",
  ) => {
    if (!animating) {
      move(direction);
    }
  };

  // 触摸控制
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );

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
          move("right");
        } else {
          move("left");
        }
      }
    } else {
      // 垂直滑动
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          move("down");
        } else {
          move("up");
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
        case "ArrowLeft":
          move("left");
          break;
        case "ArrowRight":
          move("right");
          break;
        case "ArrowUp":
          move("up");
          break;
        case "ArrowDown":
          move("down");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [move]);

  useEffect(() => {
    initializeBoard();
  }, [initializeBoard]);

  const getTileColor = (value: number) => {
    const colors: { [key: number]: string } = {
      0: "bg-gray-700",
      2: "bg-red-500",
      4: "bg-orange-500",
      8: "bg-yellow-500",
      16: "bg-lime-500",
      32: "bg-green-500",
      64: "bg-teal-500",
      128: "bg-blue-500",
      256: "bg-indigo-500",
      512: "bg-purple-500",
      1024: "bg-pink-500",
      2048: "bg-red-600 text-white",
    };

    return colors[value] || "bg-gray-600";
  };

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 px-4">
      <style>{`
        @keyframes tileAppear {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
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
            transform: scale(1.2);
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
        
        @keyframes slideLeft {
          from {
            transform: translateX(20px);
          }
          to {
            transform: translateX(0);
          }
        }
        
        @keyframes slideRight {
          from {
            transform: translateX(-20px);
          }
          to {
            transform: translateX(0);
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(20px);
          }
          to {
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            transform: translateY(-20px);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .tile-new {
          animation: tileAppear 0.3s ease-out;
        }
        
        .tile-merged {
          animation: tileMerge 0.3s ease-out;
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
        
        .tile-appear {
          animation: tileAppear 0.3s ease-out;
        }
        
        .tile-merge {
          animation: tileMerge 0.3s ease-out;
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        
        .slide-in {
          animation: slideIn 0.3s ease-out;
        }
        
        .slide-left {
          animation: slideLeft 0.15s ease-out;
        }
        
        .slide-right {
          animation: slideRight 0.15s ease-out;
        }
        
        .slide-up {
          animation: slideUp 0.15s ease-out;
        }
        
        .slide-down {
          animation: slideDown 0.15s ease-out;
        }
        
        .tile {
          transition: all 0.15s ease-out;
        }
      `}</style>
      <div className="w-full max-w-md">
        <div className="text-center mb-6 fade-in">
              <h1 className={title({ size: "lg", fullWidth: true })}>2048</h1>
              <div className={subtitle({ class: "mt-2" })}>
                数字益智游戏，通过滑动合并相同数字，达到2048获得胜利
              </div>
            </div>

        <Card className="w-full bg-gray-800 border-gray-700 shadow-xl slide-in">
          <CardBody className="flex flex-col items-center gap-6 p-6">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M12 8v8m-4-4h8"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-300">得分</p>
                  <p
                    className={`text-lg font-semibold text-white ${scoreAnimation ? "score-update" : ""}`}
                  >
                    {score}
                  </p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-300">最高分</p>
                <p className="text-lg font-semibold text-white">{bestScore}</p>
              </div>
              <Button
                color="primary"
                size="sm"
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium transition-all duration-300 transform hover:scale-105"
                onPress={resetGame}
              >
                重新开始
              </Button>
            </div>

            <div className="relative w-full max-w-sm mx-auto">
              <div
                className={`grid grid-cols-4 gap-2 p-4 bg-gray-700 rounded-lg touch-none select-none shadow-lg ${gameStarted ? "game-board" : ""}`}
                style={{ 
                  width: BOARD_SIZE * CELL_SIZE + 32, // 加上内边距
                  height: BOARD_SIZE * CELL_SIZE + 32, // 加上内边距
                  maxWidth: '100%',
                  margin: '0 auto',
                }}
                onTouchEnd={handleTouchEnd}
                onTouchStart={handleTouchStart}
              >
                {board.map((row, i) =>
                  row.map((cell, j) => {
                    const tileKey = `${i}-${j}`;
                    const isNew = newTiles.has(tileKey);
                    const isMerged = mergedTiles.has(tileKey);

                    return (
                      <div
                        key={tileKey}
                        className={`flex items-center justify-center text-xl font-bold rounded-lg border-2 tile ${
                          cell === 0
                            ? "bg-gray-700 border-gray-600"
                            : `${getTileColor(cell)} border-gray-500 text-white shadow-md`
                        } ${isNew ? "tile-appear" : ""} ${
                          isMerged ? "tile-merge" : ""
                        }`}
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          boxShadow: cell > 0 ? '0 4px 6px rgba(0, 0, 0, 0.3)' : 'none',
                          zIndex: isNew || isMerged ? 10 : 1,
                        }}
                      >
                        {cell !== 0 ? cell : ""}
                      </div>
                    );
                  }),
                )}
              </div>
            </div>

            {won && !gameOver && (
              <div className="text-center bg-green-900/30 p-4 rounded-lg w-full animate-pulse fade-in">
                <p className="text-xl font-bold text-green-300 mb-2">恭喜获胜!</p>
                <p className="text-lg text-green-200">你达到了2048!</p>
              </div>
            )}

            {gameOver && (
              <div className="text-center bg-red-900/30 p-4 rounded-lg w-full animate-pulse fade-in">
                <p className="text-xl font-bold text-red-300 mb-2">游戏结束!</p>
                <p className="text-lg text-red-200">最终得分: {score}</p>
              </div>
            )}

            <div className="text-sm text-gray-300 text-center bg-gray-700/50 p-3 rounded-lg w-full fade-in">
              <p className="font-medium mb-1">游戏说明</p>
              <p>使用方向键或触摸滑动移动方块</p>
              <p>相同数字的方块会合并</p>
              <p>达到2048获得胜利</p>
            </div>

            {isMobile && (
              <div className="w-full mt-4 fade-in">
                <MobileControls
                  className="w-full"
                  onDirection={handleDirectionChange}
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

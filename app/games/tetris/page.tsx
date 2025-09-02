"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import { MobileControls } from "@/components/mobile-controls";

interface Position {
  x: number;
  y: number;
}

interface Tetromino {
  id: string;
  shape: number[][];
  position: Position;
  type: string;
  color: string;
}

interface GameStats {
  score: number;
  level: number;
  lines: number;
  combo: number;
}

const TETROMINOS = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: 'from-cyan-400 to-cyan-600'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: 'from-yellow-400 to-yellow-600'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: 'from-purple-400 to-purple-600'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: 'from-green-400 to-green-600'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: 'from-red-400 to-red-600'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: 'from-blue-400 to-blue-600'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: 'from-orange-400 to-orange-600'
  },
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BASE_SPEED = 1000;
const SPEED_DECREASE = 50;

export default function TetrisGame() {
  const [board, setBoard] = useState<number[][]>([]);
  const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null);
  const [nextPiece, setNextPiece] = useState<Tetromino | null>(null);
  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    level: 1,
    lines: 0,
    combo: 0
  });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [clearingLines, setClearingLines] = useState<number[]>([]);
  const [rotating, setRotating] = useState<boolean>(false);
  const [scoreAnimation, setScoreAnimation] = useState<boolean>(false);
  const [ghostPiece, setGhostPiece] = useState<Tetromino | null>(null);
  const [cellSize, setCellSize] = useState<number>(20);
  const [boardSize, setBoardSize] = useState<{ width: number; height: number }>({ width: 200, height: 400 });
  const isMobile = useMobile();
  const gameRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const dropTimeRef = useRef<number>(0);

  // 动态调整游戏板大小
  useEffect(() => {
    const updateBoardSize = () => {
      if (isMobile) {
        const screenWidth = window.innerWidth;
        const maxWidth = Math.min(screenWidth - 48, 400);
        const newCellSize = Math.floor(maxWidth / BOARD_WIDTH);
        const newBoardSize = {
          width: newCellSize * BOARD_WIDTH,
          height: newCellSize * BOARD_HEIGHT
        };
        setCellSize(newCellSize);
        setBoardSize(newBoardSize);
      } else {
        setCellSize(20);
        setBoardSize({ width: 200, height: 400 });
      }
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, [isMobile]);

  // 创建新方块
  const createNewPiece = useCallback((): Tetromino => {
    const pieces = Object.keys(TETROMINOS);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    const pieceData = TETROMINOS[randomPiece as keyof typeof TETROMINOS];

    return {
      id: `piece-${Date.now()}`,
      shape: pieceData.shape,
      position: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 },
      type: randomPiece,
      color: pieceData.color
    };
  }, []);

  // 检查移动是否有效
  const isValidMove = useCallback(
    (piece: Tetromino, newPosition: Position): boolean => {
      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            const newX = newPosition.x + x;
            const newY = newPosition.y + y;

            if (
              newX < 0 ||
              newX >= BOARD_WIDTH ||
              newY >= BOARD_HEIGHT ||
              (newY >= 0 && board[newY][newX])
            ) {
              return false;
            }
          }
        }
      }
      return true;
    },
    [board],
  );

  // 计算幽灵方块位置
  const calculateGhostPiece = useCallback((piece: Tetromino) => {
    if (!piece) return null;
    
    let ghostY = piece.position.y;
    while (isValidMove(piece, { ...piece.position, y: ghostY + 1 })) {
      ghostY++;
    }
    
    return {
      ...piece,
      id: 'ghost',
      position: { ...piece.position, y: ghostY }
    };
  }, [isValidMove]);

  // 放置方块
  const placePiece = useCallback(
    (piece: Tetromino) => {
      const newBoard = board.map((row) => [...row]);

      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            const boardY = piece.position.y + y;
            const boardX = piece.position.x + x;

            if (boardY >= 0) {
              newBoard[boardY][boardX] = piece.type.charCodeAt(0);
            }
          }
        }
      }

      setBoard(newBoard);
    },
    [board],
  );

  // 消除行
  const clearLines = useCallback(() => {
    const linesToClear: number[] = [];
    
    // 找出需要消除的行
    board.forEach((row, index) => {
      if (row.every((cell) => cell !== 0)) {
        linesToClear.push(index);
      }
    });

    if (linesToClear.length > 0) {
      // 设置消除动画
      setClearingLines(linesToClear);
      
      // 延迟执行消除逻辑，让动画有时间播放
      setTimeout(() => {
        const newBoard = board.filter((_, index) => !linesToClear.includes(index));
        const linesCleared = linesToClear.length;
        
        // 计算分数和连击
        const baseScore = linesCleared * 100;
        const levelBonus = gameStats.level * 10;
        const comboBonus = gameStats.combo * 50;
        const totalScore = baseScore + levelBonus + comboBonus;
        
        setGameStats(prev => {
          const newLines = prev.lines + linesCleared;
          const newLevel = Math.floor(newLines / 10) + 1;
          const newCombo = prev.combo + 1;
          
          return {
            ...prev,
            score: prev.score + totalScore,
            lines: newLines,
            level: newLevel,
            combo: newCombo
          };
        });
        
        setScoreAnimation(true);
        setTimeout(() => setScoreAnimation(false), 300);
        
        // 添加新行
        const newRows = Array(linesCleared)
          .fill(null)
          .map(() => Array(BOARD_WIDTH).fill(0));

        setBoard([...newRows, ...newBoard]);
        setClearingLines([]);
      }, 300);
    } else {
      // 没有消除行，重置连击
      setGameStats(prev => ({ ...prev, combo: 0 }));
    }
  }, [board, gameStats.level, gameStats.combo]);

  // 移动方块
  const movePiece = useCallback(
    (direction: "left" | "right" | "down") => {
      if (!currentPiece || gameOver || isPaused) return;

      const newPosition = { ...currentPiece.position };

      switch (direction) {
        case "left":
          newPosition.x -= 1;
          break;
        case "right":
          newPosition.x += 1;
          break;
        case "down":
          newPosition.y += 1;
          break;
      }

      if (isValidMove(currentPiece, newPosition)) {
        const updatedPiece = { ...currentPiece, position: newPosition };
        setCurrentPiece(updatedPiece);
        setGhostPiece(calculateGhostPiece(updatedPiece));
      } else if (direction === "down") {
        placePiece(currentPiece);
        clearLines();
        
        // 生成新方块
        const newPiece = nextPiece || createNewPiece();
        const nextNewPiece = createNewPiece();
        
        if (!isValidMove(newPiece, newPiece.position)) {
          setGameOver(true);
        } else {
          setCurrentPiece(newPiece);
          setNextPiece(nextNewPiece);
          setGhostPiece(calculateGhostPiece(newPiece));
        }
      }
    },
    [currentPiece, gameOver, isPaused, isValidMove, placePiece, clearLines, nextPiece, createNewPiece, calculateGhostPiece],
  );

  // 旋转方块
  const rotatePiece = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || rotating) return;

    setRotating(true);
    
    const rotatedShape = currentPiece.shape[0].map((_, index) =>
      currentPiece.shape.map((row) => row[index]).reverse(),
    );

    const rotatedPiece = { ...currentPiece, shape: rotatedShape };

    if (isValidMove(rotatedPiece, rotatedPiece.position)) {
      setCurrentPiece(rotatedPiece);
      setGhostPiece(calculateGhostPiece(rotatedPiece));
    }
    
    setTimeout(() => setRotating(false), 200);
  }, [currentPiece, gameOver, isPaused, rotating, isValidMove, calculateGhostPiece]);

  // 硬降落
  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;
    
    let dropDistance = 0;
    while (isValidMove(currentPiece, { ...currentPiece.position, y: currentPiece.position.y + 1 })) {
      dropDistance++;
    }
    
    if (dropDistance > 0) {
      const newPosition = { ...currentPiece.position, y: currentPiece.position.y + dropDistance };
      const droppedPiece = { ...currentPiece, position: newPosition };
      
      setCurrentPiece(droppedPiece);
      placePiece(droppedPiece);
      clearLines();
      
      const newPiece = nextPiece || createNewPiece();
      const nextNewPiece = createNewPiece();
      
      if (!isValidMove(newPiece, newPiece.position)) {
        setGameOver(true);
      } else {
        setCurrentPiece(newPiece);
        setNextPiece(nextNewPiece);
        setGhostPiece(calculateGhostPiece(newPiece));
      }
    }
  }, [currentPiece, gameOver, isPaused, isValidMove, placePiece, clearLines, nextPiece, createNewPiece, calculateGhostPiece]);

  // 重置游戏
  const resetGame = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)));
    setCurrentPiece(null);
    setNextPiece(null);
    setGhostPiece(null);
    setGameStats({ score: 0, level: 1, lines: 0, combo: 0 });
    setGameOver(false);
    setGameStarted(false);
    setIsPaused(false);
    setClearingLines([]);
    setRotating(false);
    setScoreAnimation(false);
    
    setTimeout(() => {
      const newPiece = createNewPiece();
      const nextNewPiece = createNewPiece();
      setCurrentPiece(newPiece);
      setNextPiece(nextNewPiece);
      setGhostPiece(calculateGhostPiece(newPiece));
    }, 100);
  };

  // 处理方向改变
  const handleDirectionChange = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (!gameStarted) {
        setGameStarted(true);
        return;
      }

      switch (direction) {
        case "left":
          movePiece("left");
          break;
        case "right":
          movePiece("right");
          break;
        case "down":
          movePiece("down");
          break;
        case "up":
          rotatePiece();
          break;
      }
    },
    [gameStarted, movePiece, rotatePiece],
  );

  // 游戏循环
  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      const speed = Math.max(BASE_SPEED - (gameStats.level - 1) * SPEED_DECREASE, 100);
      
      gameLoopRef.current = setInterval(() => {
        dropTimeRef.current += speed;
        if (dropTimeRef.current >= speed) {
          movePiece("down");
          dropTimeRef.current = 0;
        }
      }, 16); // 60 FPS
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, isPaused, gameStats.level, movePiece]);

  // 触摸控制
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const minSwipeDistance = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        handleDirectionChange(deltaX > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          handleDirectionChange('down');
        } else {
          handleDirectionChange('up');
        }
      }
    }

    setTouchStart(null);
  };

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handleDirectionChange('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleDirectionChange('right');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleDirectionChange('down');
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleDirectionChange('up');
          break;
        case ' ':
          e.preventDefault();
          if (e.shiftKey) {
            hardDrop();
          } else {
            setIsPaused(prev => !prev);
          }
          break;
        case 'z':
        case 'Z':
          e.preventDefault();
          rotatePiece();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleDirectionChange, gameOver, hardDrop, rotatePiece]);

  // 初始化游戏
  useEffect(() => {
    resetGame();
  }, []);

  // 渲染游戏板
  const renderBoard = () => {
    const displayBoard = board.map((row) => [...row]);

    // 添加当前方块
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = currentPiece.position.y + y;
            const boardX = currentPiece.position.x + x;

            if (
              boardY >= 0 &&
              boardY < BOARD_HEIGHT &&
              boardX >= 0 &&
              boardX < BOARD_WIDTH
            ) {
              displayBoard[boardY][boardX] = currentPiece.type.charCodeAt(0);
            }
          }
        }
      }
    }

    return displayBoard;
  };

  // 获取方块颜色
  const getBlockColor = (value: number) => {
    if (value === 0) return 'bg-gray-800';
    
    const char = String.fromCharCode(value);
    const pieceData = TETROMINOS[char as keyof typeof TETROMINOS];
    return pieceData ? pieceData.color : 'bg-gray-600';
  };

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <style>{`
        @keyframes lineClear {
          0% {
            background-color: rgba(255, 255, 255, 0.8);
            transform: scaleX(1);
          }
          50% {
            background-color: rgba(255, 255, 255, 1);
            transform: scaleX(1.05);
          }
          100% {
            background-color: rgba(255, 255, 255, 0);
            transform: scaleX(0);
            opacity: 0;
          }
        }
        
        @keyframes pieceRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(90deg);
          }
        }
        
        @keyframes scoreUpdate {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
            color: #3b82f6;
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
        
        @keyframes pieceFall {
          0% {
            transform: translateY(-20px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .line-clear {
          animation: lineClear 0.3s ease-out forwards;
        }
        
        .piece-rotate {
          animation: pieceRotate 0.2s ease-out;
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
        
        .piece-fall {
          animation: pieceFall 0.3s ease-out;
        }
        
        .tetris-block {
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .game-board {
          background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        .grid-cell {
          background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
          border: 1px solid rgba(75, 85, 99, 0.3);
        }
        
        .ghost-piece {
          opacity: 0.3;
          border: 2px dashed rgba(255, 255, 255, 0.5);
        }
      `}</style>

      <div className="w-full max-w-4xl">
        <div className="text-center mb-6 fade-in">
          <h1 className={title({ size: "lg", fullWidth: true, color: "blue" })}>俄罗斯方块</h1>
          <div className={subtitle({ class: "mt-2 text-gray-300" })}>
            旋转和移动方块，消除完整的行
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 游戏信息 */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-gray-800/50 border-gray-700/50 shadow-2xl backdrop-blur-sm">
              <CardBody className="p-4">
                <div className="space-y-4">
                  {/* 分数 */}
                  <div className="text-center">
                    <p className="text-sm text-gray-400">得分</p>
                    <p className={`text-2xl font-bold text-white ${scoreAnimation ? "score-update" : ""}`}>
                      {gameStats.score.toLocaleString()}
                    </p>
                  </div>
                  
                  {/* 等级和行数 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">等级</p>
                      <p className="text-lg font-bold text-white">{gameStats.level}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-400">行数</p>
                      <p className="text-lg font-bold text-white">{gameStats.lines}</p>
                    </div>
                  </div>
                  
                  {/* 连击 */}
                  {gameStats.combo > 0 && (
                    <div className="text-center">
                      <p className="text-sm text-gray-400">连击</p>
                      <p className="text-lg font-bold text-yellow-400">{gameStats.combo}x</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* 下一个方块 */}
            <Card className="bg-gray-800/50 border-gray-700/50 shadow-2xl backdrop-blur-sm">
              <CardBody className="p-4">
                <p className="text-sm text-gray-400 text-center mb-3">下一个</p>
                {nextPiece && (
                  <div className="flex justify-center">
                    <div className="grid gap-1" style={{
                      gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, ${Math.min(cellSize, 24)}px)`,
                      gridTemplateRows: `repeat(${nextPiece.shape.length}, ${Math.min(cellSize, 24)}px)`
                    }}>
                      {nextPiece.shape.map((row, y) =>
                        row.map((cell, x) => (
                          <div
                            key={`${x}-${y}`}
                            className={`rounded-sm ${
                              cell ? `bg-gradient-to-br ${nextPiece.color}` : 'bg-transparent'
                            }`}
                            style={{
                              width: Math.min(cellSize, 24) - 2,
                              height: Math.min(cellSize, 24) - 2,
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* 控制按钮 */}
            <div className="space-y-2">
              <Button
                color="secondary"
                size="sm"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
                onPress={() => setIsPaused(prev => !prev)}
              >
                {isPaused ? '继续' : '暂停'}
              </Button>
              
              <Button
                color="primary"
                size="sm"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
                onPress={resetGame}
              >
                重新开始
              </Button>
            </div>
          </div>

          {/* 游戏板 */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800/50 border-gray-700/50 shadow-2xl slide-in backdrop-blur-sm">
              <CardBody className="flex flex-col items-center gap-6 p-6">
                <div className="relative w-full flex justify-center">
                  <div
                    ref={gameRef}
                    className="game-board rounded-xl p-4 touch-none select-none"
                    style={{
                      width: boardSize.width + 32,
                      height: boardSize.height + 32,
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  >
                    {/* 背景网格 */}
                    <div className="absolute inset-4 grid gap-px" style={{
                      gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${cellSize}px)`,
                      gridTemplateRows: `repeat(${BOARD_HEIGHT}, ${cellSize}px)`
                    }}>
                      {Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }).map((_, index) => (
                        <div
                          key={index}
                          className="grid-cell"
                          style={{
                            width: cellSize - 1,
                            height: cellSize - 1,
                          }}
                        />
                      ))}
                    </div>

                    {/* 消除行的动画 */}
                    {clearingLines.map((lineIndex) => (
                      <div
                        key={`clear-${lineIndex}`}
                        className="absolute w-full bg-white line-clear"
                        style={{
                          top: lineIndex * cellSize,
                          left: 0,
                          height: cellSize - 2,
                        }}
                      />
                    ))}

                    {/* 幽灵方块 */}
                    {ghostPiece && (
                      <>
                        {ghostPiece.shape.map((row, y) =>
                          row.map((cell, x) => (
                            cell && (
                              <div
                                key={`ghost-${x}-${y}`}
                                className="absolute ghost-piece bg-gray-600/50"
                                style={{
                                  width: cellSize - 2,
                                  height: cellSize - 2,
                                  left: (ghostPiece.position.x + x) * cellSize + 1,
                                  top: (ghostPiece.position.y + y) * cellSize + 1,
                                }}
                              />
                            )
                          ))
                        )}
                      </>
                    )}

                    {/* 游戏方块 */}
                    {renderBoard().map((row, y) =>
                      row.map((cell, x) => {
                        const isClearing = clearingLines.includes(y);
                        const isCurrentPiece = cell !== 0 && currentPiece && 
                          y >= currentPiece.position.y && 
                          y < currentPiece.position.y + currentPiece.shape.length &&
                          x >= currentPiece.position.x && 
                          x < currentPiece.position.x + currentPiece.shape[0].length;
                        
                        return (
                          <div
                            key={`${x}-${y}`}
                            className={`absolute tetris-block ${
                              cell !== 0 ? getBlockColor(cell) : ''
                            } ${isClearing ? 'opacity-0' : ''} ${
                              isCurrentPiece && rotating ? 'piece-rotate' : ''
                            } ${isCurrentPiece ? 'piece-fall' : ''}`}
                            style={{
                              width: cellSize - 2,
                              height: cellSize - 2,
                              left: x * cellSize + 1,
                              top: y * cellSize + 1,
                              boxShadow: cell !== 0 ? '0 0 4px rgba(59, 130, 246, 0.5)' : 'none',
                              zIndex: isCurrentPiece ? 10 : 1,
                            }}
                          />
                        );
                      }),
                    )}
                  </div>
                </div>

                {/* 游戏状态提示 */}
                {!gameStarted && (
                  <div className="text-center bg-gradient-to-r from-blue-900/50 to-indigo-900/50 p-4 rounded-xl w-full fade-in border border-blue-500/30">
                    <p className="text-lg font-semibold text-blue-300 mb-2">🎮 准备开始</p>
                    <p className="text-blue-200">按任意方向键开始游戏</p>
                  </div>
                )}

                {isPaused && (
                  <div className="text-center bg-gradient-to-r from-yellow-900/50 to-orange-900/50 p-4 rounded-xl w-full fade-in border border-yellow-500/30">
                    <p className="text-lg font-semibold text-yellow-300 mb-2">⏸️ 游戏暂停</p>
                    <p className="text-yellow-200">按空格键继续游戏</p>
                  </div>
                )}

                {gameOver && (
                  <div className="text-center bg-gradient-to-r from-red-900/50 to-pink-900/50 p-4 rounded-xl w-full animate-pulse fade-in border border-red-500/30">
                    <p className="text-xl font-bold text-red-300 mb-2">💀 游戏结束!</p>
                    <p className="text-lg text-red-200">最终得分: {gameStats.score.toLocaleString()}</p>
                  </div>
                )}

                {/* 游戏说明 */}
                <div className="text-sm text-gray-300 text-center bg-gray-700/30 p-4 rounded-xl w-full fade-in border border-gray-600/30">
                  <p className="font-medium mb-2 text-gray-200">🎮 操作说明</p>
                  <p>← → 移动方块</p>
                  <p>↓ 加速下落</p>
                  <p>↑ 或 Z 旋转方块</p>
                  <p>Shift + 空格 硬降落</p>
                  <p>空格 暂停/继续</p>
                </div>

                {/* 移动端控制 */}
                {isMobile && (
                  <div className="w-full mt-4 fade-in">
                    <MobileControls
                      className="w-full"
                      onDirection={handleDirectionChange}
                      cellSize={cellSize}
                      variant="game"
                    />
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

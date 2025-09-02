"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";

import { MobileControls } from "@/components/mobile-controls";
import { useMobile } from "@/hooks/use-mobile";
import { title, subtitle } from "@/components/primitives";

interface Position {
  x: number;
  y: number;
}

interface Tetromino {
  shape: number[][];
  position: Position;
}

const TETROMINOS = {
  I: {
    shape: [[1, 1, 1, 1]],
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
  },
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

export default function TetrisGame() {
  const [board, setBoard] = useState<number[][]>(
    Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill(0)),
  );
  const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null);
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [clearingLines, setClearingLines] = useState<number[]>([]);
  const [rotating, setRotating] = useState<boolean>(false);
  const [scoreAnimation, setScoreAnimation] = useState<boolean>(false);
  const isMobile = useMobile();
  const [CELL_SIZE, setCELL_SIZE] = useState(20);
  
  // 根据屏幕宽度动态调整单元格大小
  useEffect(() => {
    const updateCellSize = () => {
      if (isMobile) {
        // 在移动端，根据屏幕宽度计算合适的单元格大小
        const screenWidth = window.innerWidth;
        const maxGameWidth = screenWidth - 64; // 减去边距
        const newSize = Math.min(20, Math.floor(maxGameWidth / BOARD_WIDTH));
        setCELL_SIZE(newSize);
      } else {
        setCELL_SIZE(20);
      }
    };
    
    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    
    return () => window.removeEventListener('resize', updateCellSize);
  }, [isMobile]);

  const createNewPiece = useCallback((): Tetromino => {
    const pieces = Object.keys(TETROMINOS);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];

    return {
      shape: TETROMINOS[randomPiece as keyof typeof TETROMINOS].shape,
      position: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 },
    };
  }, []);

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

  const placePiece = useCallback(
    (piece: Tetromino) => {
      const newBoard = board.map((row) => [...row]);

      for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (piece.shape[y][x]) {
            const boardY = piece.position.y + y;
            const boardX = piece.position.x + x;

            if (boardY >= 0) {
              newBoard[boardY][boardX] = 1;
            }
          }
        }
      }

      setBoard(newBoard);
    },
    [board],
  );

  const clearLines = useCallback(() => {
    const linesToClear: number[] = [];
    
    // 找出需要消除的行
    board.forEach((row, index) => {
      if (row.every((cell) => cell === 1)) {
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
        
        setScore((prev) => {
          const newScore = prev + linesCleared * 100;
          setScoreAnimation(true);
          setTimeout(() => setScoreAnimation(false), 300);
          return newScore;
        });
        
        const newRows = Array(linesCleared)
          .fill(null)
          .map(() => Array(BOARD_WIDTH).fill(0));

        setBoard([...newRows, ...newBoard]);
        setClearingLines([]);
      }, 300); // 动画持续时间
    }
  }, [board, BOARD_WIDTH]);

  const movePiece = useCallback(
    (direction: "left" | "right" | "down") => {
      if (!currentPiece || gameOver) return;

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
        setCurrentPiece({ ...currentPiece, position: newPosition });
      } else if (direction === "down") {
        placePiece(currentPiece);
        clearLines();
        const newPiece = createNewPiece();

        if (!isValidMove(newPiece, newPiece.position)) {
          setGameOver(true);
        } else {
          setCurrentPiece(newPiece);
        }
      }
    },
    [
      currentPiece,
      gameOver,
      isValidMove,
      placePiece,
      clearLines,
      createNewPiece,
    ],
  );

  const rotatePiece = useCallback(() => {
    if (!currentPiece || gameOver) return;

    setRotating(true);
    
    const rotatedShape = currentPiece.shape[0].map((_, index) =>
      currentPiece.shape.map((row) => row[index]).reverse(),
    );

    const rotatedPiece = { ...currentPiece, shape: rotatedShape };

    if (isValidMove(rotatedPiece, rotatedPiece.position)) {
      setCurrentPiece(rotatedPiece);
    }
    
    // 重置旋转状态，允许再次旋转
    setTimeout(() => setRotating(false), 200);
  }, [currentPiece, gameOver, isValidMove]);

  const resetGame = () => {
    setBoard(
      Array(BOARD_HEIGHT)
        .fill(null)
        .map(() => Array(BOARD_WIDTH).fill(0)),
    );
    setCurrentPiece(createNewPiece());
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
  };

  const handleDirectionChange = (
    direction: "up" | "down" | "left" | "right",
  ) => {
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
  };

  useEffect(() => {
    if (!gameStarted) return;

    const interval = setInterval(() => {
      movePiece("down");
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted, movePiece]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted) {
        setGameStarted(true);

        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          movePiece("left");
          break;
        case "ArrowRight":
          movePiece("right");
          break;
        case "ArrowDown":
          movePiece("down");
          break;
        case "ArrowUp":
          rotatePiece();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameStarted, movePiece, rotatePiece]);

  const renderBoard = () => {
    const displayBoard = board.map((row) => [...row]);

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
              displayBoard[boardY][boardX] = 2; // 当前方块用2表示
            }
          }
        }
      }
    }

    return displayBoard;
  };

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 px-4">
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
            transform: translateY(10px);
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
          animation: fadeIn 0.5s ease-out;
        }
        
        .slide-in {
          animation: slideIn 0.3s ease-out;
        }
        
        .piece-fall {
          animation: pieceFall 0.3s ease-out;
        }
        
        .tetris-block {
          transition: all 0.15s ease-out;
        }
      `}</style>
      <div className="w-full max-w-md">
        <div className="text-center mb-6 fade-in">
          <h1 className={title({ size: "lg", fullWidth: true })}>俄罗斯方块</h1>
          <div className={subtitle({ class: "mt-2" })}>
            旋转和移动方块，消除完整的行
          </div>
        </div>

        <Card className="w-full bg-gray-800 border-gray-700 shadow-xl slide-in">
          <CardBody className="flex flex-col items-center gap-6 p-6">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                  </svg>
                </div>
                <span className={`text-xl font-bold text-white ${scoreAnimation ? 'score-update' : ''}`}>得分: {score}</span>
              </div>
              <Button
                color="primary"
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium transition-all duration-300 transform hover:scale-105"
                onPress={resetGame}
              >
                重新开始
              </Button>
            </div>

            <div className="relative w-full max-w-sm mx-auto">
              <div
                className="border-4 border-gray-700 bg-gray-900 rounded-lg overflow-hidden shadow-lg"
                style={{
                  width: BOARD_WIDTH * CELL_SIZE + (BOARD_WIDTH - 1) * Math.max(1, Math.floor(CELL_SIZE * 0.05)),
                  height: BOARD_HEIGHT * CELL_SIZE + (BOARD_HEIGHT - 1) * Math.max(1, Math.floor(CELL_SIZE * 0.05)),
                  position: "relative",
                  maxWidth: '100%',
                  margin: '0 auto',
                }}
              >
                {/* 网格背景 */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 opacity-30"></div>
                
                {/* 消除行的动画 */}
                {clearingLines.map((lineIndex) => (
                  <div
                    key={`clear-${lineIndex}`}
                    className="absolute w-full h-5 bg-white line-clear"
                    style={{
                      top: lineIndex * CELL_SIZE,
                      left: 0,
                      height: CELL_SIZE - 2,
                    }}
                  />
                ))}
                
                {renderBoard().map((row, y) =>
                  row.map((cell, x) => {
                    const isClearing = clearingLines.includes(y);
                    const isCurrentPiece = cell === 2;
                    
                    return (
                      <div
                        key={`${x}-${y}`}
                        className={`absolute border border-gray-700 tetris-block ${
                          cell === 1
                            ? "bg-gradient-to-br from-blue-400 to-blue-600"
                            : cell === 2
                              ? "bg-gradient-to-br from-green-400 to-green-600"
                              : "bg-gray-800"
                        } ${isClearing ? 'opacity-0' : ''} ${isCurrentPiece && rotating ? 'piece-rotate' : ''} ${isCurrentPiece ? 'piece-fall' : ''}`}
                        style={{
                          width: CELL_SIZE - 2,
                          height: CELL_SIZE - 2,
                          left: x * CELL_SIZE + 1,
                          top: y * CELL_SIZE + 1,
                          boxShadow: cell > 0 ? '0 0 4px rgba(59, 130, 246, 0.5)' : 'none',
                          zIndex: isCurrentPiece ? 10 : 1,
                        }}
                      />
                    );
                  }),
                )}
              </div>
            </div>

            {!gameStarted && (
              <div className="text-center bg-blue-900/30 p-4 rounded-lg w-full fade-in">
                <p className="text-lg font-semibold text-blue-300 mb-2">准备开始</p>
                <p className="text-blue-200">按任意方向键开始游戏</p>
              </div>
            )}

            {gameOver && (
              <div className="text-center bg-red-900/30 p-4 rounded-lg w-full animate-pulse fade-in">
                <p className="text-xl font-bold text-red-300 mb-2">游戏结束!</p>
                <p className="text-lg text-red-200">最终得分: {score}</p>
              </div>
            )}

            <div className="text-sm text-gray-300 text-center bg-gray-700/50 p-3 rounded-lg w-full fade-in">
              <p className="font-medium mb-1">操作说明</p>
              <p>← → 移动方块</p>
              <p>↓ 加速下落</p>
              <p>↑ 旋转方块</p>
            </div>

            {isMobile && (
              <div className="w-full mt-4 fade-in">
                <MobileControls
                  className="w-full"
                  onDirection={handleDirectionChange}
                  cellSize={CELL_SIZE}
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

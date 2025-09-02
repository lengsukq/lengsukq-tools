"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";

import { MobileControls } from "@/components/mobile-controls";
import { useMobile } from "@/hooks/use-mobile";

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
  const isMobile = useMobile();

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
    const newBoard = board.filter((row) => !row.every((cell) => cell === 1));
    const linesCleared = board.length - newBoard.length;

    if (linesCleared > 0) {
      setScore((prev) => prev + linesCleared * 100);
      const newRows = Array(linesCleared)
        .fill(null)
        .map(() => Array(BOARD_WIDTH).fill(0));

      setBoard([...newRows, ...newBoard]);
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

    const rotatedShape = currentPiece.shape[0].map((_, index) =>
      currentPiece.shape.map((row) => row[index]).reverse(),
    );

    const rotatedPiece = { ...currentPiece, shape: rotatedShape };

    if (isValidMove(rotatedPiece, rotatedPiece.position)) {
      setCurrentPiece(rotatedPiece);
    }
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
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10 bg-gray-900 min-h-screen">
      <div className="inline-block text-center justify-center mb-4">
        <h1 className="text-3xl font-bold text-white">俄罗斯方块</h1>
        <p className="text-gray-300 mt-2">旋转和移动方块，消除完整的行</p>
      </div>

      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardBody className="flex flex-col items-center gap-4">
          <div className="flex justify-between w-full">
            <span className="text-lg font-semibold text-white">
              得分: {score}
            </span>
            <Button
              color="primary"
              size="sm"
              variant="flat"
              onPress={resetGame}
            >
              重新开始
            </Button>
          </div>

          <div
            className="border-2 border-gray-600 bg-gray-900"
            style={{
              width: BOARD_WIDTH * 20,
              height: BOARD_HEIGHT * 20,
              position: "relative",
            }}
          >
            {renderBoard().map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`absolute border border-gray-600 ${
                    cell === 1
                      ? "bg-blue-500"
                      : cell === 2
                        ? "bg-green-500"
                        : "bg-gray-800"
                  }`}
                  style={{
                    width: 18,
                    height: 18,
                    left: x * 20 + 1,
                    top: y * 20 + 1,
                  }}
                />
              )),
            )}
          </div>

          {!gameStarted && (
            <div className="text-center">
              <p className="text-lg font-semibold mb-2 text-white">
                按任意方向键开始游戏
              </p>
            </div>
          )}

          {gameOver && (
            <div className="text-center">
              <p className="text-xl font-bold text-red-500 mb-2">游戏结束!</p>
              <p className="text-lg text-white">最终得分: {score}</p>
            </div>
          )}

          <div className="text-sm text-gray-300 text-center">
            <p>← → 移动方块</p>
            <p>↓ 加速下落</p>
            <p>↑ 旋转方块</p>
          </div>

          {isMobile && (
            <MobileControls
              className="mt-4"
              onDirection={handleDirectionChange}
            />
          )}
        </CardBody>
      </Card>
    </section>
  );
}

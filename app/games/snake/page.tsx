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

export default function SnakeGame() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<string>("RIGHT");
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const isMobile = useMobile();

  const GRID_SIZE = 20;
  const CELL_SIZE = 20;

  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };

    setFood(newFood);
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection("RIGHT");
    setGameOver(false);
    setScore(0);
    setGameStarted(false);
    generateFood();
  };

  const handleDirectionChange = (newDirection: string) => {
    if (!gameStarted) {
      setGameStarted(true);
    }

    switch (newDirection) {
      case "UP":
        if (direction !== "DOWN") setDirection("UP");
        break;
      case "DOWN":
        if (direction !== "UP") setDirection("DOWN");
        break;
      case "LEFT":
        if (direction !== "RIGHT") setDirection("LEFT");
        break;
      case "RIGHT":
        if (direction !== "LEFT") setDirection("RIGHT");
        break;
    }
  };

  const moveSnake = useCallback(() => {
    if (gameOver || !gameStarted) return;

    setSnake((prevSnake) => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      switch (direction) {
        case "UP":
          head.y = (head.y - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case "DOWN":
          head.y = (head.y + 1) % GRID_SIZE;
          break;
        case "LEFT":
          head.x = (head.x - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case "RIGHT":
          head.x = (head.x + 1) % GRID_SIZE;
          break;
      }

      // 检查是否撞到自己
      if (
        newSnake.some((segment) => segment.x === head.x && segment.y === head.y)
      ) {
        setGameOver(true);

        return prevSnake;
      }

      newSnake.unshift(head);

      // 检查是否吃到食物
      if (head.x === food.x && head.y === food.y) {
        setScore((prev) => prev + 10);
        generateFood();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, gameOver, gameStarted, generateFood]);

  useEffect(() => {
    const interval = setInterval(moveSnake, 150);

    return () => clearInterval(interval);
  }, [moveSnake]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted) {
        setGameStarted(true);

        return;
      }

      switch (e.key) {
        case "ArrowUp":
          if (direction !== "DOWN") setDirection("UP");
          break;
        case "ArrowDown":
          if (direction !== "UP") setDirection("DOWN");
          break;
        case "ArrowLeft":
          if (direction !== "RIGHT") setDirection("LEFT");
          break;
        case "ArrowRight":
          if (direction !== "LEFT") setDirection("RIGHT");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [direction, gameStarted]);

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10">
      <div className="inline-block text-center justify-center mb-4">
        <h1 className="text-3xl font-bold">贪食蛇</h1>
        <p className="text-default-500 mt-2">
          使用方向键控制蛇的移动，吃到食物让蛇变长
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardBody className="flex flex-col items-center gap-4">
          <div className="flex justify-between w-full">
            <span className="text-lg font-semibold">得分: {score}</span>
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
              width: GRID_SIZE * CELL_SIZE,
              height: GRID_SIZE * CELL_SIZE,
              position: "relative",
            }}
          >
            {/* 蛇身 */}
            {snake.map((segment, index) => (
              <div
                key={index}
                className="absolute bg-green-500 rounded-sm"
                style={{
                  width: CELL_SIZE - 2,
                  height: CELL_SIZE - 2,
                  left: segment.x * CELL_SIZE + 1,
                  top: segment.y * CELL_SIZE + 1,
                }}
              />
            ))}

            {/* 食物 */}
            <div
              className="absolute bg-red-500 rounded-full"
              style={{
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
                left: food.x * CELL_SIZE + 1,
                top: food.y * CELL_SIZE + 1,
              }}
            />
          </div>

          {!gameStarted && (
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">按任意方向键开始游戏</p>
            </div>
          )}

          {gameOver && (
            <div className="text-center">
              <p className="text-xl font-bold text-red-500 mb-2">游戏结束!</p>
              <p className="text-lg">最终得分: {score}</p>
            </div>
          )}

          <div className="text-sm text-gray-600 text-center">
            <p>使用方向键控制蛇的移动</p>
            <p>吃到红色食物可以增加分数</p>
          </div>

          {isMobile && (
            <MobileControls
              className="mt-4"
              onDirection={(direction) =>
                handleDirectionChange(direction.toUpperCase())
              }
            />
          )}
        </CardBody>
      </Card>
    </section>
  );
}

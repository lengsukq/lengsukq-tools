"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";

const BOARD_SIZE = 4;

export default function Game2048() {
  const [board, setBoard] = useState<number[][]>([]);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [won, setWon] = useState<boolean>(false);

  const initializeBoard = useCallback(() => {
    const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setWon(false);
  }, []);

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
    }
  }, []);

  const moveLeft = useCallback((boardState: number[][]): boolean => {
    let moved = false;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = boardState[i].filter(cell => cell !== 0);
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1]) {
          row[j] *= 2;
          row.splice(j + 1, 1);
          moved = true;
        }
      }
      const newRow = row.concat(Array(BOARD_SIZE - row.length).fill(0));
      if (JSON.stringify(boardState[i]) !== JSON.stringify(newRow)) {
        moved = true;
      }
      boardState[i] = newRow;
    }
    return moved;
  }, []);

  const moveRight = useCallback((boardState: number[][]): boolean => {
    let moved = false;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = boardState[i].filter(cell => cell !== 0);
      for (let j = row.length - 1; j > 0; j--) {
        if (row[j] === row[j - 1]) {
          row[j] *= 2;
          row.splice(j - 1, 1);
          moved = true;
        }
      }
      const newRow = Array(BOARD_SIZE - row.length).fill(0).concat(row);
      if (JSON.stringify(boardState[i]) !== JSON.stringify(newRow)) {
        moved = true;
      }
      boardState[i] = newRow;
    }
    return moved;
  }, []);

  const moveUp = useCallback((boardState: number[][]): boolean => {
    let moved = false;
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
    return moved;
  }, []);

  const moveDown = useCallback((boardState: number[][]): boolean => {
    let moved = false;
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
    return moved;
  }, []);

  const move = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver) return;

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
      
      if (newScore > bestScore) {
        setBestScore(newScore);
      }

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
    }
  }, [board, gameOver, moveLeft, moveRight, moveUp, moveDown, addRandomTile, bestScore]);

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

  const resetGame = () => {
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
      0: 'bg-gray-200',
      2: 'bg-red-200',
      4: 'bg-orange-200',
      8: 'bg-yellow-200',
      16: 'bg-lime-200',
      32: 'bg-green-200',
      64: 'bg-teal-200',
      128: 'bg-blue-200',
      256: 'bg-indigo-200',
      512: 'bg-purple-200',
      1024: 'bg-pink-200',
      2048: 'bg-red-500 text-white',
    };
    return colors[value] || 'bg-gray-100';
  };

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10">
      <div className="inline-block text-center justify-center mb-4">
        <h1 className="text-3xl font-bold">2048</h1>
        <p className="text-default-500 mt-2">
          数字益智游戏，通过滑动合并相同数字，达到2048获得胜利
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardBody className="flex flex-col items-center gap-4">
          <div className="flex justify-between w-full">
            <div className="text-center">
              <p className="text-sm text-gray-600">得分</p>
              <p className="text-lg font-semibold">{score}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">最高分</p>
              <p className="text-lg font-semibold">{bestScore}</p>
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
            className="grid grid-cols-4 gap-2 p-4 bg-gray-300 rounded-lg"
            style={{ width: BOARD_SIZE * 80 + 32, height: BOARD_SIZE * 80 + 32 }}
          >
            {board.map((row, i) =>
              row.map((cell, j) => (
                <div
                  key={`${i}-${j}`}
                  className={`w-20 h-20 flex items-center justify-center text-2xl font-bold rounded-lg border-2 ${
                    cell === 0 ? 'bg-gray-200 border-gray-300' : 
                    `${getTileColor(cell)} border-gray-400`
                  }`}
                >
                  {cell !== 0 ? cell : ''}
                </div>
              ))
            )}
          </div>

          {won && !gameOver && (
            <div className="text-center">
              <p className="text-xl font-bold text-green-500 mb-2">恭喜获胜!</p>
              <p className="text-lg">你达到了2048!</p>
            </div>
          )}

          {gameOver && (
            <div className="text-center">
              <p className="text-xl font-bold text-red-500 mb-2">游戏结束!</p>
              <p className="text-lg">最终得分: {score}</p>
            </div>
          )}

          <div className="text-sm text-gray-600 text-center">
            <p>使用方向键移动方块</p>
            <p>相同数字的方块会合并</p>
            <p>达到2048获得胜利</p>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}

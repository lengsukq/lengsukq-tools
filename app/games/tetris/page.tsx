"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import Link from "next/link";

// 游戏常量
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 30;
const MOBILE_CELL_SIZE = 20;
const INITIAL_SPEED = 1000;
const SPEED_INCREMENT = 50;
const MIN_SPEED = 100;

// 方块形状
const TETROMINOS = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: "bg-cyan-500"
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: "bg-blue-500"
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: "bg-orange-500"
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: "bg-yellow-500"
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: "bg-green-500"
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: "bg-purple-500"
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: "bg-red-500"
  }
};

type TetrominoType = keyof typeof TETROMINOS;
type BoardType = number[][];

// 游戏状态
enum GameState {
  READY = "ready",
  PLAYING = "playing",
  PAUSED = "paused",
  GAME_OVER = "game_over"
}

// 方块位置
interface Position {
  x: number;
  y: number;
}

// 当前方块
interface CurrentPiece {
  tetromino: TetrominoType;
  position: Position;
  shape: number[][];
}

export default function TetrisGame() {
  // 游戏状态
  const [board, setBoard] = useState<BoardType>([]);
  const [currentPiece, setCurrentPiece] = useState<CurrentPiece | null>(null);
  const [nextPiece, setNextPiece] = useState<TetrominoType>("I");
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [lines, setLines] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>(GameState.READY);
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED);
  const [cellSize, setCellSize] = useState<number>(CELL_SIZE);
  
  // 布局相关
  const isMobile = useMobile();
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  
  // 动态调整单元格大小
  useEffect(() => {
    setCellSize(isMobile ? MOBILE_CELL_SIZE : CELL_SIZE);
  }, [isMobile]);
  
  // 初始化游戏板
  const initializeBoard = useCallback((): BoardType => {
    return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
  }, []);
  
  // 创建新方块
  const createRandomPiece = useCallback((): TetrominoType => {
    const tetrominos = Object.keys(TETROMINOS) as TetrominoType[];
    return tetrominos[Math.floor(Math.random() * tetrominos.length)];
  }, []);
  
  // 初始化游戏
  const initializeGame = useCallback(() => {
    const newBoard = initializeBoard();
    setBoard(newBoard);
    
    const firstPiece = createRandomPiece();
    const next = createRandomPiece();
    
    setCurrentPiece({
      tetromino: firstPiece,
      position: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 },
      shape: TETROMINOS[firstPiece].shape
    });
    
    setNextPiece(next);
    setScore(0);
    setLevel(1);
    setLines(0);
    setSpeed(INITIAL_SPEED);
    setGameState(GameState.READY);
  }, [initializeBoard, createRandomPiece]);
  
  // 开始游戏
  const startGame = useCallback(() => {
    if (gameState === GameState.READY || gameState === GameState.GAME_OVER) {
      initializeGame();
      setTimeout(() => {
        setGameState(GameState.PLAYING);
      }, 100);
    } else if (gameState === GameState.PAUSED) {
      setGameState(GameState.PLAYING);
    }
  }, [gameState, initializeGame]);
  
  // 暂停游戏
  const pauseGame = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      setGameState(GameState.PAUSED);
    }
  }, [gameState]);
  
  // 旋转方块
  const rotatePiece = useCallback((shape: number[][]): number[][] => {
    const N = shape.length;
    const rotated = Array(N).fill(0).map(() => Array(N).fill(0));
    
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        rotated[j][N - 1 - i] = shape[i][j];
      }
    }
    
    return rotated;
  }, []);
  
  // 检查碰撞
  const checkCollision = useCallback((piece: CurrentPiece, board: BoardType): boolean => {
    const { shape, position } = piece;
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const boardX = position.x + x;
          const boardY = position.y + y;
          
          if (
            boardX < 0 || 
            boardX >= BOARD_WIDTH || 
            boardY >= BOARD_HEIGHT || 
            (boardY >= 0 && board[boardY][boardX] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    
    return false;
  }, []);
  
  // 合并方块到游戏板
  const mergePieceToBoard = useCallback((piece: CurrentPiece, board: BoardType): BoardType => {
    const newBoard = board.map(row => [...row]);
    const { shape, position, tetromino } = piece;
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const boardY = position.y + y;
          const boardX = position.x + x;
          
          if (boardY >= 0) {
            // 使用数字表示不同类型的方块
            newBoard[boardY][boardX] = Object.keys(TETROMINOS).indexOf(tetromino) + 1;
          }
        }
      }
    }
    
    return newBoard;
  }, []);
  
  // 清除完整的行
  const clearLines = useCallback((board: BoardType): { newBoard: BoardType, linesCleared: number } => {
    const newBoard = [...board];
    let linesCleared = 0;
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (newBoard[y].every(cell => cell !== 0)) {
        // 移除完整的行
        newBoard.splice(y, 1);
        // 在顶部添加新的空行
        newBoard.unshift(Array(BOARD_WIDTH).fill(0));
        linesCleared++;
        // 重新检查当前行，因为所有行都下移了
        y++;
      }
    }
    
    return { newBoard, linesCleared };
  }, []);
  
  // 移动方块
  const movePiece = useCallback((direction: 'left' | 'right' | 'down'): boolean => {
    if (!currentPiece || gameState !== GameState.PLAYING) return false;
    
    const newPosition = { ...currentPiece.position };
    
    switch (direction) {
      case 'left':
        newPosition.x -= 1;
        break;
      case 'right':
        newPosition.x += 1;
        break;
      case 'down':
        newPosition.y += 1;
        break;
    }
    
    const movedPiece = {
      ...currentPiece,
      position: newPosition
    };
    
    if (!checkCollision(movedPiece, board)) {
      setCurrentPiece(movedPiece);
      return true;
    }
    
    // 如果是向下移动且发生碰撞，则固定方块
    if (direction === 'down') {
      const newBoard = mergePieceToBoard(currentPiece, board);
      const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
      
      setBoard(clearedBoard);
      
      // 更新分数和等级
      if (linesCleared > 0) {
        const newLines = lines + linesCleared;
        const newScore = score + [40, 100, 300, 1200][linesCleared - 1] * level;
        const newLevel = Math.floor(newLines / 10) + 1;
        
        setLines(newLines);
        setScore(newScore);
        
        if (newScore > bestScore) {
          setBestScore(newScore);
        }
        
        if (newLevel > level) {
          setLevel(newLevel);
          setSpeed(Math.max(MIN_SPEED, INITIAL_SPEED - (newLevel - 1) * SPEED_INCREMENT));
        }
      }
      
      // 创建新方块
      const newPiece = {
        tetromino: nextPiece,
        position: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 },
        shape: TETROMINOS[nextPiece].shape
      };
      
      setNextPiece(createRandomPiece());
      
      // 检查游戏是否结束
      if (checkCollision(newPiece, clearedBoard)) {
        setGameState(GameState.GAME_OVER);
      } else {
        setCurrentPiece(newPiece);
      }
    }
    
    return false;
  }, [board, currentPiece, gameState, nextPiece, level, lines, score, bestScore, checkCollision, mergePieceToBoard, clearLines, createRandomPiece]);
  
  // 旋转当前方块
  const rotateCurrentPiece = useCallback(() => {
    if (!currentPiece || gameState !== GameState.PLAYING) return;
    
    const rotatedShape = rotatePiece(currentPiece.shape);
    const rotatedPiece = {
      ...currentPiece,
      shape: rotatedShape
    };
    
    // 检查旋转后是否碰撞
    if (!checkCollision(rotatedPiece, board)) {
      setCurrentPiece(rotatedPiece);
    }
  }, [currentPiece, gameState, board, rotatePiece, checkCollision]);
  
  // 硬降落（直接落到底部）
  const hardDrop = useCallback(() => {
    if (!currentPiece || gameState !== GameState.PLAYING) return;
    
    let newPosition = { ...currentPiece.position };
    
    // 一直向下移动直到碰撞
    while (true) {
      newPosition.y += 1;
      const testPiece = {
        ...currentPiece,
        position: newPosition
      };
      
      if (checkCollision(testPiece, board)) {
        newPosition.y -= 1;
        break;
      }
    }
    
    const droppedPiece = {
      ...currentPiece,
      position: newPosition
    };
    
    setCurrentPiece(droppedPiece);
    
    // 触发一次向下移动来固定方块
    movePiece('down');
  }, [currentPiece, gameState, board, checkCollision, movePiece]);
  
  // 游戏主循环
  const gameLoop = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      movePiece('down');
    }
  }, [gameState, movePiece]);
  
  // 游戏循环定时器
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      gameLoopRef.current = setTimeout(gameLoop, speed);
    }
    
    return () => {
      if (gameLoopRef.current) {
        clearTimeout(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop, speed]);
  
  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 防止方向键滚动页面
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      
      switch (e.key) {
        case "ArrowLeft":
          movePiece('left');
          break;
        case "ArrowRight":
          movePiece('right');
          break;
        case "ArrowDown":
          movePiece('down');
          break;
        case "ArrowUp":
          rotateCurrentPiece();
          break;
        case " ":
          hardDrop();
          break;
        case "p":
        case "P":
          if (gameState === GameState.PLAYING) {
            pauseGame();
          } else if (gameState === GameState.PAUSED) {
            startGame();
          }
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [movePiece, rotateCurrentPiece, hardDrop, gameState, pauseGame, startGame]);
  
  // 初始化游戏
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);
  
  // 渲染游戏板
  const renderBoard = () => {
    // 创建一个包含当前方块的游戏板副本用于渲染
    const displayBoard = board.map(row => [...row]);
    
    // 如果有当前方块，将其添加到显示板中
    if (currentPiece && gameState === GameState.PLAYING) {
      const { shape, position, tetromino } = currentPiece;
      const colorIndex = Object.keys(TETROMINOS).indexOf(tetromino) + 1;
      
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x] !== 0) {
            const boardY = position.y + y;
            const boardX = position.x + x;
            
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = colorIndex;
            }
          }
        }
      }
    }
    
    return (
      <div 
        className="relative bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700"
        style={{
          width: `${BOARD_WIDTH * cellSize}px`,
          height: `${BOARD_HEIGHT * cellSize}px`,
        }}
      >
        {/* 网格和方块 */}
        <div className="absolute inset-0 grid gap-px bg-gray-700" style={{
          gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_HEIGHT}, 1fr)`,
        }}>
          {displayBoard.flat().map((cell, index) => {
            const y = Math.floor(index / BOARD_WIDTH);
            const x = index % BOARD_WIDTH;
            
            return (
              <div 
                key={`cell-${x}-${y}`}
                className={`${cell === 0 ? 'bg-gray-900' : TETROMINOS[Object.keys(TETROMINOS)[cell - 1] as TetrominoType].color}`}
              />
            );
          })}
        </div>
        
        {/* 游戏开始提示 */}
        {gameState === GameState.READY && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-white text-xl font-bold mb-2">按空格键开始游戏</div>
            <div className="text-gray-300 text-sm">使用方向键控制方块移动和旋转</div>
          </div>
        )}
        
        {/* 暂停提示 */}
        {gameState === GameState.PAUSED && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-white text-xl font-bold mb-2">游戏已暂停</div>
            <div className="text-gray-300 text-sm">按P键继续游戏</div>
          </div>
        )}
        
        {/* 游戏结束提示 */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-white text-xl font-bold mb-2">游戏结束</div>
            <div className="text-gray-300 text-sm">按空格键重新开始</div>
          </div>
        )}
      </div>
    );
  };
  
  // 渲染下一个方块预览
  const renderNextPiece = () => {
    if (!nextPiece) return null;
    
    const shape = TETROMINOS[nextPiece].shape;
    const color = TETROMINOS[nextPiece].color;
    const previewSize = cellSize * 0.8;
    
    return (
      <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-4">
        <h3 className="text-white text-center mb-2 font-medium">下一个方块</h3>
        <div className="flex justify-center">
          <div className="relative" style={{ width: `${shape[0].length * previewSize}px`, height: `${shape.length * previewSize}px` }}>
            {shape.map((row, y) => (
              row.map((cell, x) => (
                cell !== 0 && (
                  <div
                    key={`next-${x}-${y}`}
                    className={`absolute ${color}`}
                    style={{
                      width: `${previewSize}px`,
                      height: `${previewSize}px`,
                      left: `${x * previewSize}px`,
                      top: `${y * previewSize}px`,
                    }}
                  />
                )
              ))
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="text-center mb-6 w-full max-w-lg">
        <h1 className={title({ size: "lg", color: "blue" })}>俄罗斯方块</h1>
        <div className={subtitle({ class: "mt-2 text-gray-300" })}>
          旋转和移动方块，填满整行来消除它们！
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <Card className="bg-gray-800/80 border-gray-700/50 shadow-2xl backdrop-blur-sm transition-all duration-300">
          <CardBody className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
              <div className="flex gap-4">
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">分数</div>
                  <div className="text-2xl font-bold text-white">
                    {score}
                  </div>
                </div>
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">最高分</div>
                  <div className="text-2xl font-bold text-white">
                    {bestScore}
                  </div>
                </div>
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">等级</div>
                  <div className="text-2xl font-bold text-white">
                    {level}
                  </div>
                </div>
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">行数</div>
                  <div className="text-2xl font-bold text-white">
                    {lines}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="flat"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                  onPress={startGame}
                >
                  {gameState === GameState.READY || gameState === GameState.GAME_OVER ? "开始游戏" : 
                   gameState === GameState.PAUSED ? "继续游戏" : "重新开始"}
                </Button>
                {gameState === GameState.PLAYING && (
                  <Button
                    variant="flat"
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                    onPress={pauseGame}
                  >
                    暂停
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex justify-center">
                {renderBoard()}
              </div>
              
              <div className="flex flex-col gap-4">
                {renderNextPiece()}
                
                <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-white text-center mb-2 font-medium">操作说明</h3>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>← → : 左右移动</li>
                    <li>↑ : 旋转方块</li>
                    <li>↓ : 加速下落</li>
                    <li>空格 : 硬降落</li>
                    <li>P : 暂停/继续</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="mt-4 text-center text-gray-500 text-sm">
          <p>填满一整行可以消除该行并获得分数</p>
          <p>随着等级提高，方块下落速度会加快</p>
          <p>当方块堆到顶部时游戏结束</p>
        </div>
      </div>
      
      {gameState === GameState.GAME_OVER && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl text-center max-w-md">
            <h2 className="text-3xl font-bold mb-4 text-white">
              游戏结束！
            </h2>
            <p className="text-xl mb-2 text-gray-300">
              最终得分: <span className="font-bold text-blue-400">{score}</span>
            </p>
            <p className="text-lg mb-6 text-gray-300">
              等级: <span className="font-bold text-purple-400">{level}</span> | 
              行数: <span className="font-bold text-green-400">{lines}</span>
            </p>
            <div className="flex justify-center gap-4">
              <Button
                variant="flat"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                onPress={startGame}
              >
                再来一局
              </Button>
              <Button
                as={Link}
                href="/games"
                variant="flat"
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                返回游戏列表
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { title, subtitle } from "@/components/primitives";
import { useMobile } from "@/hooks/use-mobile";
import { MobileControls } from "@/components/mobile-controls";
import Link from "next/link";

// 游戏常量
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const INITIAL_SPEED = 1000;
const MIN_SPEED = 100;
const SPEED_INCREASE = 50;
const ANIMATION_DURATION = 100;

// 方块形状
const TETROMINOS = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: 'from-cyan-400 to-cyan-600'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'from-blue-400 to-blue-600'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'from-orange-400 to-orange-600'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 'from-yellow-400 to-yellow-600'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: 'from-green-400 to-green-600'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'from-purple-400 to-purple-600'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: 'from-red-400 to-red-600'
  }
};

// 方块类型
type TetrominoType = keyof typeof TETROMINOS;

// 游戏状态
enum GameState {
  READY = "ready",
  PLAYING = "playing",
  PAUSED = "paused",
  GAME_OVER = "game_over"
}

// 方块接口
interface Tetromino {
  type: TetrominoType;
  shape: number[][];
  position: { x: number; y: number };
  color: string;
}

// 游戏板接口
interface Board {
  grid: number[][];
  colors: string[][];
}

export default function TetrisGame() {
  // 游戏状态
  const [board, setBoard] = useState<Board>({ 
    grid: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
    colors: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(''))
  });
  const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null);
  const [nextPiece, setNextPiece] = useState<Tetromino | null>(null);
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>(GameState.READY);
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [gameBoardSize, setGameBoardSize] = useState<number>(300);
  const [cellSize, setCellSize] = useState<number>(30);
  const [theme, setTheme] = useState<'blue' | 'purple' | 'green' | 'red'>('blue');
  
  // 布局相关
  const isMobile = useMobile();
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const nextId = useRef<number>(1);
  
  // 颜色主题
  const colorThemes = {
    blue: {
      grid: 'bg-gray-700/20',
      border: 'border-blue-500/30',
      accent: 'from-blue-500 to-blue-600',
      empty: 'bg-gray-800/50',
      ghost: 'bg-gray-500/30',
    },
    purple: {
      grid: 'bg-gray-700/20',
      border: 'border-purple-500/30',
      accent: 'from-purple-500 to-purple-600',
      empty: 'bg-gray-800/50',
      ghost: 'bg-gray-500/30',
    },
    green: {
      grid: 'bg-gray-700/20',
      border: 'border-green-500/30',
      accent: 'from-green-500 to-green-600',
      empty: 'bg-gray-800/50',
      ghost: 'bg-gray-500/30',
    },
    red: {
      grid: 'bg-gray-700/20',
      border: 'border-red-500/30',
      accent: 'from-red-500 to-red-600',
      empty: 'bg-gray-800/50',
      ghost: 'bg-gray-500/30',
    }
  };

  // 动态调整游戏板大小
  useEffect(() => {
    const updateBoardSize = () => {
      if (isMobile) {
        const screenWidth = window.innerWidth;
        const maxWidth = Math.min(screenWidth - 48, 300);
        const newCellSize = Math.floor(maxWidth / BOARD_WIDTH);
        const newBoardSize = newCellSize * BOARD_WIDTH;
        setCellSize(newCellSize);
        setGameBoardSize(newBoardSize);
      } else {
        setCellSize(30);
        setGameBoardSize(300);
      }
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, [isMobile]);

  // 创建新方块
  const createTetromino = useCallback((type?: TetrominoType): Tetromino => {
    const tetrominoTypes = Object.keys(TETROMINOS) as TetrominoType[];
    const randomType = type || tetrominoTypes[Math.floor(Math.random() * tetrominoTypes.length)];
    
    return {
      type: randomType,
      shape: TETROMINOS[randomType].shape.map(row => [...row]),
      position: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 },
      color: TETROMINOS[randomType].color
    };
  }, []);

  // 初始化游戏
  const initializeGame = useCallback(() => {
    const newBoard: Board = {
      grid: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
      colors: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(''))
    };
    
    setBoard(newBoard);
    setScore(0);
    setLines(0);
    setLevel(1);
    setSpeed(INITIAL_SPEED);
    setGameState(GameState.READY);
    
    // 创建第一个方块和下一个方块
    const firstPiece = createTetromino();
    const next = createTetromino();
    setCurrentPiece(firstPiece);
    setNextPiece(next);
    
    // 随机选择主题
    const themes: Array<'blue' | 'purple' | 'green' | 'red'> = ['blue', 'purple', 'green', 'red'];
    setTheme(themes[Math.floor(Math.random() * themes.length)]);
  }, [createTetromino]);

  // 开始游戏
  const startGame = useCallback(() => {
    if (gameState === GameState.READY) {
      setGameState(GameState.PLAYING);
    }
  }, [gameState]);

  // 暂停/继续游戏
  const togglePause = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      setGameState(GameState.PAUSED);
    } else if (gameState === GameState.PAUSED) {
      setGameState(GameState.PLAYING);
    }
  }, [gameState]);

  // 重置游戏
  const resetGame = useCallback(() => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    initializeGame();
  }, [initializeGame]);

  // 检查碰撞
  const checkCollision = useCallback((piece: Tetromino, board: Board, position: { x: number; y: number }): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] !== 0) {
          const boardX = position.x + x;
          const boardY = position.y + y;
          
          if (
            boardX < 0 || 
            boardX >= BOARD_WIDTH || 
            boardY >= BOARD_HEIGHT ||
            (boardY >= 0 && board.grid[boardY][boardX] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  // 旋转方块
  const rotatePiece = useCallback((piece: Tetromino): Tetromino => {
    const rotatedShape = piece.shape[0].map((_, i) =>
      piece.shape.map(row => row[i]).reverse()
    );
    
    return {
      ...piece,
      shape: rotatedShape
    };
  }, []);

  // 移动方块
  const movePiece = useCallback((direction: 'left' | 'right' | 'down'): boolean => {
    if (!currentPiece || gameState !== GameState.PLAYING || isAnimating) return false;
    
    setIsAnimating(true);
    
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
    
    if (!checkCollision(currentPiece, board, newPosition)) {
      setCurrentPiece({
        ...currentPiece,
        position: newPosition
      });
      setIsAnimating(false);
      return true;
    }
    
    // 如果是向下移动且发生碰撞，则固定方块
    if (direction === 'down') {
      placePiece();
    }
    
    setIsAnimating(false);
    return false;
  }, [currentPiece, board, gameState, checkCollision, isAnimating]);

  // 硬降（直接落到底部）
  const hardDrop = useCallback(() => {
    if (!currentPiece || gameState !== GameState.PLAYING || isAnimating) return;
    
    setIsAnimating(true);
    
    let newPosition = { ...currentPiece.position };
    
    // 一直向下移动直到碰撞
    while (!checkCollision(currentPiece, board, { ...newPosition, y: newPosition.y + 1 })) {
      newPosition.y += 1;
    }
    
    setCurrentPiece({
      ...currentPiece,
      position: newPosition
    });
    
    // 固定方块
    placePiece();
    setIsAnimating(false);
  }, [currentPiece, board, gameState, checkCollision, isAnimating]);

  // 旋转当前方块
  const rotateCurrentPiece = useCallback(() => {
    if (!currentPiece || gameState !== GameState.PLAYING || isAnimating) return;
    
    setIsAnimating(true);
    
    const rotatedPiece = rotatePiece(currentPiece);
    
    // 尝试旋转，如果碰撞则尝试墙踢
    if (!checkCollision(rotatedPiece, board, currentPiece.position)) {
      setCurrentPiece(rotatedPiece);
    } else {
      // 尝试墙踢
      const kicks = [
        { x: 1, y: 0 },  // 右
        { x: -1, y: 0 }, // 左
        { x: 0, y: -1 }, // 上
        { x: 2, y: 0 },  // 右右
        { x: -2, y: 0 }  // 左左
      ];
      
      for (const kick of kicks) {
        const newPosition = {
          x: currentPiece.position.x + kick.x,
          y: currentPiece.position.y + kick.y
        };
        
        if (!checkCollision(rotatedPiece, board, newPosition)) {
          setCurrentPiece({
            ...rotatedPiece,
            position: newPosition
          });
          break;
        }
      }
    }
    
    setIsAnimating(false);
  }, [currentPiece, board, gameState, checkCollision, rotatePiece, isAnimating]);

  // 固定方块到游戏板
  const placePiece = useCallback(() => {
    if (!currentPiece) return;
    
    const newBoard = { ...board };
    newBoard.grid = board.grid.map(row => [...row]);
    newBoard.colors = board.colors.map(row => [...row]);
    
    // 将当前方块固定到游戏板
    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x] !== 0) {
          const boardY = currentPiece.position.y + y;
          const boardX = currentPiece.position.x + x;
          
          if (boardY >= 0) {
            newBoard.grid[boardY][boardX] = 1;
            newBoard.colors[boardY][boardX] = currentPiece.color;
          }
        }
      }
    }
    
    setBoard(newBoard);
    
    // 检查并清除完整的行
    clearLines(newBoard);
    
    // 生成新方块
    const newPiece = nextPiece || createTetromino();
    const newNextPiece = createTetromino();
    
    setCurrentPiece(newPiece);
    setNextPiece(newNextPiece);
    
    // 检查游戏是否结束
    if (checkCollision(newPiece, newBoard, newPiece.position)) {
      setGameState(GameState.GAME_OVER);
      if (score > highScore) {
        setHighScore(score);
        if (typeof window !== 'undefined') {
          localStorage.setItem('tetris-high-score', score.toString());
        }
      }
    }
  }, [currentPiece, board, nextPiece, createTetromino, checkCollision, score, highScore]);

  // 清除完整的行
  const clearLines = useCallback((currentBoard: Board) => {
    const newBoard = { ...currentBoard };
    newBoard.grid = currentBoard.grid.map(row => [...row]);
    newBoard.colors = currentBoard.colors.map(row => [...row]);
    
    let linesCleared = 0;
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (newBoard.grid[y].every(cell => cell !== 0)) {
        // 移除该行
        newBoard.grid.splice(y, 1);
        newBoard.colors.splice(y, 1);
        
        // 在顶部添加新的空行
        newBoard.grid.unshift(Array(BOARD_WIDTH).fill(0));
        newBoard.colors.unshift(Array(BOARD_WIDTH).fill(''));
        
        linesCleared++;
        y++; // 重新检查当前行，因为所有行都下移了
      }
    }
    
    if (linesCleared > 0) {
      // 更新分数
      const points = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4 行
      const newScore = score + points[linesCleared] * level;
      const newLines = lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;
      
      setScore(newScore);
      setLines(newLines);
      setLevel(newLevel);
      
      // 每升一级加快速度
      if (newLevel > level && speed > MIN_SPEED) {
        setSpeed(prevSpeed => Math.max(prevSpeed - SPEED_INCREASE, MIN_SPEED));
      }
      
      setBoard(newBoard);
    }
  }, [score, lines, level, speed]);

  // 游戏循环
  const gameLoop = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      movePiece('down');
    }
  }, [gameState, movePiece]);

  // 开始游戏循环
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      gameLoopRef.current = setInterval(gameLoop, speed);
    } else if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState, gameLoop, speed]);

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING || isAnimating) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          movePiece('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          movePiece('right');
          break;
        case 'ArrowDown':
          e.preventDefault();
          movePiece('down');
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotateCurrentPiece();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePause();
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
  }, [gameState, movePiece, rotateCurrentPiece, hardDrop, togglePause, resetGame, isAnimating]);

  // 移动端控制
  const handleMobileControl = useCallback((action: 'left' | 'right' | 'down' | 'rotate' | 'drop') => {
    if (gameState !== GameState.PLAYING || isAnimating) return;
    
    switch (action) {
      case 'left':
        movePiece('left');
        break;
      case 'right':
        movePiece('right');
        break;
      case 'down':
        movePiece('down');
        break;
      case 'rotate':
        rotateCurrentPiece();
        break;
      case 'drop':
        hardDrop();
        break;
    }
  }, [gameState, movePiece, rotateCurrentPiece, hardDrop, isAnimating]);

  // 初始化游戏
  useEffect(() => {
    // 加载最高分
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tetris-high-score');
      if (saved) {
        setHighScore(parseInt(saved, 10));
      }
    }
    
    initializeGame();
  }, [initializeGame]);

  // 渲染游戏板网格
  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        cells.push(
          <div
            key={`grid-${x}-${y}`}
            className={`absolute ${colorThemes[theme].grid} rounded-sm`}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              left: `${x * cellSize}px`,
              top: `${y * cellSize}px`,
            }}
          />
        );
      }
    }
    return cells;
  };

  // 渲染游戏板
  const renderBoard = () => {
    const cells = [];
    
    // 渲染已固定的方块
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (board.grid[y][x] !== 0) {
          cells.push(
            <div
              key={`board-${x}-${y}`}
              className={`absolute rounded-sm shadow-md transition-all duration-${ANIMATION_DURATION} ease-in-out bg-gradient-to-br ${board.colors[y][x]}`}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                left: `${x * cellSize}px`,
                top: `${y * cellSize}px`,
              }}
            />
          );
        }
      }
    }
    
    // 渲染当前方块
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x] !== 0) {
            const boardX = currentPiece.position.x + x;
            const boardY = currentPiece.position.y + y;
            
            if (boardY >= 0) {
              cells.push(
                <div
                  key={`piece-${x}-${y}`}
                  className={`absolute rounded-sm shadow-lg transition-all duration-${ANIMATION_DURATION} ease-in-out bg-gradient-to-br ${currentPiece.color}`}
                  style={{
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                    left: `${boardX * cellSize}px`,
                    top: `${boardY * cellSize}px`,
                  }}
                />
              );
            }
          }
        }
      }
      
      // 渲染幽灵方块（显示落点位置）
      let ghostPosition = { ...currentPiece.position };
      
      // 找到最低的可能位置
      while (!checkCollision(currentPiece, board, { ...ghostPosition, y: ghostPosition.y + 1 })) {
        ghostPosition.y += 1;
      }
      
      // 渲染幽灵方块
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x] !== 0) {
            const boardX = ghostPosition.x + x;
            const boardY = ghostPosition.y + y;
            
            if (boardY >= 0) {
              cells.push(
                <div
                  key={`ghost-${x}-${y}`}
                  className={`absolute rounded-sm transition-all duration-${ANIMATION_DURATION} ease-in-out ${colorThemes[theme].ghost}`}
                  style={{
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                    left: `${boardX * cellSize}px`,
                    top: `${boardY * cellSize}px`,
                  }}
                />
              );
            }
          }
        }
      }
    }
    
    return cells;
  };

  // 渲染下一个方块预览
  const renderNextPiece = () => {
    if (!nextPiece) return null;
    
    const cells = [];
    const previewSize = 20;
    
    for (let y = 0; y < nextPiece.shape.length; y++) {
      for (let x = 0; x < nextPiece.shape[y].length; x++) {
        if (nextPiece.shape[y][x] !== 0) {
          cells.push(
            <div
              key={`next-${x}-${y}`}
              className={`absolute rounded-sm bg-gradient-to-br ${nextPiece.color}`}
              style={{
                width: `${previewSize}px`,
                height: `${previewSize}px`,
                left: `${x * previewSize + 10}px`,
                top: `${y * previewSize + 10}px`,
              }}
            />
          );
        }
      }
    }
    
    return (
      <div className="relative w-24 h-24 bg-gray-700/50 rounded-lg border border-gray-600/30 flex items-center justify-center">
        {cells}
      </div>
    );
  };

  return (
    <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="text-center mb-6 w-full max-w-lg">
        <h1 className={title({ size: "lg", color: "blue" })}>俄罗斯方块</h1>
        <div className={subtitle({ class: "mt-2 text-gray-300" })}>
          旋转和移动方块，填满整行来消除它们！尽可能获得高分。
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <Card className="bg-gray-800/80 border-gray-700/50 shadow-2xl backdrop-blur-sm transition-all duration-300">
          <CardBody className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
              <div className="flex gap-4">
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">分数</div>
                  <div className="text-2xl font-bold text-white">{score}</div>
                </div>
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">行数</div>
                  <div className="text-2xl font-bold text-white">{lines}</div>
                </div>
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">等级</div>
                  <div className="text-2xl font-bold text-white">{level}</div>
                </div>
                <div className="bg-gray-700/80 px-4 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">最高分</div>
                  <div className="text-2xl font-bold text-white">{highScore}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="flat"
                  className={`bg-gradient-to-r ${colorThemes[theme].accent} hover:opacity-90 text-white rounded-lg transition-all duration-300 transform hover:scale-105`}
                  onPress={gameState === GameState.READY ? startGame : togglePause}
                >
                  {gameState === GameState.READY ? '开始' : 
                   gameState === GameState.PLAYING ? '暂停' : '继续'}
                </Button>
                <Button
                  variant="flat"
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                  onPress={resetGame}
                >
                  重置
                </Button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div 
                className={`relative border-4 ${colorThemes[theme].border} rounded-xl overflow-hidden shadow-lg transition-all duration-300`}
                style={{ width: `${gameBoardSize}px`, height: `${gameBoardSize * 2}px` }}
              >
                {/* 游戏网格 */}
                {renderGrid()}
                 
                {/* 游戏板 */}
                {renderBoard()}
                
                {/* 游戏开始提示 */}
                {gameState === GameState.READY && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="text-white text-xl font-bold mb-4 animate-bounce">按开始按钮开始游戏</div>
                    <div className="text-gray-300 text-sm">方向键移动，上键旋转，空格键快速下落</div>
                  </div>
                )}

                {/* 暂停提示 */}
                {gameState === GameState.PAUSED && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="text-white text-xl font-bold mb-4 animate-pulse">游戏已暂停</div>
                    <div className="text-gray-300 text-sm">按继续按钮或P键继续游戏</div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="bg-gray-700/80 px-4 py-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-2">下一个方块</div>
                  {renderNextPiece()}
                </div>
                
                <div className="text-gray-400 text-sm bg-gray-700/80 px-4 py-3 rounded-lg">
                  <p className="mb-1">← → : 左右移动</p>
                  <p className="mb-1">↑ : 旋转方块</p>
                  <p className="mb-1">↓ : 加速下落</p>
                  <p className="mb-1">空格 : 直接落底</p>
                  <p>P : 暂停/继续</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 移动端控制 */}
        {isMobile && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-4">
              <Button
                variant="flat"
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all duration-300 w-16 h-16"
                onPress={() => handleMobileControl('rotate')}
              >
                ↻
              </Button>
              <Button
                variant="flat"
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-300 w-16 h-16"
                onPress={() => handleMobileControl('drop')}
              >
                ↓↓
              </Button>
            </div>
            <MobileControls
              onDirection={(direction) => {
                if (direction === 'up') handleMobileControl('rotate');
                else if (direction === 'down') handleMobileControl('drop');
                else handleMobileControl(direction);
              }}
              className="mt-2"
              variant="game"
              cellSize={cellSize * 2}
            />
          </div>
        )}

        {/* 游戏结束覆盖层 */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
            <Card className="bg-gray-800/95 border-gray-600 shadow-2xl max-w-md w-full mx-4">
              <CardBody className="p-6 text-center">
                <h2 className="text-2xl font-bold text-red-400 mb-2">游戏结束！</h2>
                <p className="text-gray-300 mb-2">方块堆到了顶部！</p>
                <p className="text-gray-300 mb-6">
                  最终得分: <span className="text-yellow-400 font-bold">{score}</span>
                </p>
                {score > highScore && (
                  <div className="bg-green-900/50 border border-green-500/30 rounded-lg p-3 mb-6 animate-pulse">
                    <p className="text-green-400 font-bold">新纪录！🎉</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="flat"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all duration-300"
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
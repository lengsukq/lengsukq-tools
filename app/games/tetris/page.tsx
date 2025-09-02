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
const SPEED_DECREMENT = 50;

// 方块类型定义
type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// 俄罗斯方块形状和颜色
const TETROMINOS: Record<Cell, Cell[][]> = {
  0: [], // 空白
  1: [[1, 1, 1, 1]], // I
  2: [[2, 2], [2, 2]], // O
  3: [[0, 3, 0], [3, 3, 3]], // T
  4: [[0, 4, 4], [4, 4, 0]], // S
  5: [[5, 5, 0], [0, 5, 5]], // Z
  6: [[6, 0, 0], [6, 6, 6]] // J
};

// 方块颜色主题
const COLORS: Record<Cell, string> = {
  0: 'bg-gray-700/30',
  1: 'bg-gradient-to-br from-cyan-400 to-blue-500',
  2: 'bg-gradient-to-br from-yellow-400 to-amber-500',
  3: 'bg-gradient-to-br from-purple-400 to-violet-500',
  4: 'bg-gradient-to-br from-green-400 to-emerald-500',
  5: 'bg-gradient-to-br from-red-400 to-rose-500',
  6: 'bg-gradient-to-br from-blue-400 to-indigo-500'
};

// 方块边界框
const BOUNDING_BOX: Record<Cell, { width: number; height: number }> = {
  0: { width: 0, height: 0 },
  1: { width: 4, height: 1 },
  2: { width: 2, height: 2 },
  3: { width: 3, height: 2 },
  4: { width: 3, height: 2 },
  5: { width: 3, height: 2 },
  6: { width: 3, height: 2 }
};

// 游戏状态类型
type GameStatus = 'idle' | 'playing' | 'paused' | 'gameOver';

// 方块位置接口
interface Position {
  x: number;
  y: number;
}

// 游戏状态接口
interface GameState {
  board: Cell[][];
  currentPiece: Cell;
  currentPosition: Position;
  nextPiece: Cell;
  score: number;
  level: number;
  lines: number;
  status: GameStatus;
  speed: number;
  isAnimating: boolean;
  clearedLines: number[];
}

export default function TetrisGame() {
  // 游戏状态
  const [board, setBoard] = useState<Cell[][]>([]);
  const [currentPiece, setCurrentPiece] = useState<Cell>(0);
  const [currentPosition, setCurrentPosition] = useState<Position>({ x: 0, y: 0 });
  const [nextPiece, setNextPiece] = useState<Cell>(0);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tetris-high-score');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [level, setLevel] = useState<number>(1);
  const [lines, setLines] = useState<number>(0);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [clearedLines, setClearedLines] = useState<number[]>([]);
  const [showControls, setShowControls] = useState<boolean>(false);
  
  // 布局相关
  const isMobile = useMobile();
  const gameRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const dropIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [gameBoardSize, setGameBoardSize] = useState<number>(300);
  const [cellSize, setCellSize] = useState<number>(15);

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
        setCellSize(15);
        setGameBoardSize(300);
      }
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, [isMobile]);

  // 初始化游戏板
  const initializeBoard = useCallback(() => {
    const newBoard: Cell[][] = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      newBoard[y] = Array(BOARD_WIDTH).fill(0);
    }
    return newBoard;
  }, []);

  // 生成随机方块
  const generateRandomPiece = useCallback(() => {
    return (Math.floor(Math.random() * 7) + 1) as Cell;
  }, []);

  // 初始化游戏
  const initializeGame = useCallback(() => {
    setBoard(initializeBoard());
    const firstPiece = generateRandomPiece();
    setCurrentPiece(firstPiece);
    setCurrentPosition({
      x: Math.floor((BOARD_WIDTH - BOUNDING_BOX[firstPiece].width) / 2),
      y: 0
    });
    setNextPiece(generateRandomPiece());
    setScore(0);
    setLevel(1);
    setLines(0);
    setStatus('idle');
    setSpeed(INITIAL_SPEED);
    setIsAnimating(false);
    setClearedLines([]);
  }, [initializeBoard, generateRandomPiece]);

  // 旋转方块
  const rotatePiece = useCallback((piece: Cell): Cell[][] => {
    const shape = TETROMINOS[piece];
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated: Cell[][] = Array(cols).fill(0).map(() => Array(rows).fill(0));
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        rotated[x][rows - 1 - y] = shape[y][x];
      }
    }
    
    return rotated;
  }, []);

  // 检查碰撞
  const checkCollision = useCallback((
    board: Cell[][],
    piece: Cell,
    position: Position,
    rotatedPiece?: Cell[][]
  ): boolean => {
    const shape = rotatedPiece || TETROMINOS[piece];
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newX = position.x + x;
          const newY = position.y + y;
          
          if (
            newX < 0 ||
            newX >= BOARD_WIDTH ||
            newY >= BOARD_HEIGHT ||
            (newY >= 0 && board[newY][newX] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    
    return false;
  }, []);

  // 将当前方块固定到游戏板上
  const lockPiece = useCallback((board: Cell[][], piece: Cell, position: Position): Cell[][] => {
    const newBoard = board.map(row => [...row]);
    const shape = TETROMINOS[piece];
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const boardX = position.x + x;
          const boardY = position.y + y;
          if (boardY >= 0) {
            newBoard[boardY][boardX] = shape[y][x];
          }
        }
      }
    }
    
    return newBoard;
  }, []);

  // 检查并消除完整的行
  const checkLines = useCallback((board: Cell[][]): { newBoard: Cell[][], linesCleared: number } => {
    const newBoard = board.filter(row => row.some(cell => cell === 0));
    const linesCleared = BOARD_HEIGHT - newBoard.length;
    
    // 在顶部添加新的空行
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }
    
    return { newBoard, linesCleared };
  }, []);

  // 更新分数
  const updateScore = useCallback((linesCleared: number) => {
    const baseScores = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4行的分数
    const levelMultiplier = level;
    const scoreIncrease = baseScores[Math.min(linesCleared, 4)] * levelMultiplier;
    
    setScore(prevScore => {
      const newScore = prevScore + scoreIncrease;
      if (newScore > highScore) {
        setHighScore(newScore);
        if (typeof window !== 'undefined') {
          localStorage.setItem('tetris-high-score', newScore.toString());
        }
      }
      return newScore;
    });
    
    setLines(prevLines => {
      const newLines = prevLines + linesCleared;
      // 每清除10行升级
      const newLevel = Math.floor(newLines / 10) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
        setSpeed(Math.max(INITIAL_SPEED - (newLevel - 1) * SPEED_DECREMENT, MIN_SPEED));
      }
      return newLines;
    });
  }, [level, highScore]);

  // 处理游戏主循环
  const gameLoop = useCallback(() => {
    if (status !== 'playing' || isAnimating) return;
    
    // 尝试下移方块
    const newPosition = { ...currentPosition, y: currentPosition.y + 1 };
    
    if (!checkCollision(board, currentPiece, newPosition)) {
      setCurrentPosition(newPosition);
    } else {
      // 固定方块
      setIsAnimating(true);
      const newBoard = lockPiece(board, currentPiece, currentPosition);
      
      // 检查并消除行
      const { newBoard: boardAfterLines, linesCleared } = checkLines(newBoard);
      
      if (linesCleared > 0) {
        setClearedLines(Array.from({ length: BOARD_HEIGHT }, (_, i) => i).filter(
          y => boardAfterLines[y].every(cell => cell === 0)
        ));
        
        setTimeout(() => {
          setBoard(boardAfterLines);
          setClearedLines([]);
          updateScore(linesCleared);
          spawnNextPiece();
          setIsAnimating(false);
        }, 300);
      } else {
        setBoard(newBoard);
        spawnNextPiece();
        setIsAnimating(false);
      }
    }
  }, [status, isAnimating, board, currentPiece, currentPosition, checkCollision, lockPiece, checkLines, updateScore]);

  // 生成下一个方块
  const spawnNextPiece = useCallback(() => {
    const newPiece = nextPiece;
    const newNextPiece = generateRandomPiece();
    const newPosition = {
      x: Math.floor((BOARD_WIDTH - BOUNDING_BOX[newPiece].width) / 2),
      y: 0
    };
    
    // 检查游戏是否结束
    if (checkCollision(board, newPiece, newPosition)) {
      setStatus('gameOver');
      return;
    }
    
    setCurrentPiece(newPiece);
    setNextPiece(newNextPiece);
    setCurrentPosition(newPosition);
  }, [nextPiece, generateRandomPiece, board, checkCollision]);

  // 移动方块
  const movePiece = useCallback((deltaX: number) => {
    if (status !== 'playing' || isAnimating) return;
    
    const newPosition = { ...currentPosition, x: currentPosition.x + deltaX };
    if (!checkCollision(board, currentPiece, newPosition)) {
      setCurrentPosition(newPosition);
    }
  }, [status, isAnimating, board, currentPiece, currentPosition, checkCollision]);

  // 旋转方块
  const rotateCurrentPiece = useCallback(() => {
    if (status !== 'playing' || isAnimating || currentPiece === 2) return; // O型方块不能旋转
    
    const rotatedPiece = rotatePiece(currentPiece);
    if (!checkCollision(board, currentPiece, currentPosition, rotatedPiece)) {
      // 尝试正常旋转
      setCurrentPiece(prev => -prev as Cell); // 使用负值标记旋转状态
      setTimeout(() => setCurrentPiece(prev => -prev as Cell), 10); // 触发重渲染
    } else {
      // 尝试墙踢
      const kicks = [
        { x: -1, y: 0 }, // 左移一格
        { x: 1, y: 0 },  // 右移一格
        { x: 0, y: -1 }, // 上移一格
        { x: -2, y: 0 }, // 左移两格
        { x: 2, y: 0 }   // 右移两格
      ];
      
      for (const kick of kicks) {
        const kickedPosition = {
          x: currentPosition.x + kick.x,
          y: currentPosition.y + kick.y
        };
        
        if (!checkCollision(board, currentPiece, kickedPosition, rotatedPiece)) {
          setCurrentPosition(kickedPosition);
          setCurrentPiece(prev => -prev as Cell);
          setTimeout(() => setCurrentPiece(prev => -prev as Cell), 10);
          break;
        }
      }
    }
  }, [status, isAnimating, currentPiece, currentPosition, board, rotatePiece, checkCollision]);

  // 快速下落
  const hardDrop = useCallback(() => {
    if (status !== 'playing' || isAnimating) return;
    
    let dropDistance = 0;
    let newPosition = { ...currentPosition };
    
    while (!checkCollision(board, currentPiece, { ...newPosition, y: newPosition.y + 1 })) {
      newPosition.y++;
      dropDistance++;
    }
    
    setCurrentPosition(newPosition);
    
    // 立即固定方块
    setTimeout(() => {
      setIsAnimating(true);
      const newBoard = lockPiece(board, currentPiece, newPosition);
      const { newBoard: boardAfterLines, linesCleared } = checkLines(newBoard);
      
      setBoard(boardAfterLines);
      updateScore(linesCleared + Math.floor(dropDistance / 10)); // 快速下落奖励分数
      spawnNextPiece();
      setIsAnimating(false);
    }, 10);
  }, [status, isAnimating, board, currentPiece, currentPosition, checkCollision, lockPiece, checkLines, updateScore, spawnNextPiece]);

  // 开始游戏
  const startGame = useCallback(() => {
    if (status === 'gameOver') {
      initializeGame();
    }
    setStatus('playing');
  }, [status, initializeGame]);

  // 暂停游戏
  const pauseGame = useCallback(() => {
    setStatus(prev => prev === 'playing' ? 'paused' : 'playing');
  }, []);

  // 重置游戏
  const resetGame = useCallback(() => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (dropIntervalRef.current) {
      clearInterval(dropIntervalRef.current);
      dropIntervalRef.current = null;
    }
    initializeGame();
  }, [initializeGame]);

  // 游戏主循环定时器
  useEffect(() => {
    if (status === 'playing') {
      gameLoopRef.current = setInterval(gameLoop, speed);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [status, gameLoop, speed]);

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing' && status !== 'idle' && status !== 'paused') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          movePiece(-1);
          if (status === 'idle') startGame();
          break;
        case 'ArrowRight':
          e.preventDefault();
          movePiece(1);
          if (status === 'idle') startGame();
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (status === 'idle') startGame();
          else gameLoop();
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotateCurrentPiece();
          if (status === 'idle') startGame();
          break;
        case ' ':
          e.preventDefault();
          if (status === 'idle') {
            startGame();
          } else if (status === 'playing') {
            hardDrop();
          } else if (status === 'paused') {
            startGame();
          }
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          if (status === 'playing' || status === 'paused') {
            pauseGame();
          }
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
  }, [status, movePiece, gameLoop, rotateCurrentPiece, startGame, hardDrop, pauseGame, resetGame]);

  // 触摸控制
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || status !== 'playing' || isAnimating) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const minSwipeDistance = 20;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        movePiece(deltaX > 0 ? 1 : -1);
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          gameLoop();
        } else {
          rotateCurrentPiece();
        }
      }
    }

    setTouchStart(null);
  };

  // 初始化游戏
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // 渲染游戏板
  const renderBoard = () => {
    const cells = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = board[y]?.[x] || 0;
        const isCleared = clearedLines.includes(y);
        
        cells.push(
          <div
            key={`${x}-${y}`}
            className={`absolute rounded-sm transition-all duration-200 ease-in-out ${
              isCleared ? 'opacity-0 scale-0' : COLORS[cell]
            }`}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              left: `${x * cellSize}px`,
              top: `${y * cellSize}px`,
              boxShadow: cell !== 0 ? `0 2px 4px rgba(0,0,0,0.2)` : 'none',
            }}
          />
        );
      }
    }
    return cells;
  };

  // 渲染当前方块
  const renderCurrentPiece = () => {
    if (currentPiece === 0 || isAnimating) return null;
    
    const shape = TETROMINOS[Math.abs(currentPiece) as Cell];
    const cells = [];
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const boardX = currentPosition.x + x;
          const boardY = currentPosition.y + y;
          
          // 只渲染在游戏板内的部分
          if (boardY >= 0 && boardX >= 0 && boardX < BOARD_WIDTH) {
            cells.push(
              <div
                key={`piece-${x}-${y}`}
                className={`absolute rounded-sm transition-all duration-100 ease-in-out ${COLORS[shape[y][x]]}`}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  left: `${boardX * cellSize}px`,
                  top: `${boardY * cellSize}px`,
                  boxShadow: `0 2px 4px rgba(0,0,0,0.3)`,
                  zIndex: 10,
                  transform: currentPiece < 0 ? 'rotate-90' : 'rotate-0',
                  transformOrigin: 'center',
                }}
              />
            );
          }
        }
      }
    }
    
    return cells;
  };

  // 渲染预览方块
  const renderPreviewPiece = () => {
    if (nextPiece === 0) return null;
    
    const shape = TETROMINOS[nextPiece];
    const previewCellSize = cellSize * 0.8;
    const cells = [];
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          cells.push(
            <div
              key={`preview-${x}-${y}`}
              className={`absolute rounded-sm ${COLORS[shape[y][x]]}`}
              style={{
                width: `${previewCellSize}px`,
                height: `${previewCellSize}px`,
                left: `${x * previewCellSize}px`,
                top: `${y * previewCellSize}px`,
              }}
            />
          );
        }
      }
    }
    
    return (
      <div 
        className="relative bg-gray-700/50 rounded-lg p-3 h-24"
        style={{ minWidth: `${Math.max(...shape.map(row => row.length)) * previewCellSize}px` }}
      >
        {cells}
      </div>
    );
  };

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-6 md:py-10 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="text-center mb-6 w-full max-w-md">
        <h1 className={title({ size: "lg", color: "blue" })}>俄罗斯方块</h1>
        <div className={subtitle({ class: "mt-2 text-gray-300" })}>
          移动并旋转方块，填满一整行来消除它们！
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <Card className="bg-gray-800/80 border-gray-700/50 shadow-2xl backdrop-blur-sm transition-all duration-300">
          <CardBody className="p-4 md:p-6">
            {/* 游戏信息栏 */}
            <div className="flex justify-between items-center gap-4 mb-4 flex-wrap">
              <div className="flex gap-4">
                <div className="bg-gray-700/80 px-3 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">分数</div>
                  <div className="text-xl font-bold text-white">{score}</div>
                </div>
                <div className="bg-gray-700/80 px-3 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">最高分</div>
                  <div className="text-xl font-bold text-white">{highScore}</div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-gray-700/80 px-3 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">等级</div>
                  <div className="text-xl font-bold text-white">{level}</div>
                </div>
                <div className="bg-gray-700/80 px-3 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">行数</div>
                  <div className="text-xl font-bold text-white">{lines}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* 游戏板 */}
              <div 
                ref={gameRef}
                className="relative border-4 border-gray-600/30 rounded-xl overflow-hidden shadow-lg transition-all duration-300 bg-gray-800"
                style={{ width: `${gameBoardSize}px`, height: `${cellSize * BOARD_HEIGHT}px` }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {renderBoard()}
                {renderCurrentPiece()}
              </div>

              {/* 游戏信息和控制 */}
              <div className="flex flex-col gap-4 w-full sm:w-auto">
                {/* 下一个方块预览 */}
                <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <div className="text-gray-300 mb-2 font-medium">下一个</div>
                  {renderPreviewPiece()}
                </div>

                {/* 控制按钮 */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="flat"
                    className={`bg-gradient-to-r ${status === 'playing' ? 'from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700' : 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'} text-white rounded-lg transition-all duration-300 transform hover:scale-105`}
                    onPress={status === 'playing' ? pauseGame : startGame}
                  >
                    {status === 'playing' ? '暂停' : (status === 'paused' ? '继续' : '开始')}
                  </Button>
                  <Button
                    variant="flat"
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
                    onPress={resetGame}
                  >
                    重置
                  </Button>
                </div>

                {/* 操作说明 */}
                <div className="bg-gray-700/50 rounded-lg p-3 text-center text-xs text-gray-300">
                  <div className="font-medium mb-1 text-gray-200">操作说明</div>
                  <div>键盘方向键移动和旋转</div>
                  <div>空格键快速下落</div>
                  <div>P键暂停/继续</div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 移动端控制 */}
          {isMobile && (
            <MobileControls
              onDirection={(dir) => {
                if (status === 'playing') {
                  switch (dir) {
                    case 'up': rotateCurrentPiece(); break;
                    case 'down': gameLoop(); break;
                    case 'left': movePiece(-1); break;
                    case 'right': movePiece(1); break;
                  }
                } else if (status === 'idle') {
                  startGame();
                }
              }}
              className="mt-4"
              variant="game"
              cellSize={cellSize * 2.5}
            />
          )}
      </div>

      {/* 游戏开始提示 */}
      {status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-40">
          <Card className="bg-gray-800/95 border-gray-600 shadow-2xl max-w-md w-full mx-4">
            <CardBody className="p-6 text-center">
              <h2 className="text-2xl font-bold text-blue-400 mb-4">欢迎来到俄罗斯方块</h2>
              <p className="text-gray-300 mb-6">移动并旋转方块，填满一整行来消除它们</p>
              <Button
                variant="flat"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-300 w-full"
                onPress={startGame}
              >
                开始游戏
              </Button>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 游戏暂停提示 */}
      {status === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-40">
          <Card className="bg-gray-800/95 border-gray-600 shadow-2xl max-w-md w-full mx-4">
            <CardBody className="p-6 text-center">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">游戏已暂停</h2>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="flat"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-300"
                  onPress={startGame}
                >
                  继续游戏
                </Button>
                <Button
                  variant="flat"
                  className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg transition-all duration-300"
                  onPress={resetGame}
                >
                  重新开始
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 游戏结束覆盖层 */}
      {status === 'gameOver' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
          <Card className="bg-gray-800/95 border-gray-600 shadow-2xl max-w-md w-full mx-4">
            <CardBody className="p-6 text-center">
              <h2 className="text-2xl font-bold text-red-400 mb-2">游戏结束！</h2>
              <p className="text-gray-300 mb-2">你的方块堆叠到顶部了</p>
              <p className="text-gray-300 mb-6">最终得分: <span className="text-yellow-400 font-bold">{score}</span></p>
              {score > highScore && (
                <div className="bg-green-900/50 border border-green-500/30 rounded-lg p-3 mb-6 animate-pulse">
                  <p className="text-green-400 font-bold">新纪录！🎉</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="flat"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-300"
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
    </section>
  );
}

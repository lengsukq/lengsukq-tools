/**
 * 流量消耗器类型定义
 */

export interface TrafficConsumerState {
  // 配置
  url: string;
  threadCount: number;
  isInfinite: boolean;
  isRunning: boolean;

  // 统计数据
  totalWastedBytes: number; // 已消耗的总字节数
  currentSpeedBps: number; // 当前速度（字节/秒）
  runningTimeSeconds: number; // 运行时长（秒）

  // 内部状态
  tasks: number[]; // 每个线程的当前速度（字节/秒）
  error: string | null;
}

export type TrafficConsumerAction =
  | { type: "SET_URL"; payload: string }
  | { type: "SET_THREAD_COUNT"; payload: number }
  | { type: "SET_INFINITE"; payload: boolean }
  | { type: "START" }
  | { type: "STOP" }
  | { type: "RESET" }
  | { type: "UPDATE_SPEED"; payload: number }
  | { type: "UPDATE_WASTED"; payload: number }
  | { type: "TICK_TIME" }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "UPDATE_TASK_SPEED"; payload: { index: number; speed: number } }
  | { type: "CLEAR_TASKS" };

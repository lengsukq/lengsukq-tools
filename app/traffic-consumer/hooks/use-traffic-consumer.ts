"use client";

import { useReducer, useRef, useCallback, useEffect } from "react";
import { trafficConsumerReducer, initialState } from "../reducer";
import { TrafficConsumerState } from "../types";

/**
 * 流量消耗器核心 Hook
 * 按照 llxhq 项目的核心逻辑实现
 */
export const useTrafficConsumer = () => {
  const [state, dispatch] = useReducer(trafficConsumerReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const totalWastedBytesRef = useRef(0);
  const tasksRef = useRef<number[]>([]);
  const currentUrlRef = useRef(state.url);

  /**
   * 单线程下载函数
   * 核心逻辑：完全按照 llxhq 原始实现
   * 使用 onDownloadProgress 风格跟踪进度，实时计算速度
   */
  const download = useCallback(
    async (taskId: string, taskIndex: number): Promise<void> => {
      if (!isRunningRef.current || !abortControllerRef.current) {
        return;
      }

      let loaded = 0;
      let speed = 0;
      let timestamp = Date.now();

      // 初始化任务速度（按照原始逻辑：const index = this.tasks.push(speed) - 1）
      tasksRef.current[taskIndex] = 0;
      dispatch({ type: "UPDATE_TASK_SPEED", payload: { index: taskIndex, speed: 0 } });

      try {
        // 添加随机参数避免缓存（按照原始逻辑：params: { [id]: id }）
        const urlToUse = currentUrlRef.current;
        let urlWithParams: string;
        try {
          const urlObj = new URL(urlToUse);
          urlObj.searchParams.set(taskId, taskId);
          urlWithParams = urlObj.toString();
        } catch {
          // 如果 URL 解析失败，直接拼接参数
          const separator = urlToUse.includes("?") ? "&" : "?";
          urlWithParams = `${urlToUse}${separator}${taskId}=${taskId}`;
        }

        const response = await fetch(urlWithParams, {
          signal: abortControllerRef.current.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("无法获取响应体");
        }

        const reader = response.body.getReader();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // 按照原始逻辑计算速度
          // speed = (progressEvent.loaded - loaded) / (now - timestamp) * 1000
          const now = Date.now();
          const bytesDiff = value.length;
          const timeDiff = now - timestamp;

          if (timeDiff > 0) {
            // 计算速度：新增字节数 / 时间差（毫秒） * 1000（转换为每秒）
            speed = (bytesDiff / timeDiff) * 1000;

            // 更新该任务的速度（按照原始逻辑：that.tasks[index] = speed）
            tasksRef.current[taskIndex] = speed;
            dispatch({
              type: "UPDATE_TASK_SPEED",
              payload: { index: taskIndex, speed },
            });

            // 累加总流量（按照原始逻辑：that.waste += progressEvent.loaded - loaded）
            totalWastedBytesRef.current += bytesDiff;
            dispatch({
              type: "UPDATE_WASTED",
              payload: totalWastedBytesRef.current,
            });

            loaded += bytesDiff;
            timestamp = now;
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          // 下载被取消，正常情况
          return;
        }
        // 其他错误，继续运行（按照原始逻辑，不停止）
        console.error("下载错误:", error);
        dispatch({
          type: "SET_ERROR",
          payload: "因对方服务器限制，该资源暂无法访问，建议更换其他节点！",
        });
      } finally {
        // 清理任务速度（按照原始逻辑：delete that.tasks[index]）
        delete tasksRef.current[taskIndex];
        dispatch({ type: "UPDATE_TASK_SPEED", payload: { index: taskIndex, speed: 0 } });
      }
    },
    [],
  );

  /**
   * 开始下载
   * 核心逻辑：按照 llxhq 的 do...while 循环，多线程并发下载
   */
  const start = useCallback(async () => {
    if (isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    totalWastedBytesRef.current = 0; // 重置累加器
    tasksRef.current = []; // 重置任务数组
    currentUrlRef.current = state.url; // 保存当前 URL
    dispatch({ type: "START" });
    abortControllerRef.current = new AbortController();

    // 保存当前配置的引用
    const currentThreadCount = state.threadCount;
    const currentIsInfinite = state.isInfinite;

      // 每秒更新速度和运行时间（按照原始逻辑）
      timerRef.current = setInterval(() => {
        // 计算总速度（所有任务速度之和）
        // 按照原始逻辑：this.tasks.reduce(function (prev, curr) { return prev + curr; }, 0)
        const totalSpeed = tasksRef.current.reduce(
          (prev: number, curr: number) => prev + (curr || 0),
          0,
        );
        dispatch({ type: "UPDATE_SPEED", payload: totalSpeed });
        dispatch({ type: "TICK_TIME" });
      }, 1000);

    // 核心循环逻辑：do...while 无限循环（完全按照原始逻辑）
    do {
      await new Promise<void>((resolve) => {
        // 创建多个并发下载任务
        const downloadTasks: Promise<void>[] = [];
        // 确保 tasks 数组有足够长度
        tasksRef.current = new Array(currentThreadCount).fill(0);
        
        for (let i = 0; i < currentThreadCount; i++) {
          const taskId = Math.random().toString(36).substring(2, 12);
          downloadTasks.push(download(taskId, i));
        }
        // 等待所有任务完成（按照原始逻辑：Promise.all(task).finally(resolve)）
        Promise.all(downloadTasks).finally(() => resolve());
      });
    } while (isRunningRef.current && currentIsInfinite);
  }, [state.threadCount, state.isInfinite, state.url, download]);

  /**
   * 停止下载
   */
  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    dispatch({ type: "STOP" });
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    stop();
    totalWastedBytesRef.current = 0;
    tasksRef.current = [];
    dispatch({ type: "RESET" });
  }, [stop]);

  /**
   * 更新配置
   */
  const setUrl = useCallback((url: string) => {
    currentUrlRef.current = url;
    dispatch({ type: "SET_URL", payload: url });
  }, []);

  const setThreadCount = useCallback((count: number) => {
    dispatch({ type: "SET_THREAD_COUNT", payload: count });
  }, []);

  const setIsInfinite = useCallback((infinite: boolean) => {
    dispatch({ type: "SET_INFINITE", payload: infinite });
  }, []);

  // 手动控制启动/停止（不自动监听，由外部调用）

  // 清理函数
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    state,
    start,
    stop,
    reset,
    setUrl,
    setThreadCount,
    setIsInfinite,
  };
};

import { useReducer, useRef, useCallback, useEffect } from "react";
import { downloaderReducer, initialState } from "../reducer";
import { DownloaderState } from "../types";

/**
 * 封装了流量消耗下载逻辑的自定义 Hook
 */
export const useTrafficDownloader = () => {
  const [state, dispatch] = useReducer(downloaderReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const downloadStartTimeRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);
  const lastLoadedBytesRef = useRef<number>(0);

  const start = useCallback(
    async (url: string): Promise<{ completed: boolean }> => {
      if (state.isDownloading) return { completed: false };

      dispatch({ type: "START_DOWNLOAD" });
      abortControllerRef.current = new AbortController();
      downloadStartTimeRef.current = Date.now();
      lastUpdateTimeRef.current = Date.now();
      lastLoadedBytesRef.current = 0;

      try {
        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `请求失败: ${response.status} ${response.statusText}`,
          );
        }
        if (!response.body) {
          throw new Error("无法获取响应体");
        }

        const reader = response.body.getReader();
        const contentLength = response.headers.get("Content-Length");
        const totalBytes = contentLength ? parseInt(contentLength, 10) : null;
        const totalMB = totalBytes ? totalBytes / (1024 * 1024) : null;

        let loadedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          loadedBytes += value.length;
          const loadedMB = loadedBytes / (1024 * 1024);
          const percent = totalBytes ? (loadedBytes / totalBytes) * 100 : 0;

          dispatch({
            type: "UPDATE_PROGRESS",
            payload: { loadedMB, totalMB, percent },
          });

          const now = Date.now();
          const timeDiff = (now - lastUpdateTimeRef.current) / 1000;

          if (timeDiff > 0.5) {
            const bytesDiff = loadedBytes - lastLoadedBytesRef.current;
            const speedBps = bytesDiff / timeDiff;
            const speedMbps = (speedBps * 8) / (1000 * 1000);

            dispatch({ type: "UPDATE_SPEED", payload: speedMbps });
            lastUpdateTimeRef.current = now;
            lastLoadedBytesRef.current = loadedBytes;
          }
        }

        const finalDownloadedMB = loadedBytes / (1024 * 1024);

        dispatch({
          type: "COMPLETE_DOWNLOAD",
          payload: { url, size: finalDownloadedMB },
        });

        return { completed: true };
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("下载已取消");
          dispatch({ type: "STOP_DOWNLOAD" });
        } else {
          console.error("下载错误:", error);
          dispatch({ type: "SET_ERROR", payload: error.message });
        }

        return { completed: false };
      }
    },
    [state.isDownloading],
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch({ type: "STOP_DOWNLOAD" });
  }, []);

  const reset = useCallback(() => {
    stop();
    dispatch({ type: "RESET" });
  }, [stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { state, start, stop, reset };
};

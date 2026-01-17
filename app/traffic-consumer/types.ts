/**
 * 流量消耗器组件的类型定义
 */

export interface DownloadHistoryItem {
  url: string;
  timestamp: Date;
  size: number; // in MB
}

export interface DownloadProgress {
  loadedMB: number;
  totalMB: number | null;
  percent: number;
  speedMbps: number;
}

export interface DownloaderState {
  isDownloading: boolean;
  totalDownloadedMB: number;
  history: DownloadHistoryItem[];
  currentProgress: DownloadProgress;
  error: string | null;
}

export type DownloaderAction =
  | { type: "START_DOWNLOAD" }
  | { type: "STOP_DOWNLOAD" }
  | { type: "RESET" }
  | { type: "SET_ERROR"; payload: string }
  | {
      type: "UPDATE_PROGRESS";
      payload: Omit<DownloadProgress, "speedMbps">;
    }
  | { type: "UPDATE_SPEED"; payload: number }
  | { type: "COMPLETE_DOWNLOAD"; payload: { url: string; size: number } };

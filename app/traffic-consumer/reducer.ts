import { DownloaderState, DownloaderAction } from "./types";

export const initialState: DownloaderState = {
  isDownloading: false,
  totalDownloadedMB: 0,
  history: [],
  currentProgress: {
    loadedMB: 0,
    totalMB: null,
    percent: 0,
    speedMbps: 0,
  },
  error: null,
};

export function downloaderReducer(
  state: DownloaderState,
  action: DownloaderAction,
): DownloaderState {
  switch (action.type) {
    case "START_DOWNLOAD":
      return {
        ...state,
        isDownloading: true,
        error: null,
        currentProgress: initialState.currentProgress,
      };
    case "STOP_DOWNLOAD":
      return {
        ...state,
        isDownloading: false,
        currentProgress: initialState.currentProgress,
      };
    case "RESET":
      return initialState;
    case "SET_ERROR":
      return {
        ...state,
        isDownloading: false,
        error: action.payload,
      };
    case "UPDATE_PROGRESS":
      return {
        ...state,
        currentProgress: {
          ...state.currentProgress,
          ...action.payload,
        },
      };
    case "UPDATE_SPEED":
      return {
        ...state,
        currentProgress: {
          ...state.currentProgress,
          speedMbps: action.payload,
        },
      };
    case "COMPLETE_DOWNLOAD":
      const { url, size } = action.payload;

      return {
        ...state,
        isDownloading: false,
        totalDownloadedMB: state.totalDownloadedMB + size,
        history: [...state.history, { url, size, timestamp: new Date() }],
        currentProgress: {
          ...state.currentProgress,
          percent: 100,
          speedMbps: 0,
        },
      };
    default:
      return state;
  }
}

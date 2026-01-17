import { TrafficConsumerState, TrafficConsumerAction } from "./types";

export const initialState: TrafficConsumerState = {
  url: "https://cachefly.cachefly.net/50mb.test",
  threadCount: 3,
  isInfinite: true,
  isRunning: false,
  totalWastedBytes: 0,
  currentSpeedBps: 0,
  runningTimeSeconds: 0,
  tasks: [],
  error: null,
};

export function trafficConsumerReducer(
  state: TrafficConsumerState,
  action: TrafficConsumerAction,
): TrafficConsumerState {
  switch (action.type) {
    case "SET_URL":
      return { ...state, url: action.payload };

    case "SET_THREAD_COUNT":
      return { ...state, threadCount: action.payload };

    case "SET_INFINITE":
      return { ...state, isInfinite: action.payload };

    case "START":
      return {
        ...state,
        isRunning: true,
        error: null,
        tasks: [],
      };

    case "STOP":
      return {
        ...state,
        isRunning: false,
        currentSpeedBps: 0,
      };

    case "RESET":
      return {
        ...initialState,
        url: state.url,
        threadCount: state.threadCount,
        isInfinite: state.isInfinite,
      };

    case "UPDATE_SPEED":
      return { ...state, currentSpeedBps: action.payload };

    case "UPDATE_WASTED":
      return { ...state, totalWastedBytes: action.payload };

    case "TICK_TIME":
      return { ...state, runningTimeSeconds: state.runningTimeSeconds + 1 };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "UPDATE_TASK_SPEED": {
      const newTasks = [...state.tasks];
      newTasks[action.payload.index] = action.payload.speed;
      return { ...state, tasks: newTasks };
    }

    case "CLEAR_TASKS":
      return { ...state, tasks: [] };

    default:
      return state;
  }
}

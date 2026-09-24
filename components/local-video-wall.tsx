"use client";

/* eslint-disable jsx-a11y/media-has-caption -- User-selected local videos may have embedded captions; no external caption files are provided. */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";

import styles from "./local-video-wall.module.css";

type VideoSource = {
  id: string;
  file: File;
  path: string;
  signature: string;
};
type ScreenVideo = VideoSource & { url: string };
type LibraryEntry =
  | {
      type: "folder";
      name: string;
      path: string;
      count?: number;
      handle?: FileSystemDirectoryHandle;
    }
  | { type: "video"; source: VideoSource };
type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
};

const VIDEO_EXTENSIONS = new Set([
  "3g2",
  "3gp",
  "avi",
  "m4v",
  "mkv",
  "mov",
  "mp4",
  "mpe",
  "mpeg",
  "mpg",
  "ogv",
  "ogg",
  "ts",
  "webm",
  "wmv",
  "flv",
]);
const SOURCE_DRAG_TYPE = "application/x-local-video-source";
const SCREEN_DRAG_TYPE = "application/x-local-video-screen-item";
const MAX_SCREEN_VIDEOS = 4;
const SOURCE_PAGE_SIZE = 50;

function getFilePath(file: File) {
  return (
    (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
    file.name
  );
}
function isVideoFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  return file.type.startsWith("video/") || VIDEO_EXTENSIONS.has(extension);
}
function isVideoName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() || "";

  return VIDEO_EXTENSIONS.has(extension);
}
function getSignature(file: File, path = getFilePath(file)) {
  return path + "|" + file.size + "|" + file.lastModified;
}
function getParentDirectory(path: string) {
  const separator = path.lastIndexOf("/");

  return separator < 0 ? "" : path.slice(0, separator);
}
function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";

  return (
    (bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1) + " MB"
  );
}

function Icon({
  name,
  size = 18,
}: {
  name:
    | "folder"
    | "file"
    | "play"
    | "pause"
    | "close"
    | "up"
    | "down"
    | "previous"
    | "next"
    | "screen"
    | "film"
    | "expand"
    | "search"
    | "volume"
    | "muted";
  size?: number;
}) {
  const shared = {
    className: styles.icon,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "folder":
      return (
        <svg {...shared}>
          <path d="M3.5 7.5h6l2 2h9v8.8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z" />
          <path d="M3.5 7.5V5.7A1.7 1.7 0 0 1 5.2 4h4l2 2h4" />
        </svg>
      );
    case "file":
      return (
        <svg {...shared}>
          <path d="M13.5 3.8H6.7A1.7 1.7 0 0 0 5 5.5v13A1.7 1.7 0 0 0 6.7 20h10.6a1.7 1.7 0 0 0 1.7-1.7V8.9z" />
          <path d="M13.5 3.8v5.1H19M9 13h6M9 16.5h6" />
        </svg>
      );
    case "play":
      return (
        <svg {...shared} fill="currentColor" stroke="none">
          <path d="M7.5 4.8a1 1 0 0 1 1.5-.86l10.2 6.06a1.15 1.15 0 0 1 0 1.98L9 18.04a1 1 0 0 1-1.5-.86z" />
        </svg>
      );
    case "pause":
      return (
        <svg {...shared} fill="currentColor" stroke="none">
          <path d="M7 5.5A1.5 1.5 0 0 1 8.5 4h1A1.5 1.5 0 0 1 11 5.5v13A1.5 1.5 0 0 1 9.5 20h-1A1.5 1.5 0 0 1 7 18.5zM14 5.5A1.5 1.5 0 0 1 15.5 4h1A1.5 1.5 0 0 1 18 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5z" />
        </svg>
      );
    case "close":
      return (
        <svg {...shared}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case "up":
      return (
        <svg {...shared}>
          <path d="m6 14 6-6 6 6" />
        </svg>
      );
    case "down":
      return (
        <svg {...shared}>
          <path d="m6 10 6 6 6-6" />
        </svg>
      );
    case "previous":
      return (
        <svg {...shared}>
          <path d="m14.5 5-7 7 7 7M20 12H8" />
        </svg>
      );
    case "next":
      return (
        <svg {...shared}>
          <path d="m9.5 5 7 7-7 7M4 12h12" />
        </svg>
      );
    case "screen":
      return (
        <svg {...shared}>
          <rect height="13" rx="1.8" width="17" x="3.5" y="4.5" />
          <path d="M9 21h6M12 17.5V21" />
        </svg>
      );
    case "film":
      return (
        <svg {...shared}>
          <rect height="16" rx="2" width="17" x="3.5" y="4" />
          <path d="M7.5 4v16M16.5 4v16M3.5 9h4M3.5 15h4M16.5 9h4M16.5 15h4" />
        </svg>
      );
    case "expand":
      return (
        <svg {...shared}>
          <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4M9 9 4 4M15 9l5-5M15 15l5 5M9 15l-5 5" />
        </svg>
      );
    case "search":
      return (
        <svg {...shared}>
          <circle cx="10.8" cy="10.8" r="6.3" />
          <path d="m16 16 4.3 4.3" />
        </svg>
      );
    case "volume":
      return (
        <svg {...shared}>
          <path d="M4 9v6h4l5 4V5L8 9z" />
          <path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a8.5 8.5 0 0 1 0 11" />
        </svg>
      );
    case "muted":
      return (
        <svg {...shared}>
          <path d="M4 9v6h4l5 4V5L8 9z" />
          <path d="m17 9 5 6m0-6-5 6" />
        </svg>
      );
  }
}

export function LocalVideoWall() {
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [screenVideos, setScreenVideos] = useState<ScreenVideo[]>([]);
  const [columns, setColumns] = useState(2);
  const [masterVolume, setMasterVolume] = useState(1);
  const [playingIds, setPlayingIds] = useState<Set<string>>(new Set());
  const [directoryHandleMode, setDirectoryHandleMode] = useState(false);
  const [currentHandleEntries, setCurrentHandleEntries] = useState<
    LibraryEntry[] | null
  >(null);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [isScreenDragOver, setIsScreenDragOver] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState(
    "先读取视频文件夹，再把想播放的视频加入左侧放映屏。",
  );
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [currentDirectory, setCurrentDirectory] = useState("");
  const [query, setQuery] = useState("");
  const [sourcePage, setSourcePage] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const sourcesRef = useRef<VideoSource[]>([]);
  const screenVideosRef = useRef<ScreenVideo[]>([]);
  const playersRef = useRef(new Map<string, HTMLVideoElement>());
  const studioRef = useRef<HTMLDivElement>(null);
  const rootDirectoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const directoryHandlesRef = useRef(
    new Map<string, FileSystemDirectoryHandle>(),
  );
  const directoryScanTokenRef = useRef(0);

  const totalLibrarySize = useMemo(
    () => sources.reduce((sum, item) => sum + item.file.size, 0),
    [sources],
  );
  const libraryEntries = useMemo<LibraryEntry[]>(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    let entries: LibraryEntry[];

    if (directoryHandleMode) {
      entries = currentHandleEntries || [];
    } else {
      const prefix = currentDirectory ? currentDirectory + "/" : "";
      const folders = new Map<
        string,
        { name: string; path: string; count: number }
      >();
      const videos: LibraryEntry[] = [];

      for (const source of sources) {
        if (currentDirectory && !source.path.startsWith(prefix)) continue;
        const relativePath = currentDirectory
          ? source.path.slice(prefix.length)
          : source.path;
        const separator = relativePath.indexOf("/");

        if (separator === -1) {
          videos.push({ type: "video", source });
        } else {
          const name = relativePath.slice(0, separator);
          const path = prefix + name;
          const existing = folders.get(path);

          if (existing) existing.count += 1;
          else folders.set(path, { name, path, count: 1 });
        }
      }

      const folderEntries = Array.from(folders.values())
        .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
        .map((folder) => ({ type: "folder" as const, ...folder }));

      videos.sort((left, right) => {
        if (left.type !== "video" || right.type !== "video") return 0;

        return left.source.file.name.localeCompare(
          right.source.file.name,
          "zh-CN",
        );
      });

      entries = [...folderEntries, ...videos];
    }

    if (!normalizedQuery) return entries;

    return entries.filter((entry) => {
      const text =
        entry.type === "folder"
          ? entry.name + " " + entry.path
          : entry.source.file.name + " " + entry.source.path;

      return text.toLocaleLowerCase().includes(normalizedQuery);
    });
  }, [
    currentDirectory,
    currentHandleEntries,
    directoryHandleMode,
    query,
    sources,
  ]);
  const folderNeighbors = useMemo(() => {
    const folders = new Map<string, VideoSource[]>();

    for (const source of sources) {
      const parent = getParentDirectory(source.path);
      const siblings = folders.get(parent);

      if (siblings) siblings.push(source);
      else folders.set(parent, [source]);
    }

    const neighbors = new Map<string, { previous?: string; next?: string }>();

    folders.forEach((siblings) => {
      siblings.sort((left, right) =>
        left.file.name.localeCompare(right.file.name, "zh-CN"),
      );
      siblings.forEach((source, index) => {
        neighbors.set(source.id, {
          previous: siblings[index - 1]?.id,
          next: siblings[index + 1]?.id,
        });
      });
    });

    return neighbors;
  }, [sources]);

  const pageCount = Math.max(
    1,
    Math.ceil(libraryEntries.length / SOURCE_PAGE_SIZE),
  );
  const visibleEntries = libraryEntries.slice(
    sourcePage * SOURCE_PAGE_SIZE,
    (sourcePage + 1) * SOURCE_PAGE_SIZE,
  );
  const playingCount = playingIds.size;
  const gridColumns = Math.min(columns, Math.max(1, screenVideos.length));
  const gridRows = Math.max(1, Math.ceil(screenVideos.length / gridColumns));
  const directorySegments = currentDirectory
    ? currentDirectory.split("/").filter(Boolean)
    : [];
  const breadcrumbs = directoryHandleMode
    ? directorySegments.slice(1)
    : directorySegments;

  useEffect(
    () => () => {
      screenVideosRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    },
    [],
  );

  useEffect(() => {
    const syncFullscreenState = () =>
      setIsFullscreen(document.fullscreenElement === studioRef.current);

    document.addEventListener("fullscreenchange", syncFullscreenState);

    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    playersRef.current.forEach((player) => {
      player.volume = masterVolume;
    });
  }, [masterVolume, screenVideos]);

  useEffect(() => {
    if (sourcePage >= pageCount) setSourcePage(Math.max(0, pageCount - 1));
  }, [pageCount, sourcePage]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!focusedId || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;

      if (
        target instanceof Element &&
        target.closest(
          "input, textarea, select, [contenteditable='true'], button",
        )
      )
        return;
      const player = playersRef.current.get(focusedId);

      if (!player) return;

      if (event.code === "Space") {
        event.preventDefault();
        if (event.repeat) return;
        if (player.paused) {
          void player
            .play()
            .catch(() =>
              setStatus("无法开始播放此视频；请检查浏览器是否支持该文件格式。"),
            );
        } else {
          player.pause();
        }
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 5;
        const limit = Number.isFinite(player.duration)
          ? player.duration
          : Number.POSITIVE_INFINITY;

        player.currentTime = Math.min(
          limit,
          Math.max(
            0,
            player.currentTime + (event.key === "ArrowRight" ? step : -step),
          ),
        );
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [focusedId]);

  const addFilesToLibrary = useCallback(
    (files: File[], preferredFolder?: string) => {
      const videoFiles = files.filter(isVideoFile);

      if (videoFiles.length === 0) {
        setStatus(
          "没有找到视频文件。请换一个目录，或使用搜索筛选已扫描的视频。",
        );

        return;
      }

      const knownSignatures = new Set(
        sourcesRef.current.map((item) => item.signature),
      );
      const additions: VideoSource[] = [];

      for (const file of videoFiles) {
        const filePath = getFilePath(file);
        const path =
          directoryHandleMode && !filePath.includes("/")
            ? [currentDirectory, filePath].filter(Boolean).join("/")
            : filePath;
        const signature = getSignature(file, path);

        if (knownSignatures.has(signature)) continue;
        knownSignatures.add(signature);
        additions.push({
          id:
            Date.now().toString() +
            "-" +
            Math.random().toString(36).slice(2, 9),
          file,
          path,
          signature,
        });
      }
      if (additions.length === 0) {
        setStatus("这些视频已经在右侧片库中。");

        return;
      }

      const nextSources = [...sourcesRef.current, ...additions];

      sourcesRef.current = nextSources;
      setSources(nextSources);
      if (directoryHandleMode) {
        const currentDirectoryAdditions = additions.filter(
          (source) => getParentDirectory(source.path) === currentDirectory,
        );

        if (currentDirectoryAdditions.length)
          setCurrentHandleEntries((current) => [
            ...(current || []).filter((entry) => entry.type === "folder"),
            ...(current || []).filter(
              (entry) =>
                entry.type === "video" &&
                !currentDirectoryAdditions.some(
                  (source) => source.id === entry.source.id,
                ),
            ),
            ...currentDirectoryAdditions.map((source) => ({
              type: "video" as const,
              source,
            })),
          ]);
      }
      setQuery("");
      if (preferredFolder !== undefined && !directoryHandleMode)
        setCurrentDirectory(preferredFolder);
      setSourcePage(0);
      setSelectedSourceId(additions[0].id);
      const skipped = files.length - videoFiles.length;

      setStatus(
        "扫描完成：" +
          additions.length +
          " 个视频已加入右侧片库。拖到左侧或点“加入屏幕”载入；载入后需手动点击播放。" +
          (skipped ? "已跳过 " + skipped + " 个非视频文件。" : ""),
      );
    },
    [currentDirectory, directoryHandleMode],
  );

  const readDirectoryContents = async (
    directoryHandle: FileSystemDirectoryHandle,
    directoryPath: string,
  ) => {
    const scanToken = ++directoryScanTokenRef.current;
    const childFolders: Extract<LibraryEntry, { type: "folder" }>[] = [];
    const videoHandles: Array<{
      name: string;
      path: string;
      handle: FileSystemFileHandle;
    }> = [];

    directoryHandlesRef.current.set(directoryPath, directoryHandle);
    setCurrentDirectory(directoryPath);
    setCurrentHandleEntries([]);
    setIsDirectoryLoading(true);
    setSourcePage(0);
    setStatus("正在读取「" + directoryPath + "」中的当前目录项…");

    try {
      const directoryEntries = (
        directoryHandle as FileSystemDirectoryHandle & {
          entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
        }
      ).entries();

      for await (const [name, entry] of directoryEntries) {
        const entryPath = directoryPath + "/" + name;

        if (entry.kind === "directory") {
          const handle = entry as FileSystemDirectoryHandle;

          directoryHandlesRef.current.set(entryPath, handle);
          childFolders.push({
            type: "folder",
            name,
            path: entryPath,
            handle,
          });
        } else if (isVideoName(name)) {
          videoHandles.push({
            name,
            path: entryPath,
            handle: entry as FileSystemFileHandle,
          });
        }
      }

      videoHandles.sort((left, right) =>
        left.name.localeCompare(right.name, "zh-CN"),
      );
      const knownSources = new Map(
        sourcesRef.current.map((source) => [source.signature, source]),
      );
      const currentSources: VideoSource[] = [];
      const batchSize = 100;

      for (let index = 0; index < videoHandles.length; index += batchSize) {
        const batch = videoHandles.slice(index, index + batchSize);
        const files = await Promise.all(
          batch.map((entry) => entry.handle.getFile()),
        );

        if (scanToken !== directoryScanTokenRef.current) return;

        files.forEach((file, batchIndex) => {
          if (!isVideoFile(file)) return;
          const path = batch[batchIndex].path;
          const signature = getSignature(file, path);
          const known = knownSources.get(signature);
          const source: VideoSource = known
            ? { ...known, file, path, signature }
            : {
                id:
                  Date.now().toString() +
                  "-" +
                  Math.random().toString(36).slice(2, 9),
                file,
                path,
                signature,
              };

          knownSources.set(signature, source);
          currentSources.push(source);
        });
      }

      if (scanToken !== directoryScanTokenRef.current) return;

      const nextSourcesBySignature = new Map(
        sourcesRef.current.map((source) => [source.signature, source]),
      );

      currentSources.forEach((source) =>
        nextSourcesBySignature.set(source.signature, source),
      );

      const nextSources = Array.from(nextSourcesBySignature.values());

      sourcesRef.current = nextSources;
      setSources(nextSources);
      setCurrentHandleEntries([
        ...childFolders.sort((left, right) =>
          left.name.localeCompare(right.name, "zh-CN"),
        ),
        ...currentSources.map((source) => ({
          type: "video" as const,
          source,
        })),
      ]);
      setStatus(
        "已打开「" +
          directoryHandle.name +
          "」：当前层读取到 " +
          currentSources.length +
          " 个视频和 " +
          childFolders.length +
          " 个子文件夹。",
      );
    } catch {
      if (scanToken === directoryScanTokenRef.current)
        setStatus("无法读取「" + directoryPath + "」。请确认文件夹仍可访问。");
    } finally {
      if (scanToken === directoryScanTokenRef.current)
        setIsDirectoryLoading(false);
    }
  };

  const chooseVideoFolder = async () => {
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;

    if (!picker) {
      folderInputRef.current?.click();

      return;
    }

    try {
      const directoryHandle = await picker.call(window);

      sourcesRef.current = [];
      setSources([]);
      setDirectoryHandleMode(true);
      setCurrentHandleEntries([]);
      setQuery("");
      setSourcePage(0);
      setSelectedSourceId(null);
      rootDirectoryHandleRef.current = directoryHandle;
      directoryHandlesRef.current = new Map([
        [directoryHandle.name, directoryHandle],
      ]);
      await readDirectoryContents(directoryHandle, directoryHandle.name);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("无法打开文件夹。请检查浏览器的本地文件访问权限。");
    }
  };

  const onFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    const isFallbackFolderInput =
      event.currentTarget === folderInputRef.current;
    const folderRoots = new Set(
      files
        .map(getFilePath)
        .filter((path) => path.includes("/"))
        .map((path) => path.split("/")[0]),
    );

    addFilesToLibrary(
      files,
      folderRoots.size === 1 ? Array.from(folderRoots)[0] : undefined,
    );
    if (
      isFallbackFolderInput &&
      !(window as DirectoryPickerWindow).showDirectoryPicker
    )
      setStatus(
        "当前浏览器不支持逐层读取，本次已兼容导入所选目录。支持目录句柄的浏览器会在进入时再读取子文件夹。",
      );
    event.currentTarget.value = "";
  };

  const addSourceToScreen = (sourceId: string) => {
    const source = sourcesRef.current.find((item) => item.id === sourceId);

    if (!source) return;

    const alreadyLoaded = screenVideosRef.current.find(
      (item) => item.id === sourceId,
    );

    if (alreadyLoaded) {
      setFocusedId(sourceId);
      setSelectedSourceId(sourceId);
      playersRef.current.get(sourceId)?.focus({ preventScroll: true });
      setStatus(
        "「" +
          source.file.name +
          "」已经在放映屏中。点击视频控件上的播放键开始播放。",
      );

      return;
    }
    if (screenVideosRef.current.length >= MAX_SCREEN_VIDEOS) {
      setStatus("放映屏最多同时放置 4 个视频。请先移除一个窗口再添加。");

      return;
    }

    const screenVideo: ScreenVideo = {
      ...source,
      url: URL.createObjectURL(source.file),
    };
    const nextVideos = [...screenVideosRef.current, screenVideo];

    screenVideosRef.current = nextVideos;
    setScreenVideos(nextVideos);
    setFocusedId(sourceId);
    setSelectedSourceId(sourceId);
    setStatus(
      "「" +
        source.file.name +
        "」已加入放映屏。点击播放器中的播放键开始播放。",
    );
    requestAnimationFrame(() =>
      playersRef.current.get(sourceId)?.focus({ preventScroll: true }),
    );
  };

  const replaceScreenVideo = (
    sourceId: string,
    targetId: string,
    autoPlay = false,
  ) => {
    const source = sourcesRef.current.find((item) => item.id === sourceId);
    const nextVideos = [...screenVideosRef.current];
    const targetIndex = nextVideos.findIndex((item) => item.id === targetId);

    if (!source || targetIndex < 0) return;
    if (sourceId === targetId) {
      setFocusedId(sourceId);
      setSelectedSourceId(sourceId);
      playersRef.current.get(sourceId)?.focus({ preventScroll: true });

      return;
    }

    const loadedIndex = nextVideos.findIndex((item) => item.id === sourceId);

    if (loadedIndex >= 0) {
      [nextVideos[targetIndex], nextVideos[loadedIndex]] = [
        nextVideos[loadedIndex],
        nextVideos[targetIndex],
      ];
      setStatus(
        autoPlay
          ? "已切换到同文件夹视频，并继续播放。"
          : "该视频已在放映屏中，已与目标窗口交换位置。",
      );
    } else {
      const replacedVideo = nextVideos[targetIndex];

      playersRef.current.get(targetId)?.pause();
      URL.revokeObjectURL(replacedVideo.url);
      nextVideos[targetIndex] = {
        ...source,
        url: URL.createObjectURL(source.file),
      };
      setPlayingIds((current) => {
        const next = new Set(current);

        next.delete(targetId);

        return next;
      });
      setStatus(
        autoPlay
          ? "已切换到「" + source.file.name + "」，并继续播放。"
          : "「" +
              source.file.name +
              "」已替换目标窗口，点击播放器中的播放键开始播放。",
      );
    }

    screenVideosRef.current = nextVideos;
    setScreenVideos(nextVideos);
    setFocusedId(sourceId);
    setSelectedSourceId(sourceId);
    requestAnimationFrame(() => {
      const player = playersRef.current.get(sourceId);

      player?.focus({ preventScroll: true });
      if (autoPlay && player)
        void player
          .play()
          .catch(() =>
            setStatus("无法开始播放此视频；请检查浏览器是否支持该文件格式。"),
          );
    });
  };

  const navigateWithinFolder = (id: string, direction: -1 | 1) => {
    const neighbor =
      folderNeighbors.get(id)?.[direction === -1 ? "previous" : "next"];

    if (neighbor) replaceScreenVideo(neighbor, id, playingIds.has(id));
  };

  const removeFromScreen = (id: string) => {
    const item = screenVideosRef.current.find((video) => video.id === id);

    playersRef.current.get(id)?.pause();
    if (item) URL.revokeObjectURL(item.url);
    const nextVideos = screenVideosRef.current.filter(
      (video) => video.id !== id,
    );

    screenVideosRef.current = nextVideos;
    setScreenVideos(nextVideos);
    setPlayingIds((current) => {
      const next = new Set(current);

      next.delete(id);

      return next;
    });
    const nextFocusId = nextVideos[0]?.id || null;

    setFocusedId(nextFocusId);
    if (nextFocusId)
      requestAnimationFrame(() =>
        playersRef.current.get(nextFocusId)?.focus({ preventScroll: true }),
      );
    setStatus("视频窗口已从放映屏移除，右侧片库中的视频仍可再次载入。");
  };

  const clearScreen = () => {
    screenVideosRef.current.forEach((item) => {
      playersRef.current.get(item.id)?.pause();
      URL.revokeObjectURL(item.url);
    });
    screenVideosRef.current = [];
    setScreenVideos([]);
    setPlayingIds(new Set());
    setFocusedId(null);
    setStatus("放映屏已清空。右侧片库保留，可以继续挑选视频。");
  };

  const clearLibrary = () => {
    directoryScanTokenRef.current += 1;
    sourcesRef.current = [];
    setSources([]);
    setDirectoryHandleMode(false);
    setCurrentHandleEntries(null);
    setIsDirectoryLoading(false);
    rootDirectoryHandleRef.current = null;
    directoryHandlesRef.current.clear();
    setSelectedSourceId(null);
    setCurrentDirectory("");
    setSourcePage(0);
    setQuery("");
    setStatus("右侧片库已清空。已载入放映屏的视频会保留。");
  };

  const playAll = async () => {
    const players = screenVideosRef.current
      .map((item) => playersRef.current.get(item.id))
      .filter((player): player is HTMLVideoElement => Boolean(player));

    if (players.length === 0) return;
    const results = await Promise.all(
      players.map(async (player) => {
        try {
          await player.play();

          return true;
        } catch {
          return false;
        }
      }),
    );

    setStatus(
      results.some((played) => !played)
        ? "部分视频无法开始播放；可在对应窗口单独点击播放，文件编码也可能不受当前浏览器支持。"
        : "正在同时播放 " + players.length + " 个视频。",
    );
  };

  const pauseAll = () => {
    playersRef.current.forEach((player) => player.pause());
    setStatus("放映屏中的视频已全部暂停。");
  };

  const reorderScreenVideos = (sourceId: string, targetId?: string) => {
    if (sourceId === targetId) return;
    const current = [...screenVideosRef.current];
    const sourceIndex = current.findIndex((item) => item.id === sourceId);

    if (sourceIndex < 0) return;
    if (targetId) {
      const targetIndex = current.findIndex((item) => item.id === targetId);

      if (targetIndex < 0) return;
      [current[sourceIndex], current[targetIndex]] = [
        current[targetIndex],
        current[sourceIndex],
      ];
    } else {
      const [moved] = current.splice(sourceIndex, 1);

      current.push(moved);
    }
    screenVideosRef.current = current;
    setScreenVideos(current);
    setFocusedId(sourceId);
    requestAnimationFrame(() =>
      playersRef.current.get(sourceId)?.focus({ preventScroll: true }),
    );
  };

  const moveVideo = (id: string, direction: -1 | 1) => {
    const current = [...screenVideosRef.current];
    const index = current.findIndex((item) => item.id === id);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return;
    [current[index], current[nextIndex]] = [current[nextIndex], current[index]];
    screenVideosRef.current = current;
    setScreenVideos(current);
    setFocusedId(id);
    requestAnimationFrame(() =>
      playersRef.current.get(id)?.focus({ preventScroll: true }),
    );
  };

  const handleScreenDrop = (
    event: DragEvent<HTMLElement>,
    targetId?: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setIsScreenDragOver(false);
    const droppedFiles = Array.from(event.dataTransfer.files || []);

    if (droppedFiles.length) {
      addFilesToLibrary(droppedFiles);

      return;
    }
    const sourceId = event.dataTransfer.getData(SOURCE_DRAG_TYPE);

    if (sourceId) {
      if (targetId) replaceScreenVideo(sourceId, targetId);
      else addSourceToScreen(sourceId);

      return;
    }
    const screenItemId = event.dataTransfer.getData(SCREEN_DRAG_TYPE);

    if (screenItemId) reorderScreenVideos(screenItemId, targetId);
  };

  const toggleScreenFullscreen = async () => {
    if (!studioRef.current) return;
    try {
      if (document.fullscreenElement === studioRef.current)
        await document.exitFullscreen();
      else await studioRef.current.requestFullscreen();
    } catch {
      setStatus("浏览器没有允许全屏显示。请检查当前页面的全屏权限。");
    }
  };

  const onWorkspaceDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsScreenDragOver(false);
    const droppedFiles = Array.from(event.dataTransfer.files || []);

    if (droppedFiles.length) addFilesToLibrary(droppedFiles);
  };

  const navigateToDirectory = async (path: string) => {
    setQuery("");
    setSourcePage(0);
    setSelectedSourceId(null);

    if (directoryHandleMode && rootDirectoryHandleRef.current) {
      const rootHandle = rootDirectoryHandleRef.current;
      const targetPath = path || rootHandle.name;
      const navigationToken = ++directoryScanTokenRef.current;

      try {
        let targetHandle = directoryHandlesRef.current.get(targetPath);

        if (!targetHandle) {
          targetHandle = rootHandle;
          let traversedPath = rootHandle.name;

          for (const segment of targetPath.split("/").slice(1)) {
            targetHandle = await targetHandle.getDirectoryHandle(segment);
            traversedPath += "/" + segment;
            directoryHandlesRef.current.set(traversedPath, targetHandle);
          }
        }

        if (navigationToken !== directoryScanTokenRef.current) return;

        await readDirectoryContents(targetHandle, targetPath);
      } catch {
        if (navigationToken === directoryScanTokenRef.current)
          setStatus("无法打开「" + targetPath + "」。请确认该文件夹仍可访问。");
      }

      return;
    }

    setCurrentDirectory(path);
  };

  return (
    <div
      className={styles.workspace}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onWorkspaceDrop}
    >
      <input
        ref={fileInputRef}
        multiple
        accept="video/*,.mkv,.avi,.wmv,.flv,.ts"
        className={styles.hiddenInput}
        type="file"
        onChange={onFileInput}
      />
      <input
        ref={folderInputRef}
        multiple
        className={styles.hiddenInput}
        type="file"
        onChange={onFileInput}
        onClick={(event) =>
          event.currentTarget.setAttribute("webkitdirectory", "")
        }
      />

      <div className={styles.pageFrame}>
        <header className={styles.pageHeader}>
          <div>
            <div className={styles.breadcrumb}>
              工具 <span>/</span> 本地视频墙
            </div>
            <h1>本地视频墙</h1>
            <p>
              文件夹按需逐层读取，挑选最多 4
              个视频放到同一放映屏。文件只在本机读取。
            </p>
          </div>
          <div className={styles.privacyBadge}>
            <span /> 本机播放，不上传文件
          </div>
        </header>

        <div ref={studioRef} className={styles.studio}>
          <section
            aria-label="放映屏"
            className={
              styles.screenPanel +
              (isScreenDragOver ? " " + styles.screenDropActive : "")
            }
            onDragEnter={(event) => {
              const types = Array.from(event.dataTransfer.types);

              if (types.includes("Files") || types.includes(SOURCE_DRAG_TYPE))
                setIsScreenDragOver(true);
              else if (types.includes(SCREEN_DRAG_TYPE))
                setIsScreenDragOver(false);
            }}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target)
                setIsScreenDragOver(false);
            }}
            onDragOver={(event) => {
              const types = Array.from(event.dataTransfer.types);
              const isReorderingScreen = types.includes(SCREEN_DRAG_TYPE);

              event.preventDefault();
              event.dataTransfer.dropEffect = isReorderingScreen
                ? "move"
                : "copy";
              setIsScreenDragOver(
                !isReorderingScreen &&
                  (types.includes("Files") || types.includes(SOURCE_DRAG_TYPE)),
              );
            }}
            onDrop={(event) => handleScreenDrop(event)}
          >
            <div className={styles.panelToolbar}>
              <div className={styles.panelTitle}>
                <span className={styles.panelIcon}>
                  <Icon name="screen" size={17} />
                </span>
                <div>
                  <strong>放映屏</strong>
                  <small>
                    {screenVideos.length} / {MAX_SCREEN_VIDEOS} 个窗口
                  </small>
                </div>
              </div>
              <div className={styles.screenActions}>
                <div aria-label="网格列数" className={styles.layoutControl}>
                  <span>网格</span>
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      aria-label={count + " 列"}
                      aria-pressed={columns === count}
                      className={columns === count ? styles.layoutActive : ""}
                      type="button"
                      onClick={() => setColumns(count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <div className={styles.masterVolumeControl}>
                  <button
                    aria-label={masterVolume > 0 ? "静音所有视频" : "取消静音"}
                    className={styles.volumeButton}
                    title={masterVolume > 0 ? "静音所有视频" : "取消静音"}
                    type="button"
                    onClick={() =>
                      setMasterVolume((volume) => (volume > 0 ? 0 : 1))
                    }
                  >
                    <Icon
                      name={masterVolume > 0 ? "volume" : "muted"}
                      size={15}
                    />
                  </button>
                  <input
                    aria-label="所有视频音量"
                    max="1"
                    min="0"
                    step="0.01"
                    title="控制放映屏所有视频的音量"
                    type="range"
                    value={masterVolume}
                    onChange={(event) =>
                      setMasterVolume(Number(event.currentTarget.value))
                    }
                  />
                  <output>{Math.round(masterVolume * 100)}%</output>
                </div>
                <button
                  aria-label="全部播放"
                  className={styles.toolButton}
                  disabled={!screenVideos.length}
                  title="全部播放"
                  type="button"
                  onClick={() => void playAll()}
                >
                  <Icon name="play" size={15} />
                </button>
                <button
                  aria-label="全部暂停"
                  className={styles.toolButton}
                  disabled={playingCount === 0}
                  title="全部暂停"
                  type="button"
                  onClick={pauseAll}
                >
                  <Icon name="pause" size={15} />
                </button>
                <button
                  className={styles.fullscreenButton}
                  title={isFullscreen ? "退出全屏" : "放映屏全屏"}
                  type="button"
                  onClick={() => void toggleScreenFullscreen()}
                >
                  <Icon name="expand" size={15} />
                  <span>{isFullscreen ? "退出全屏" : "全屏"}</span>
                </button>
              </div>
            </div>

            {screenVideos.length === 0 ? (
              <div
                className={
                  styles.emptyScreen +
                  (isScreenDragOver ? " " + styles.emptyScreenActive : "")
                }
              >
                <div className={styles.emptyIcon}>
                  <Icon name="film" size={25} />
                </div>
                <h2>
                  {isScreenDragOver ? "松开以加入放映屏" : "先从右侧挑选视频"}
                </h2>
                <p>
                  把右侧文件夹中的视频拖到这里，或点旁边的“加入屏幕”。
                  <br />
                  载入后不会自动播放，可在播放器中手动开始。
                </p>
                <div className={styles.emptyButtons}>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => void chooseVideoFolder()}
                  >
                    <Icon name="folder" size={16} />
                    读取文件夹
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Icon name="file" size={16} />
                    选择视频
                  </button>
                </div>
                <span className={styles.dropHint}>
                  拖放区域 · 最多 4 个窗口
                </span>
              </div>
            ) : (
              <div
                className={styles.videoGrid}
                style={
                  {
                    "--grid-columns": gridColumns,
                    "--grid-rows": gridRows,
                    "--grid-rows-mobile": Math.max(1, screenVideos.length),
                  } as React.CSSProperties
                }
              >
                {screenVideos.map((item, index) => (
                  <article
                    key={item.id}
                    draggable
                    className={
                      styles.videoCard +
                      (focusedId === item.id
                        ? " " + styles.videoCardFocused
                        : "")
                    }
                    title={item.file.name}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = Array.from(
                        event.dataTransfer.types,
                      ).includes(SCREEN_DRAG_TYPE)
                        ? "move"
                        : "copy";
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData(SCREEN_DRAG_TYPE, item.id);
                      event.dataTransfer.setData("text/plain", item.id);
                    }}
                    onDrop={(event) => handleScreenDrop(event, item.id)}
                    onFocusCapture={() => setFocusedId(item.id)}
                    onPointerDownCapture={() => setFocusedId(item.id)}
                  >
                    <div className={styles.cardHeading}>
                      <div className={styles.clipIdentity}>
                        <span className={styles.clipIndex}>
                          {(index + 1).toString().padStart(2, "0")}
                        </span>
                        <div className={styles.clipText}>
                          <strong title={item.file.name}>
                            {item.file.name}
                          </strong>
                          <span title={item.path}>{item.path}</span>
                        </div>
                      </div>
                      <div className={styles.tileActions}>
                        <button
                          aria-label="播放同文件夹上一个视频"
                          disabled={!folderNeighbors.get(item.id)?.previous}
                          title="同文件夹上一个视频"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigateWithinFolder(item.id, -1);
                          }}
                        >
                          <Icon name="previous" size={13} />
                        </button>
                        <button
                          aria-label="播放同文件夹下一个视频"
                          disabled={!folderNeighbors.get(item.id)?.next}
                          title="同文件夹下一个视频"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigateWithinFolder(item.id, 1);
                          }}
                        >
                          <Icon name="next" size={13} />
                        </button>
                        <button
                          aria-label="向前移动"
                          disabled={index === 0}
                          title="向前移动"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            moveVideo(item.id, -1);
                          }}
                        >
                          <Icon name="up" size={14} />
                        </button>
                        <button
                          aria-label="向后移动"
                          disabled={index === screenVideos.length - 1}
                          title="向后移动"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            moveVideo(item.id, 1);
                          }}
                        >
                          <Icon name="down" size={14} />
                        </button>
                        <button
                          aria-label="从放映屏移除"
                          title="从放映屏移除"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeFromScreen(item.id);
                          }}
                        >
                          <Icon name="close" size={15} />
                        </button>
                      </div>
                    </div>
                    <div className={styles.playerFrame}>
                      <video
                        ref={(node) => {
                          if (node) playersRef.current.set(item.id, node);
                          else playersRef.current.delete(item.id);
                        }}
                        controls
                        playsInline
                        className={styles.player}
                        preload="none"
                        src={item.url}
                        tabIndex={0}
                        onClick={() => setFocusedId(item.id)}
                        onEnded={() =>
                          setPlayingIds((current) => {
                            const next = new Set(current);

                            next.delete(item.id);

                            return next;
                          })
                        }
                        onError={() =>
                          setStatus(
                            "无法播放「" +
                              item.file.name +
                              "」。当前浏览器可能不支持该文件的编码格式。",
                          )
                        }
                        onFocus={() => setFocusedId(item.id)}
                        onPause={() =>
                          setPlayingIds((current) => {
                            const next = new Set(current);

                            next.delete(item.id);

                            return next;
                          })
                        }
                        onPlay={() =>
                          setPlayingIds((current) =>
                            new Set(current).add(item.id),
                          )
                        }
                      />
                    </div>
                    <div className={styles.cardFoot}>
                      <span>
                        <i
                          className={
                            playingIds.has(item.id) ? styles.liveDot : ""
                          }
                        />
                        {playingIds.has(item.id)
                          ? "正在播放"
                          : "已载入，等待播放"}
                      </span>
                      {focusedId === item.id && (
                        <span className={styles.controlTarget}>
                          键盘控制目标
                        </span>
                      )}
                      <span>{formatSize(item.file.size)}</span>
                    </div>
                  </article>
                ))}
                {isScreenDragOver && (
                  <div className={styles.dropPlaceholder}>
                    松开放置；拖到已有窗口可替换
                  </div>
                )}
              </div>
            )}

            <div aria-live="polite" className={styles.screenStatus}>
              <span className={styles.statusLed} />
              {status}
            </div>
            {screenVideos.length > 0 && (
              <div className={styles.screenFooter}>
                <span>
                  操作窗口后自动成为键盘控制目标：空格播放 / 暂停 · ← / → 前后 5
                  秒 · Shift + 方向键 10 秒
                </span>
                <button type="button" onClick={clearScreen}>
                  清空放映屏
                </button>
              </div>
            )}
          </section>

          <div className={styles.fullscreenLibraryDrawer}>
            <button
              aria-label="显示文件夹管理"
              className={styles.fullscreenLibraryTrigger}
              title="鼠标移开后片库会自动收起"
              type="button"
            >
              <Icon name="folder" size={16} />
              <span>文件夹</span>
            </button>
            <aside aria-label="视频文件夹管理" className={styles.libraryPanel}>
              <div className={styles.libraryHeader}>
                <div className={styles.libraryTitle}>
                  <span className={styles.libraryIcon}>
                    <Icon name="folder" size={17} />
                  </span>
                  <div>
                    <h2>文件夹管理</h2>
                    <p>
                      {directoryHandleMode ? "已读取 " : ""}
                      {sources.length.toLocaleString()} 个视频 ·{" "}
                      {formatSize(totalLibrarySize)}
                    </p>
                  </div>
                </div>
                {(sources.length > 0 || directoryHandleMode) && (
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={clearLibrary}
                  >
                    清空片库
                  </button>
                )}
              </div>

              <div className={styles.libraryActions}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => void chooseVideoFolder()}
                >
                  <Icon name="folder" size={16} />
                  读取文件夹
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Icon name="file" size={16} />
                  添加视频
                </button>
              </div>

              <label className={styles.searchBox}>
                <Icon name="search" size={16} />
                <input
                  placeholder="搜索当前文件夹中的视频或子文件夹"
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.currentTarget.value);
                    setSourcePage(0);
                  }}
                />
                {query && (
                  <button
                    aria-label="清除搜索"
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSourcePage(0);
                    }}
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </label>

              <div className={styles.breadcrumbBar}>
                <button
                  className={
                    (!currentDirectory ||
                      (directoryHandleMode &&
                        currentDirectory ===
                          rootDirectoryHandleRef.current?.name)) &&
                    !query
                      ? styles.breadcrumbCurrent
                      : ""
                  }
                  type="button"
                  onClick={() =>
                    void navigateToDirectory(
                      directoryHandleMode
                        ? rootDirectoryHandleRef.current?.name || ""
                        : "",
                    )
                  }
                >
                  {directoryHandleMode
                    ? rootDirectoryHandleRef.current?.name || "全部文件"
                    : "全部文件"}
                </button>
                {!query &&
                  breadcrumbs.map((part, index) => {
                    const path = directoryHandleMode
                      ? [
                          rootDirectoryHandleRef.current?.name,
                          ...breadcrumbs.slice(0, index + 1),
                        ]
                          .filter(Boolean)
                          .join("/")
                      : breadcrumbs.slice(0, index + 1).join("/");

                    return (
                      <span key={path} className={styles.breadcrumbPart}>
                        <span>/</span>
                        <button
                          className={
                            index === breadcrumbs.length - 1
                              ? styles.breadcrumbCurrent
                              : ""
                          }
                          type="button"
                          onClick={() => void navigateToDirectory(path)}
                        >
                          {part}
                        </button>
                      </span>
                    );
                  })}
                {query && (
                  <span className={styles.searchResultLabel}>搜索结果</span>
                )}
              </div>

              <div className={styles.listMeta}>
                <span>{libraryEntries.length.toLocaleString()} 个结果</span>
                <span>每页 {SOURCE_PAGE_SIZE} 条</span>
              </div>

              {visibleEntries.length > 0 ? (
                <div className={styles.sourceList}>
                  {visibleEntries.map((entry, index) => {
                    if (entry.type === "folder") {
                      return (
                        <button
                          key={"folder:" + entry.path}
                          className={styles.folderRow}
                          disabled={isDirectoryLoading}
                          type="button"
                          onClick={() => {
                            if (entry.handle)
                              void readDirectoryContents(
                                entry.handle,
                                entry.path,
                              );
                            else void navigateToDirectory(entry.path);
                          }}
                        >
                          <span className={styles.folderRowIcon}>
                            <Icon name="folder" size={17} />
                          </span>
                          <span className={styles.sourceInfo}>
                            <strong>{entry.name}</strong>
                            <small>
                              {entry.count !== undefined
                                ? entry.count.toLocaleString() + " 个视频"
                                : "打开时再读取内容"}
                            </small>
                          </span>
                          <span className={styles.folderChevron}>›</span>
                        </button>
                      );
                    }
                    const item = entry.source;
                    const isLoaded = screenVideos.some(
                      (video) => video.id === item.id,
                    );
                    const isSelected = selectedSourceId === item.id;

                    return (
                      <div
                        key={item.id}
                        draggable
                        className={
                          styles.sourceRow +
                          (isSelected ? " " + styles.sourceRowSelected : "")
                        }
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "copy";
                          event.dataTransfer.setData(SOURCE_DRAG_TYPE, item.id);
                          event.dataTransfer.setData("text/plain", item.id);
                        }}
                      >
                        <span className={styles.sourceIndex}>
                          {(sourcePage * SOURCE_PAGE_SIZE + index + 1)
                            .toString()
                            .padStart(2, "0")}
                        </span>
                        <span className={styles.sourceFileIcon}>
                          <Icon name="film" size={15} />
                        </span>
                        <button
                          className={styles.sourceInfoButton}
                          title={item.path}
                          type="button"
                          onClick={() => setSelectedSourceId(item.id)}
                        >
                          <span className={styles.sourceInfo}>
                            <strong>{item.file.name}</strong>
                            <small>
                              {item.path !== item.file.name
                                ? item.path
                                : formatSize(item.file.size)}
                            </small>
                          </span>
                        </button>
                        <button
                          aria-label={
                            isLoaded
                              ? "已加入放映屏"
                              : "将 " + item.file.name + " 加入放映屏"
                          }
                          className={
                            styles.addSourceButton +
                            (isLoaded ? " " + styles.addSourceLoaded : "")
                          }
                          disabled={
                            isLoaded || screenVideos.length >= MAX_SCREEN_VIDEOS
                          }
                          title={
                            isLoaded
                              ? "已加入放映屏"
                              : "加入放映屏，不会自动播放"
                          }
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            addSourceToScreen(item.id);
                          }}
                        >
                          {isLoaded ? "已加入" : "加入"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.libraryEmpty}>
                  <Icon name={query ? "search" : "folder"} size={21} />
                  <strong>
                    {isDirectoryLoading
                      ? "正在读取当前文件夹…"
                      : sources.length
                        ? query
                          ? "没有匹配的视频"
                          : "这个文件夹里没有视频"
                        : directoryHandleMode
                          ? "这个文件夹是空的"
                          : "片库还是空的"}
                  </strong>
                  <span>
                    {isDirectoryLoading
                      ? "这里只读取当前层，进入子文件夹时才会继续扫描。"
                      : sources.length
                        ? query
                          ? "试试其他关键词，或清除搜索。"
                          : "返回上一级文件夹，或打开一个子文件夹。"
                        : "选择根文件夹后，视频和子文件夹会按需逐层显示。"}
                  </span>
                </div>
              )}

              <div className={styles.libraryBottom}>
                <div className={styles.pagination}>
                  <span>
                    第 {libraryEntries.length ? sourcePage + 1 : 0} /{" "}
                    {libraryEntries.length ? pageCount : 0} 页
                  </span>
                  <div>
                    <button
                      aria-label="上一页"
                      disabled={sourcePage === 0}
                      type="button"
                      onClick={() =>
                        setSourcePage((page) => Math.max(0, page - 1))
                      }
                    >
                      ‹
                    </button>
                    <button
                      aria-label="下一页"
                      disabled={sourcePage + 1 >= pageCount}
                      type="button"
                      onClick={() =>
                        setSourcePage((page) =>
                          Math.min(pageCount - 1, page + 1),
                        )
                      }
                    >
                      ›
                    </button>
                  </div>
                </div>
                <p className={styles.libraryHint}>
                  可点文件夹浏览子目录。把视频拖到左侧，或点“加入”；加入后需手动播放，一次最多
                  4 个。
                </p>
              </div>
            </aside>
          </div>
        </div>

        <footer className={styles.pageFooter}>
          <span>本地视频不会上传</span>
          <span>格式支持取决于浏览器内置解码能力</span>
          <span>刷新页面后需重新读取目录</span>
        </footer>
      </div>
    </div>
  );
}

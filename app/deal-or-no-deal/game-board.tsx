"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  acceptDeal,
  createGame,
  DEFAULT_GAME_STATS,
  openCase,
  PRIZE_VALUES,
  rejectDeal,
  resolveFinalCase,
  ROUND_SIZES,
  sanitizeGameStats,
  selectCase,
  type Briefcase,
  type GameState,
  type GameStats,
} from "./game-engine";
import styles from "./game-board.module.css";

const STATS_STORAGE_KEY = "deal-or-no-deal.stats.v1";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: amount < 1 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function readSavedStats(): GameStats {
  try {
    const saved = window.localStorage.getItem(STATS_STORAGE_KEY);

    return saved ? sanitizeGameStats(JSON.parse(saved)) : DEFAULT_GAME_STATS;
  } catch {
    return DEFAULT_GAME_STATS;
  }
}

type GameSound = "lock" | "open" | "reveal" | "offer" | "deal" | "continue" | "final";

function playGameSound(
  enabled: boolean,
  kind: GameSound,
  contextRef: { current: AudioContext | null },
) {
  if (!enabled || typeof window === "undefined" || typeof window.AudioContext !== "function") return;

  try {
    const context = contextRef.current ?? new window.AudioContext();
    contextRef.current = context;
    if (context.state === "suspended") void context.resume().catch(() => undefined);

    const tone = (
      frequency: number,
      offset: number,
      duration: number,
      waveform: OscillatorType = "sine",
      volume = 0.09,
      endFrequency?: number,
    ) => {
      const start = context.currentTime + offset;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(volume, start + 0.015);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    };

    switch (kind) {
      case "lock":
        [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, index * 0.085, 0.18, "sine", 0.075));
        break;
      case "open":
        tone(155, 0, 0.24, "triangle", 0.11, 75);
        tone(415, 0.04, 0.17, "triangle", 0.035, 290);
        break;
      case "reveal":
        [659, 784, 988].forEach((frequency, index) => tone(frequency, index * 0.09, 0.2, "sine", 0.065));
        break;
      case "offer":
        [0, 0.2, 0.52, 0.72].forEach((offset, index) => tone(index % 2 ? 930 : 760, offset, 0.17, "square", 0.026));
        break;
      case "deal":
      case "final":
        [523, 659, 784, 1047, 1319].forEach((frequency, index) => tone(frequency, index * 0.095, 0.26, "sine", 0.085));
        break;
      case "continue":
        [392, 494, 587].forEach((frequency, index) => tone(frequency, index * 0.11, 0.2, "triangle", 0.055));
        break;
    }
  } catch {
    // Audio support is optional; a blocked audio context must never stop the game.
  }
}

function BriefcaseArt({
  number,
  opened,
  selected,
  animating,
  className = "",
}: {
  number: number;
  opened: boolean;
  selected: boolean;
  animating: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={`${styles.caseArt} ${opened ? styles.caseArtOpened : ""} ${selected ? styles.caseArtSelected : ""} ${animating ? styles.caseArtAnimating : ""} ${className}`}
      viewBox="0 0 100 78"
    >
      <defs>
        <linearGradient id={`case-gold-${number}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff4aa" />
          <stop offset="0.48" stopColor="#ffc52e" />
          <stop offset="1" stopColor="#dc7900" />
        </linearGradient>
        <linearGradient id={`case-red-${number}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ff5860" />
          <stop offset="1" stopColor="#bb0815" />
        </linearGradient>
      </defs>
      {selected && (
        <path
          d="M50 3 57 14 70 11 67 24 79 31 67 38 70 51 57 48 50 60 43 48 30 51 33 38 21 31 33 24 30 11 43 14Z"
          fill="#fff4b1"
          opacity=".72"
        />
      )}
      <g className={opened ? styles.caseLidOpen : styles.caseLid}>
        <path d="M35 16v-5c0-7 5-10 15-10s15 3 15 10v5h-7v-5c0-3-2-4-8-4s-8 1-8 4v5Z" fill="#ffd969" />
        <path d="M13 22 20 16h60l7 6v10H13Z" fill={`url(#case-gold-${number})`} stroke="#9d4b00" strokeWidth="2" />
      </g>
      <path d="M10 31h80v37H10z" fill={`url(#case-red-${number})`} stroke="#8f0710" strokeWidth="3" />
      <path d="M10 31h80v7H10z" fill="#ffdf70" />
      <path d="M47 38h6v30h-6z" fill="#ffd34e" opacity=".95" />
      <path d="M18 46h12v4H18zm52 0h12v4H70z" fill="#ffd34e" opacity=".8" />
      <rect x="42" y="48" width="16" height="12" rx="3" fill="#ffdf70" stroke="#9d4b00" strokeWidth="2" />
      <circle cx="50" cy="54" r="2" fill="#a54300" />
      <path d="m15 69 3 4h64l3-4" fill="#9e0711" />
    </svg>
  );
}

function SparkleBurst({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 220 150"
    >
      <path d="M110 4v24M110 122v24M4 75h25m162 0h25M35 20l18 18m114 74 18 18M185 20l-18 18M53 112l-18 18" stroke="currentColor" strokeLinecap="round" strokeWidth="5" />
      <path d="m110 34 9 28 29 13-29 12-9 30-10-30-29-12 29-13 10-28Z" fill="currentColor" />
      <circle cx="39" cy="72" r="5" fill="currentColor" />
      <circle cx="181" cy="77" r="5" fill="currentColor" />
      <circle cx="69" cy="22" r="4" fill="currentColor" />
      <circle cx="153" cy="125" r="4" fill="currentColor" />
    </svg>
  );
}

function Confetti({ className = "" }: { className?: string }) {
  const bits = [
    [12, 18, 5, -22], [30, 12, 7, 18], [49, 21, 5, 42], [70, 10, 6, -14],
    [88, 19, 4, 36], [109, 11, 7, 10], [130, 20, 5, -36], [151, 12, 6, 28],
    [171, 20, 4, -8], [193, 11, 7, 40], [211, 19, 5, -30], [26, 43, 4, 55],
    [62, 36, 5, -48], [98, 46, 6, 24], [145, 39, 4, -18], [184, 44, 6, 50],
  ];

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 224 64">
      {bits.map(([x, y, size, rotate], index) => (
        <rect
          key={`${x}-${y}`}
          fill={["#ffe26c", "#fff", "#ff8b37", "#ffcf42"][index % 4]}
          height={size}
          rx="1"
          transform={`rotate(${rotate} ${x} ${y})`}
          width={size * 0.65}
          x={x}
          y={y}
        />
      ))}
      <circle cx="42" cy="54" fill="#fff" r="2.5" />
      <circle cx="162" cy="54" fill="#ffe26c" r="3" />
      <path d="M113 9v9m-5-4.5h10" stroke="#fff" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function StatsIcon({ kind }: { kind: "games" | "best" }) {
  return kind === "games" ? (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M7 11h18v16H7z" fill="#e93632" />
      <path d="M4 11h24v5H4z" fill="#ffca35" />
      <path d="M16 11v16m0-16c-7 0-9-6-5-7 3-1 5 4 5 7Zm0 0c7 0 9-6 5-7-3-1-5 4-5 7Z" fill="none" stroke="#a84b08" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M9 4h14v5c0 7-2 11-7 12-5-1-7-5-7-12V4Z" fill="#ffc62e" stroke="#bd7906" strokeWidth="1.5" />
      <path d="M9 7H5v3c0 4 2 6 6 7m12-10h4v3c0 4-2 6-6 7M16 21v5m-6 2h12" fill="none" stroke="#bd7906" strokeLinecap="round" strokeWidth="2" />
      <path d="m16 7 1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5L16 7Z" fill="#fff5c2" />
    </svg>
  );
}

function PrizeList({
  values,
  remainingValues,
  latestReveal,
}: {
  values: readonly number[];
  remainingValues: Set<number>;
  latestReveal: number | null;
}) {
  return (
    <div className={styles.prizeList} role="list">
      {values.map((value) => {
        const isRemaining = remainingValues.has(value);
        const isLatest = latestReveal === value;

        return (
          <div
            aria-label={`${formatMoney(value)}，${isRemaining ? "仍未揭晓" : "已揭晓"}`}
            className={`${styles.prizeValue} ${isRemaining ? styles.prizeAvailable : styles.prizeGone} ${value === 1_000_000 ? styles.prizeJackpot : ""} ${isLatest ? styles.prizeLatest : ""}`}
            key={value}
            role="listitem"
          >
            <span aria-hidden="true" className={styles.prizeDot} />
            <span>{formatMoney(value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function CaseTile({
  briefcase,
  playerCase,
  canChoose,
  isRevealing,
  onChoose,
  gameFinished,
}: {
  briefcase: Briefcase;
  playerCase: boolean;
  canChoose: boolean;
  isRevealing: boolean;
  onChoose: () => void;
  gameFinished: boolean;
}) {
  const revealed = briefcase.opened || gameFinished;
  const isDisabled = !canChoose || briefcase.opened;
  const label = revealed
    ? `箱子 ${briefcase.id}，${playerCase ? "你的箱子，" : ""}奖金 ${formatMoney(briefcase.amount)}`
    : `箱子 ${briefcase.id}${playerCase ? "，你的幸运箱" : "，未揭晓"}`;

  return (
    <button
      aria-label={label}
      aria-pressed={playerCase}
      className={`${styles.caseTile} ${playerCase ? styles.playerCase : ""} ${revealed ? styles.openedCase : ""} ${isRevealing ? styles.revealingCase : ""} ${revealed ? styles.revealedCase : ""} ${canChoose && !briefcase.opened ? styles.caseAvailable : ""}`}
      disabled={isDisabled}
      onClick={onChoose}
      type="button"
    >
      <BriefcaseArt
        animating={isRevealing}
        number={briefcase.id}
        opened={revealed}
        selected={playerCase}
      />
      <span className={styles.caseNumber}>箱 {String(briefcase.id).padStart(2, "0")}</span>
      {playerCase && <span className={styles.playerTag}>你的幸运箱</span>}
      {revealed && (
        <span className={styles.caseAmount}>{formatMoney(briefcase.amount)}</span>
      )}
    </button>
  );
}

export function DealOrNoDealGame() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [stats, setStats] = useState<GameStats>(DEFAULT_GAME_STATS);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectionRevealCaseId, setSelectionRevealCaseId] = useState<number | null>(null);
  const [animatingCaseId, setAnimatingCaseId] = useState<number | null>(null);
  const [lastOpenedCaseId, setLastOpenedCaseId] = useState<number | null>(null);
  const [lastReveal, setLastReveal] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const statsRef = useRef<GameStats>(DEFAULT_GAME_STATS);
  const audioContextRef = useRef<AudioContext | null>(null);
  const completionSavedRef = useRef(false);
  const revealTimerRef = useRef<number | null>(null);
  const offerPanelRef = useRef<HTMLElement | null>(null);
  const clearRecordsButtonRef = useRef<HTMLButtonElement>(null);
  const cancelClearButtonRef = useRef<HTMLButtonElement>(null);

  function playSound(kind: GameSound) {
    playGameSound(soundEnabled, kind, audioContextRef);
  }

  useEffect(() => {
    const savedStats = readSavedStats();

    statsRef.current = savedStats;
    setStats(savedStats);
    setStatsLoaded(true);
  }, []);

  useEffect(() => {
    if (lastReveal === null) return;

    const timeout = window.setTimeout(() => setLastReveal(null), 4500);

    return () => window.clearTimeout(timeout);
  }, [lastReveal]);

  useEffect(() => {
    if (selectionRevealCaseId === null) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timeout = window.setTimeout(
      () => setSelectionRevealCaseId(null),
      reducedMotion ? 300 : 1750,
    );

    return () => window.clearTimeout(timeout);
  }, [selectionRevealCaseId]);

  useEffect(() => {
    if (game.phase !== "banker-offer") return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    offerPanelRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
    });
  }, [game.phase]);

  useEffect(() => {
    if (!showClearConfirm) return;

    cancelClearButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowClearConfirm(false);
        clearRecordsButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showClearConfirm]);

  useEffect(
    () => () => {
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close().catch(() => undefined);
      }
    },
    [],
  );

  function recordResult(payout: number) {
    if (completionSavedRef.current) return;

    completionSavedRef.current = true;
    const nextStats = {
      gamesPlayed: statsRef.current.gamesPlayed + 1,
      bestPayout: Math.max(statsRef.current.bestPayout, payout),
    };

    statsRef.current = nextStats;
    setStats(nextStats);

    try {
      window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(nextStats));
    } catch {
      // The game remains playable when local storage is unavailable.
    }
  }

  function startNewGame() {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    setGame(createGame());
    setLastOpenedCaseId(null);
    setLastReveal(null);
    setAnimatingCaseId(null);
    completionSavedRef.current = false;
  }

  function chooseBox(caseId: number) {
    if (game.phase === "choose-case") {
      playSound("lock");
      setGame(selectCase(game, caseId));
      setSelectionRevealCaseId(caseId);
      return;
    }

    if (game.phase !== "opening" || animatingCaseId !== null) return;

    const selected = game.cases.find(({ id }) => id === caseId);

    if (!selected || selected.opened || selected.id === game.playerCaseId) return;

    playSound("open");
    setAnimatingCaseId(caseId);
    revealTimerRef.current = window.setTimeout(() => {
      const nextGame = openCase(game, caseId);

      playSound("reveal");
      if (nextGame.phase === "banker-offer") playSound("offer");
      setGame(nextGame);
      setAnimatingCaseId(null);
      setLastOpenedCaseId(caseId);
      setLastReveal(selected.amount);
      revealTimerRef.current = null;
    }, 720);
  }

  function handleAcceptDeal() {
    const nextGame = acceptDeal(game);

    if (nextGame === game) return;

    playSound("deal");
    setGame(nextGame);
    if (nextGame.payout !== null) recordResult(nextGame.payout);
  }

  function handleRejectDeal() {
    playSound("continue");
    setGame(rejectDeal(game));
  }

  function handleFinalChoice(switchCase: boolean) {
    const nextGame = resolveFinalCase(game, switchCase);

    if (nextGame === game) return;

    playSound("final");
    setGame(nextGame);
    if (nextGame.payout !== null) recordResult(nextGame.payout);
  }

  function clearSavedStats() {
    statsRef.current = DEFAULT_GAME_STATS;
    setStats(DEFAULT_GAME_STATS);

    try {
      window.localStorage.removeItem(STATS_STORAGE_KEY);
    } catch {
      // Clearing the in-memory view is still useful when storage is blocked.
    }

    setShowClearConfirm(false);
  }

  const remainingCases =
    game.phase === "finished"
      ? []
      : game.cases.filter(({ opened }) => !opened);
  const remainingValues = new Set(remainingCases.map(({ amount }) => amount));
  const remainingSortedValues = remainingCases
    .map(({ amount }) => amount)
    .sort((first, second) => second - first);
  const currentTopPrize = remainingSortedValues[0] ?? 0;
  const grandPrizeStillAvailable =
    game.phase !== "finished" && remainingValues.has(1_000_000);
  const displayedJackpot =
    game.phase === "finished" ? (game.payout ?? 0) : currentTopPrize;
  const currentRoundNumber = Math.min(game.roundIndex + 1, ROUND_SIZES.length);
  const boxesToOpen =
    game.phase === "opening"
      ? ROUND_SIZES[game.roundIndex] - game.openedThisRound
      : 0;
  const ownCase = game.cases.find(({ id }) => id === game.playerCaseId);
  const otherFinalCase = game.cases.find(
    ({ id, opened }) => id !== game.playerCaseId && !opened,
  );
  const finalCase = game.cases.find(({ id }) => id === game.finalCaseId);
  const latestCase = game.cases.find(({ id }) => id === lastOpenedCaseId);
  const revealDifference =
    game.payout !== null && ownCase ? game.payout - ownCase.amount : 0;

  return (
    <div className={styles.page}>
      <div aria-hidden="true" className={styles.ambientLights}>
        <span />
        <span />
        <span />
      </div>

      <header className={styles.topbar}>
        <a aria-label="返回首页" className={styles.brand} href="/">
          <span className={styles.brandMark}>
            <svg aria-hidden="true" viewBox="0 0 34 34">
              <path d="m17 2 4.1 9.3 10.1 1-7.6 6.6 2.2 9.9L17 23.6l-8.8 5.2 2.2-9.9-7.6-6.6 10.1-1L17 2Z" fill="currentColor" />
              <circle cx="17" cy="16" fill="#c70d1b" r="4" />
            </svg>
          </span>
          <span>好运开箱局</span>
        </a>
        <div className={styles.topbarActions}>
          <span className={styles.virtualBadge}>纯虚拟奖金 · 仅供娱乐</span>
          <button
            aria-label={`${soundEnabled ? "关闭" : "开启"}音效`}
            aria-pressed={soundEnabled}
            className={styles.soundToggle}
            onClick={() => setSoundEnabled((enabled) => !enabled)}
            title={`${soundEnabled ? "关闭" : "开启"}音效`}
            type="button"
          >
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <path d="M4 10v4h4l5 4V6l-5 4H4Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
              {soundEnabled ? (
                <path d="M16 9a5 5 0 0 1 0 6m2-8a8 8 0 0 1 0 10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
              ) : (
                <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
              )}
            </svg>
            音效{soundEnabled ? "开" : "关"}
          </button>
          <button
            className={styles.clearRecordsButton}
            onClick={() => setShowClearConfirm(true)}
            ref={clearRecordsButtonRef}
            type="button"
          >
            清除本机记录
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.heroOrnament}>
          <SparkleBurst className={styles.heroSparkleOne} />
          <SparkleBurst className={styles.heroSparkleTwo} />
          <span className={styles.heroCoin}>¥</span>
        </div>
        <div className={styles.heroCopy}>
          <div className={styles.heroRibbon}>
            <span className={styles.ribbonStar}>✦</span>
            好运开箱 · 惊喜揭晓
            <span className={styles.ribbonStar}>✦</span>
          </div>
          <h1>
            {game.phase === "finished" ? (
              <>本局收获<span>已揭晓！</span></>
            ) : grandPrizeStillAvailable ? (
              <>百万大奖<span>等你拆！</span></>
            ) : (
              <>大奖已开出<span>惊喜继续！</span></>
            )}
          </h1>
          <p>26 只幸运箱，九轮银行报价，每一次揭晓都让悬念再升级</p>
          <div className={styles.heroFootnote}>
            <span>✦</span> 起始最高奖 <strong>¥1,000,000</strong>
            <span className={styles.footnoteDivider}>·</span>
            奖金为虚拟金额
          </div>
        </div>

        <div className={styles.jackpotShowcase}>
          <div className={styles.jackpotHalo} />
          <div className={styles.jackpotTag}>
            {game.phase === "finished"
              ? "本局最终收获"
              : grandPrizeStillAvailable
                ? "本局百万大奖"
                : "当前未揭晓最高奖"}
          </div>
          <div className={styles.jackpotAmount}>{formatMoney(displayedJackpot)}</div>
          <div className={styles.jackpotSubline}>
            <span className={styles.jackpotSpark}>✦</span>
            {game.phase === "finished"
              ? "再开一局，继续冲大奖"
              : grandPrizeStillAvailable
                ? "百万大奖仍在箱中"
                : "百万大奖已揭晓，奖池仍有惊喜"}
            <span className={styles.jackpotSpark}>✦</span>
          </div>
          <div aria-hidden="true" className={styles.jackpotStars}>
            <span>✦</span><span>✧</span><span>✦</span><span>✧</span>
          </div>
        </div>
        <div aria-hidden="true" className={styles.heroBottomWave} />
      </section>

      <section aria-label="本机游戏记录" className={styles.statsStrip}>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>
            <StatsIcon kind="games" />
          </span>
          <span className={styles.statLabel}>已完成局数</span>
          <strong>{statsLoaded ? stats.gamesPlayed : "—"}</strong>
        </div>
        <span aria-hidden="true" className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statIcon}>
            <StatsIcon kind="best" />
          </span>
          <span className={styles.statLabel}>本机最高奖金</span>
          <strong>{statsLoaded ? formatMoney(stats.bestPayout) : "—"}</strong>
        </div>
        <div className={styles.statsNote}>记录仅保存在这台设备</div>
      </section>

      <section aria-label="游戏进度" className={styles.progressStrip}>
        <div className={styles.progressItem}>
          <span className={styles.progressLabel}>当前环节</span>
          <strong>
            {game.phase === "choose-case"
              ? "挑选你的幸运箱"
              : game.phase === "finished"
                ? "本局已揭晓"
                : game.phase === "final-choice"
                  ? "最后抉择"
                  : `第 ${currentRoundNumber} / ${ROUND_SIZES.length} 轮`}
          </strong>
        </div>
        <div className={styles.progressMeter}>
          <span className={styles.progressLabel}>奖池状态</span>
          <div
            aria-label={`还有 ${remainingCases.length} 个箱子未揭晓`}
            className={styles.meterTrack}
            role="img"
          >
            <span style={{ width: `${(remainingCases.length / 26) * 100}%` }} />
          </div>
          <strong>{remainingCases.length} / 26 箱未揭晓</strong>
        </div>
        <div
          aria-live="polite"
          className={`${styles.jackpotStatus} ${grandPrizeStillAvailable ? styles.jackpotWaiting : styles.jackpotRevealed}`}
        >
          <span aria-hidden="true" className={styles.statusPulse} />
          <span>
            {game.phase === "finished"
              ? "本局最终收获"
              : grandPrizeStillAvailable
                ? "百万大奖仍在箱中"
                : "本局最高未揭晓奖"}
          </span>
          <strong>{formatMoney(displayedJackpot)}</strong>
        </div>
      </section>

      <div className={styles.gameLayout}>
        <section aria-labelledby="case-board-title" className={styles.playPanel}>
          <div className={styles.playPanelHeader}>
            <div>
              <div className={styles.sectionEyebrow}>LUCKY CASES · 01—26</div>
              <h2 id="case-board-title">幸运箱阵列</h2>
              <p aria-live="polite" className={styles.instruction}>
                {game.phase === "choose-case"
                  ? "先选一只箱子，作为你整局的幸运箱。"
                  : game.phase === "opening"
                    ? `本轮还要揭晓 ${boxesToOpen} 个箱子，点开一只继续冲！`
                    : game.phase === "banker-offer"
                      ? "银行家正在等你的决定，请选择成交或继续。"
                      : game.phase === "final-choice"
                        ? "最后两个箱子！决定留在原箱，还是大胆换一个。"
                        : "本局奖金已揭晓，准备好再来一局了吗？"}
              </p>
            </div>
            {game.phase === "finished" && (
              <button
                className={styles.newGameButton}
                onClick={startNewGame}
                type="button"
              >
                <span aria-hidden="true">↻</span> 再开一局
              </button>
            )}
          </div>

          <div
            className={`${styles.lastReveal} ${lastReveal !== null ? styles.lastRevealActive : ""}`}
            aria-live="polite"
          >
            {lastReveal !== null && latestCase && (
              <>
                <span className={styles.revealIcon} aria-hidden="true">✦</span>
                <span>箱 {String(latestCase.id).padStart(2, "0")} 揭晓</span>
                <strong>{formatMoney(lastReveal)}</strong>
                <span className={styles.revealCaption}>这个金额已从奖池移除</span>
              </>
            )}
          </div>

          {game.phase === "banker-offer" && game.currentOffer !== null && (
            <section aria-label="银行家报价" className={styles.offerPanel} ref={offerPanelRef}>
              <div aria-hidden="true" className={styles.phoneBadge}>
                <svg fill="none" viewBox="0 0 44 44">
                  <path d="M13 5c-2 0-4 2-4 4 0 14 12 26 26 26 2 0 4-2 4-4v-5l-9-3-4 5c-5-2-9-6-11-11l5-4-3-8h-4Z" fill="currentColor" />
                  <path d="M27 7c5 1 9 5 10 10M28 13c2 0 4 2 4 4" stroke="#fff5d6" strokeLinecap="round" strokeWidth="2.6" />
                </svg>
              </div>
              <div className={styles.offerCopy}>
                <span className={styles.offerEyebrow}>銀行家來電 · 第 {currentRoundNumber} 次報價</span>
                <h3>他想買下你的箱子！</h3>
                <span className={styles.offerHint}>这轮箱子已全部揭晓，选择成交或继续后才能推进游戏。</span>
              </div>
              <div className={styles.offerAmount}>
                <span>现在成交，可拿</span>
                <strong>{formatMoney(game.currentOffer)}</strong>
              </div>
              <div className={styles.offerActions}>
                <button className={styles.dealButton} onClick={handleAcceptDeal} type="button">
                  <span aria-hidden="true">✦</span> 成交，拿下报价
                </button>
                <button className={styles.noDealButton} onClick={handleRejectDeal} type="button">
                  不卖，继续冲 <span aria-hidden="true">→</span>
                </button>
              </div>
            </section>
          )}

          <div className={styles.caseGrid}>
            {game.cases.map((briefcase) => {
              const isPlayerCase = briefcase.id === game.playerCaseId;
              const canChoose =
                game.phase === "choose-case" ||
                (game.phase === "opening" && !isPlayerCase);

              return (
                <CaseTile
                  briefcase={briefcase}
                  canChoose={canChoose && animatingCaseId === null}
                  gameFinished={game.phase === "finished"}
                  isRevealing={briefcase.id === animatingCaseId}
                  key={briefcase.id}
                  onChoose={() => chooseBox(briefcase.id)}
                  playerCase={isPlayerCase}
                />
              );
            })}
          </div>

          {game.phase === "final-choice" && otherFinalCase && ownCase && (
            <section aria-label="最后箱子选择" className={styles.finalPanel}>
              <Confetti className={styles.choiceConfetti} />
              <span className={styles.finalEyebrow}>最后两个箱子 · 最后一搏</span>
              <h3>大奖会在你的箱子里吗？</h3>
              <p>最后一次机会，选择保留原箱或换成另一只。</p>
              <div className={styles.finalActions}>
                <button className={styles.keepButton} onClick={() => handleFinalChoice(false)} type="button">
                  <span>留在原箱</span>
                  <strong>箱 {String(ownCase.id).padStart(2, "0")}</strong>
                </button>
                <button className={styles.switchButton} onClick={() => handleFinalChoice(true)} type="button">
                  <span>换一个！</span>
                  <strong>箱 {String(otherFinalCase.id).padStart(2, "0")} <b aria-hidden="true">↗</b></strong>
                </button>
              </div>
            </section>
          )}

          {game.phase === "finished" && game.payout !== null && (
            <section aria-label="本局结算" className={styles.resultPanel}>
              <Confetti className={styles.resultConfetti} />
              <div className={styles.resultMedal} aria-hidden="true">
                <svg viewBox="0 0 72 72">
                  <path d="m18 5 18 16L54 5l-4 25H22L18 5Z" fill="#ff6a39" />
                  <circle cx="36" cy="43" fill="#ffc530" r="22" stroke="#fff0a4" strokeWidth="4" />
                  <path d="m36 28 4.5 9.2 10.2 1.5-7.4 7.2 1.8 10.1L36 51l-9.1 4.8 1.8-10.1-7.4-7.2 10.2-1.5L36 28Z" fill="#fff7d7" />
                </svg>
              </div>
              <span className={styles.resultEyebrow}>
                {game.outcome === "deal" ? "成交成功 · 奖金到手" : "最终揭晓 · 幸运属于你"}
              </span>
              <h3>本局收获</h3>
              <strong className={styles.resultAmount}>{formatMoney(game.payout)}</strong>
              <p className={styles.resultComparison}>
                {game.outcome === "deal" && ownCase
                  ? revealDifference > 0
                    ? `这笔交易比原箱多拿 ${formatMoney(revealDifference)}`
                    : revealDifference < 0
                      ? `坚持开箱本可多拿 ${formatMoney(Math.abs(revealDifference))}`
                      : "成交报价刚好等于你原箱的奖金"
                  : finalCase && ownCase && finalCase.id !== ownCase.id
                    ? `你换到了箱 ${String(finalCase.id).padStart(2, "0")}，原箱里是 ${formatMoney(ownCase.amount)}`
                    : "你坚持留在原箱，奖金已揭晓"}
              </p>
              <button className={styles.playAgainButton} onClick={startNewGame} type="button">
                <span aria-hidden="true">✦</span> 再开一局，继续冲大奖
              </button>
            </section>
          )}
        </section>

        <aside aria-label="奖金列表" className={styles.prizePanel}>
          <div className={styles.prizePanelTop}>
            <div className={styles.prizePanelIcon} aria-hidden="true">
              <svg viewBox="0 0 44 44">
                <path d="M7 9h30v6c0 7-5 12-12 13v5h8v5H11v-5h8v-5C12 27 7 22 7 15V9Z" fill="currentColor" />
                <path d="M8 13H4v3c0 5 3 8 8 9m24-12h4v3c0 5-3 8-8 9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
                <path d="m22 11 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L22 11Z" fill="#fff" />
              </svg>
            </div>
            <div>
              <span className={styles.prizePanelEyebrow}>THE PRIZE BOARD</span>
              <h2>26 档奖金</h2>
            </div>
          </div>
          <div className={styles.remainingSummary}>
            <span>
              {game.phase === "finished" ? (
                "本局已结束"
              ) : (
                <>还剩 <strong>{remainingCases.length}</strong> 个箱子</>
              )}
            </span>
            <span>
              {game.phase === "finished" ? (
                <>收获 <strong>{formatMoney(displayedJackpot)}</strong></>
              ) : (
                <>最高 <strong>{formatMoney(currentTopPrize)}</strong></>
              )}
            </span>
          </div>
          <div className={styles.prizeGroups}>
            <section>
              <h3><span className={styles.lowPrizeMark} />小奖区</h3>
              <PrizeList
                latestReveal={lastReveal}
                remainingValues={remainingValues}
                values={PRIZE_VALUES.slice(0, 13)}
              />
            </section>
            <section>
              <h3><span className={styles.highPrizeMark} />大奖区</h3>
              <PrizeList
                latestReveal={lastReveal}
                remainingValues={remainingValues}
                values={PRIZE_VALUES.slice(13)}
              />
            </section>
          </div>
          <div className={`${styles.jackpotReminder} ${grandPrizeStillAvailable ? "" : styles.jackpotReminderGone}`}>
            <SparkleBurst className={styles.reminderSparkle} />
            <span className={styles.reminderLabel}>
            {game.phase === "finished"
              ? "本局最终收获"
              : grandPrizeStillAvailable
                ? "百万大奖 · 仍在箱中"
                : "百万大奖 · 已揭晓"}
          </span>
            <strong>{formatMoney(displayedJackpot)}</strong>
            <span className={styles.reminderCaption}>
              {game.phase === "finished"
                ? "本局已结算，以上为最终奖金"
                : grandPrizeStillAvailable
                ? "奖池信息实时更新，每个箱子都是随机分配"
                : "当前未揭晓金额中的最高奖"}
            </span>
          </div>
          <div className={styles.prizeDisclaimer}>
            <span aria-hidden="true">ⓘ</span>
            奖金为虚拟金额，仅供娱乐
          </div>
        </aside>
      </div>

      <footer className={styles.footerNote}>
        <span aria-hidden="true">✦</span>
        祝你好运，享受每一次揭晓的惊喜
        <span aria-hidden="true">✦</span>
      </footer>

      {showClearConfirm && (
        <div className={styles.modalBackdrop}>
          <section
            aria-labelledby="clear-title"
            aria-describedby="clear-description"
            aria-modal="true"
            className={styles.confirmDialog}
            role="dialog"
          >
            <span className={styles.confirmIcon} aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <path d="m19 4 9 9-3 3-9-9 3-3ZM16 9l7 7-12 12H4v-7L16 9Z" fill="#d99b2b" stroke="#9c5b12" strokeLinejoin="round" strokeWidth="1.5" />
                <path d="m6 23 3 3m1-6 4 4m0-8 4 4" stroke="#fff2c7" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            </span>
            <h2 id="clear-title">清除本机记录？</h2>
            <p id="clear-description">已完成局数和本机最高奖金都会被清零，当前正在进行的游戏不受影响。</p>
            <div className={styles.confirmActions}>
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  clearRecordsButtonRef.current?.focus();
                }}
                ref={cancelClearButtonRef}
                type="button"
              >
                再想想
              </button>
              <button
                onClick={() => {
                  clearSavedStats();
                  clearRecordsButtonRef.current?.focus();
                }}
                type="button"
              >
                确认清除
              </button>
            </div>
          </section>
        </div>
      )}

      {selectionRevealCaseId !== null &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="assertive"
            aria-label={`箱 ${String(selectionRevealCaseId).padStart(2, "0")} 已锁定，游戏即将开始`}
            className={styles.selectionOverlay}
            role="status"
          >
            <div aria-hidden="true" className={styles.selectionStageLights}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.selectionStage}>
              <SparkleBurst className={styles.selectionBurst} />
              <span className={styles.selectionEyebrow}>LUCKY CASE · LOCKED</span>
              <h2>你的幸运箱</h2>
              <div className={styles.selectionCaseShell}>
                <div aria-hidden="true" className={styles.selectionCaseHalo} />
                <BriefcaseArt
                  animating={false}
                  className={styles.selectionCaseArt}
                  number={selectionRevealCaseId}
                  opened={false}
                  selected
                />
              </div>
              <strong className={styles.selectionCaseNumber}>
                箱 {String(selectionRevealCaseId).padStart(2, "0")}
              </strong>
              <p>已为你锁定，大奖悬念即将揭晓</p>
              <div className={styles.selectionLoading}>
                <span />
              </div>
              <span className={styles.selectionLoadingLabel}>幸运开箱马上开始</span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

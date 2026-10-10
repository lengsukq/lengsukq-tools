export const PRIZE_VALUES = [
  0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750, 1_000, 5_000,
  10_000, 25_000, 50_000, 75_000, 100_000, 200_000, 300_000, 400_000, 500_000,
  750_000, 1_000_000,
] as const;

export const ROUND_SIZES = [6, 5, 4, 3, 2, 1, 1, 1, 1] as const;

export const BANKER_MULTIPLIERS = [
  0.45, 0.55, 0.65, 0.75, 0.82, 0.88, 0.94, 0.98, 1,
] as const;

export type GamePhase =
  | "choose-case"
  | "opening"
  | "banker-offer"
  | "final-choice"
  | "finished";

export type GameOutcome = "deal" | "case";

export interface Briefcase {
  id: number;
  amount: number;
  opened: boolean;
}

export interface GameState {
  cases: Briefcase[];
  phase: GamePhase;
  playerCaseId: number | null;
  roundIndex: number;
  openedThisRound: number;
  currentOffer: number | null;
  payout: number | null;
  outcome: GameOutcome | null;
  finalCaseId: number | null;
}

export interface GameStats {
  gamesPlayed: number;
  bestPayout: number;
}

export const DEFAULT_GAME_STATS: GameStats = {
  gamesPlayed: 0,
  bestPayout: 0,
};

export function createGame(random: () => number = Math.random): GameState {
  const shuffledValues = [...PRIZE_VALUES];

  for (let index = shuffledValues.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));

    [shuffledValues[index], shuffledValues[swapIndex]] = [
      shuffledValues[swapIndex],
      shuffledValues[index],
    ];
  }

  return {
    cases: shuffledValues.map((amount, index) => ({
      id: index + 1,
      amount,
      opened: false,
    })),
    phase: "choose-case",
    playerCaseId: null,
    roundIndex: 0,
    openedThisRound: 0,
    currentOffer: null,
    payout: null,
    outcome: null,
    finalCaseId: null,
  };
}

export function selectCase(state: GameState, caseId: number): GameState {
  if (state.phase !== "choose-case" || !state.cases.some(({ id }) => id === caseId)) {
    return state;
  }

  return {
    ...state,
    phase: "opening",
    playerCaseId: caseId,
  };
}

export function getBankerOffer(state: GameState): number {
  const remainingCases = state.cases.filter(({ opened }) => !opened);
  const average =
    remainingCases.reduce((total, currentCase) => total + currentCase.amount, 0) /
    remainingCases.length;
  const multiplier = BANKER_MULTIPLIERS[state.roundIndex] ?? 1;

  return Math.round(average * multiplier * 100) / 100;
}

export function openCase(state: GameState, caseId: number): GameState {
  if (state.phase !== "opening" || caseId === state.playerCaseId) return state;

  const targetCase = state.cases.find(({ id }) => id === caseId);

  if (!targetCase || targetCase.opened) return state;

  const cases = state.cases.map((currentCase) =>
    currentCase.id === caseId ? { ...currentCase, opened: true } : currentCase,
  );
  const openedThisRound = state.openedThisRound + 1;

  if (openedThisRound >= ROUND_SIZES[state.roundIndex]) {
    const nextState: GameState = {
      ...state,
      cases,
      phase: "banker-offer",
      openedThisRound,
    };

    return { ...nextState, currentOffer: getBankerOffer(nextState) };
  }

  return { ...state, cases, openedThisRound };
}

export function acceptDeal(state: GameState): GameState {
  if (state.phase !== "banker-offer" || state.currentOffer === null) return state;

  return {
    ...state,
    phase: "finished",
    payout: state.currentOffer,
    outcome: "deal",
    finalCaseId: state.playerCaseId,
  };
}

export function rejectDeal(state: GameState): GameState {
  if (state.phase !== "banker-offer") return state;

  if (state.roundIndex === ROUND_SIZES.length - 1) {
    return { ...state, phase: "final-choice", currentOffer: null };
  }

  return {
    ...state,
    phase: "opening",
    roundIndex: state.roundIndex + 1,
    openedThisRound: 0,
    currentOffer: null,
  };
}

export function resolveFinalCase(
  state: GameState,
  switchCase: boolean,
): GameState {
  if (state.phase !== "final-choice" || state.playerCaseId === null) return state;

  const otherFinalCase = state.cases.find(
    ({ id, opened }) => id !== state.playerCaseId && !opened,
  );

  if (!otherFinalCase) return state;

  const finalCaseId = switchCase ? otherFinalCase.id : state.playerCaseId;
  const finalCase = state.cases.find(({ id }) => id === finalCaseId);

  if (!finalCase) return state;

  return {
    ...state,
    phase: "finished",
    payout: finalCase.amount,
    outcome: "case",
    finalCaseId,
  };
}

export function sanitizeGameStats(value: unknown): GameStats {
  if (!value || typeof value !== "object") return DEFAULT_GAME_STATS;

  const candidate = value as Partial<GameStats>;
  const gamesPlayed = Number(candidate.gamesPlayed);
  const bestPayout = Number(candidate.bestPayout);

  return {
    gamesPlayed:
      Number.isFinite(gamesPlayed) && gamesPlayed >= 0
        ? Math.floor(gamesPlayed)
        : 0,
    bestPayout:
      Number.isFinite(bestPayout) && bestPayout >= 0 ? bestPayout : 0,
  };
}

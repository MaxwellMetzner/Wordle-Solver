export type TileState = "gray" | "yellow" | "green";

export type StrategyMode =
  | "balanced"
  | "solve"
  | "information"
  | "hardMode"
  | "minimax";

export type RecommendationCategory =
  | "solve"
  | "information"
  | "balanced"
  | "hardMode"
  | "minimax";

export type GuessResult = {
  word: string;
  pattern: TileState[];
  candidatesBefore: number;
  candidatesAfter: number;
  bitsGained: number;
  expectedBitsForGuess: number;
  expectedRemainingForGuess: number;
  optimalBitsAvailable: number;
  bestAvailableWord: string;
  efficiency: number;
};

export type GuessHistoryEntry = Pick<GuessResult, "word" | "pattern">;

export type GuessScore = {
  word: string;
  expectedRemaining: number;
  expectedBits: number;
  solveProbability: number;
  worstCaseRemaining: number;
  isPossibleAnswer: boolean;
  isHardModeLegal: boolean;
};

export type Recommendation = GuessScore & {
  category: RecommendationCategory;
  rank: number;
  explanation: string;
};

export type ScoreSummary = {
  candidateCount: number;
  bestExpectedBits: number;
  bestInformationWord: string;
  hardLegalCount: number;
  allowedGuessCount: number;
};

export type ScoreResult = {
  requestId: number;
  signature: string;
  recommendations: Recommendation[];
  summary: ScoreSummary;
};

export type SolverWorkerRequest = {
  type: "score";
  requestId: number;
  signature: string;
  candidateIndexes: number[];
  history: GuessHistoryEntry[];
  topN: number;
};

export type SolverWorkerProgress = {
  type: "progress";
  requestId: number;
  phase: "preparing" | "scoring";
  progress: number;
};

export type SolverWorkerResponse =
  | SolverWorkerProgress
  | {
      type: "scoreResult";
      result: ScoreResult;
    }
  | {
      type: "error";
      requestId: number;
      message: string;
    };

export type PersistedGame = {
  guesses: GuessResult[];
  settings: {
    strategy: StrategyMode;
    spoilerSafe: boolean;
    highContrast: boolean;
  };
};

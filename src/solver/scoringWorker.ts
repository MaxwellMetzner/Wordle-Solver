/// <reference lib="webworker" />

import { patternToIndex } from "./feedback";
import type {
  GuessHistoryEntry,
  GuessScore,
  Recommendation,
  RecommendationCategory,
  SolverWorkerRequest,
  SolverWorkerResponse,
} from "./types";
import { ALLOWED_GUESSES, ANSWER_INDEX_BY_WORD, SOLUTION_WORDS } from "./wordLists";

const PATTERN_COUNT = 243;
const TOP_N_DEFAULT = 2;
const POWERS_OF_THREE = [1, 3, 9, 27, 81] as const;
const LETTER_COUNTS = new Int8Array(26);

type HistoryRule = {
  guessCodes: Uint8Array;
  patternIndex: number;
};

function encodeWord(word: string) {
  const codes = new Uint8Array(5);
  for (let index = 0; index < 5; index += 1) {
    codes[index] = word.charCodeAt(index) - 97;
  }
  return codes;
}

const ALLOWED_CODES = ALLOWED_GUESSES.map(encodeWord);
const ANSWER_CODES = SOLUTION_WORDS.map(encodeWord);

function log2(value: number): number {
  return Math.log(value) / Math.log(2);
}

function post(response: SolverWorkerResponse) {
  self.postMessage(response);
}

function sleep() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function fastPatternIndex(guessCodes: Uint8Array, answerCodes: Uint8Array): number {
  let pattern = 0;
  let greenMask = 0;

  for (let index = 0; index < 5; index += 1) {
    if (guessCodes[index] === answerCodes[index]) {
      pattern += 2 * POWERS_OF_THREE[index];
      greenMask |= 1 << index;
    } else {
      LETTER_COUNTS[answerCodes[index]] += 1;
    }
  }

  for (let index = 0; index < 5; index += 1) {
    if ((greenMask & (1 << index)) !== 0) continue;
    const letter = guessCodes[index];
    if (LETTER_COUNTS[letter] > 0) {
      pattern += POWERS_OF_THREE[index];
      LETTER_COUNTS[letter] -= 1;
    }
  }

  for (let index = 0; index < 5; index += 1) {
    if ((greenMask & (1 << index)) === 0) {
      LETTER_COUNTS[answerCodes[index]] = 0;
    }
  }

  return pattern;
}

function buildHistoryRules(history: GuessHistoryEntry[]): HistoryRule[] {
  return history.map((entry) => ({
    guessCodes: encodeWord(entry.word),
    patternIndex: patternToIndex(entry.pattern),
  }));
}

function isHardModeLegalFromHistory(
  wordCodes: Uint8Array,
  historyRules: HistoryRule[],
): boolean {
  return historyRules.every(
    (entry) => fastPatternIndex(entry.guessCodes, wordCodes) === entry.patternIndex,
  );
}

function scoreGuessFromCodes(
  word: string,
  guessCodes: Uint8Array,
  candidateIndexes: number[],
  candidateMembership: Uint8Array,
  historyRules: HistoryRule[],
): GuessScore {
  const buckets = new Uint16Array(PATTERN_COUNT);
  const usedBuckets: number[] = [];
  const candidateCount = Math.max(1, candidateIndexes.length);

  for (const answerIndex of candidateIndexes) {
    const pattern = fastPatternIndex(guessCodes, ANSWER_CODES[answerIndex]);
    if (buckets[pattern] === 0) usedBuckets.push(pattern);
    buckets[pattern] += 1;
  }

  let expectedRemaining = 0;
  let expectedLogRemaining = 0;
  let worstCaseRemaining = 0;

  for (const bucket of usedBuckets) {
    const count = buckets[bucket];
    expectedRemaining += (count * count) / candidateCount;
    expectedLogRemaining += (count * log2(count)) / candidateCount;
    if (count > worstCaseRemaining) worstCaseRemaining = count;
  }

  const answerIndex = ANSWER_INDEX_BY_WORD.get(word);
  const isPossibleAnswer =
    answerIndex !== undefined && candidateMembership[answerIndex] === 1;

  return {
    word,
    expectedRemaining,
    expectedBits: Math.max(0, log2(candidateCount) - expectedLogRemaining),
    solveProbability: isPossibleAnswer ? 1 / candidateCount : 0,
    worstCaseRemaining,
    isPossibleAnswer,
    isHardModeLegal: isHardModeLegalFromHistory(guessCodes, historyRules),
  };
}

function balancedValue(score: GuessScore, candidateCount: number): number {
  const solveBoost = score.solveProbability * log2(Math.max(2, candidateCount));
  const riskPenalty = score.worstCaseRemaining / Math.max(1, candidateCount);
  return score.expectedBits + solveBoost * 0.7 - riskPenalty * 0.2;
}

function explanationFor(score: GuessScore, category: RecommendationCategory) {
  if (category === "solve") {
    return "Possible answer with the strongest expected split.";
  }
  if (category === "information") {
    return "Splits remaining answers into small feedback buckets.";
  }
  if (category === "hardMode") {
    return "Legal with all known green and yellow constraints.";
  }
  if (category === "minimax") {
    return "Keeps the worst feedback bucket as small as possible.";
  }
  if (score.isPossibleAnswer) {
    return "Balances a solve chance with strong information gain.";
  }
  return "Balances exploration value with downside risk.";
}

function toRecommendations(
  scores: GuessScore[],
  category: RecommendationCategory,
  topN: number,
): Recommendation[] {
  return scores.slice(0, topN).map((score, index) => ({
    ...score,
    category,
    rank: index + 1,
    explanation: explanationFor(score, category),
  }));
}

async function scoreRequest(request: SolverWorkerRequest) {
  post({
    type: "progress",
    requestId: request.requestId,
    phase: "scoring",
    progress: 0,
  });

  const candidateMembership = new Uint8Array(SOLUTION_WORDS.length);
  for (const index of request.candidateIndexes) {
    candidateMembership[index] = 1;
  }

  const historyRules = buildHistoryRules(request.history);
  const scores: GuessScore[] = [];
  const chunkSize = request.candidateIndexes.length > 800 ? 260 : 900;

  for (let index = 0; index < ALLOWED_GUESSES.length; index += 1) {
    scores.push(
      scoreGuessFromCodes(
        ALLOWED_GUESSES[index],
        ALLOWED_CODES[index],
        request.candidateIndexes,
        candidateMembership,
        historyRules,
      ),
    );

    if (index % chunkSize === 0) {
      post({
        type: "progress",
        requestId: request.requestId,
        phase: "scoring",
        progress: index / ALLOWED_GUESSES.length,
      });
      await sleep();
    }
  }

  const candidateCount = request.candidateIndexes.length;
  const topN = request.topN || TOP_N_DEFAULT;

  const byInformation = [...scores].sort(
    (a, b) =>
      b.expectedBits - a.expectedBits ||
      a.worstCaseRemaining - b.worstCaseRemaining ||
      a.expectedRemaining - b.expectedRemaining,
  );
  const bySolve = scores
    .filter((score) => score.isPossibleAnswer)
    .sort(
      (a, b) =>
        b.solveProbability - a.solveProbability ||
        b.expectedBits - a.expectedBits ||
        a.worstCaseRemaining - b.worstCaseRemaining,
    );
  const byHardMode = scores
    .filter((score) => score.isHardModeLegal)
    .sort(
      (a, b) =>
        b.expectedBits - a.expectedBits ||
        a.worstCaseRemaining - b.worstCaseRemaining,
    );
  const byBalanced = [...scores].sort(
    (a, b) =>
      balancedValue(b, candidateCount) - balancedValue(a, candidateCount) ||
      b.expectedBits - a.expectedBits,
  );
  const byMinimax = [...scores].sort(
    (a, b) =>
      a.worstCaseRemaining - b.worstCaseRemaining ||
      b.expectedBits - a.expectedBits ||
      a.expectedRemaining - b.expectedRemaining,
  );
  const scoresByWord = new Map(scores.map((score) => [score.word, score]));
  const candidateOptions =
    candidateCount <= 5
      ? request.candidateIndexes
          .map((index) => scoresByWord.get(SOLUTION_WORDS[index]))
          .filter((score): score is GuessScore => Boolean(score))
      : [];

  const recommendations = [
    ...toRecommendations(bySolve, "solve", topN),
    ...toRecommendations(byInformation, "information", topN),
    ...toRecommendations(byHardMode, "hardMode", topN),
    ...toRecommendations(byBalanced, "balanced", topN),
    ...toRecommendations(byMinimax, "minimax", topN),
  ];

  post({
    type: "scoreResult",
    result: {
      requestId: request.requestId,
      signature: request.signature,
      recommendations,
      candidateOptions,
      summary: {
        candidateCount,
        bestExpectedBits: byInformation[0]?.expectedBits ?? 0,
        bestInformationWord: byInformation[0]?.word ?? "",
        hardLegalCount: byHardMode.length,
        allowedGuessCount: ALLOWED_GUESSES.length,
      },
    },
  });
}

self.onmessage = (event: MessageEvent<SolverWorkerRequest>) => {
  const request = event.data;
  if (request.type !== "score") return;

  scoreRequest(request).catch((error: unknown) => {
    post({
      type: "error",
      requestId: request.requestId,
      message: error instanceof Error ? error.message : "Unknown worker error.",
    });
  });
};

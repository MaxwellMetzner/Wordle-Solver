import { evaluatePatternIndex, patternToIndex } from "./feedback";
import { ALLOWED_SET, ANSWER_SET } from "./wordLists";
import type { GuessHistoryEntry, GuessScore, TileState } from "./types";

const PATTERN_COUNT = 243;

export function log2(value: number): number {
  return Math.log(value) / Math.log(2);
}

export function filterCandidatesByPattern(
  candidates: string[],
  guess: string,
  pattern: TileState[],
): string[] {
  const targetPattern = patternToIndex(pattern);
  return candidates.filter(
    (candidate) => evaluatePatternIndex(guess, candidate) === targetPattern,
  );
}

export function replayCandidates(
  allAnswers: string[],
  guesses: GuessHistoryEntry[],
): string[] {
  return guesses.reduce(
    (candidates, guess) =>
      filterCandidatesByPattern(candidates, guess.word, guess.pattern),
    allAnswers,
  );
}

export function isHardModeLegal(word: string, history: GuessHistoryEntry[]): boolean {
  return history.every(
    (entry) =>
      evaluatePatternIndex(entry.word, word) === patternToIndex(entry.pattern),
  );
}

export function scoreSingleGuess(
  word: string,
  candidates: string[],
  history: GuessHistoryEntry[],
): GuessScore {
  const buckets = new Uint16Array(PATTERN_COUNT);
  const usedBuckets: number[] = [];
  const candidateCount = Math.max(1, candidates.length);

  for (const candidate of candidates) {
    const pattern = evaluatePatternIndex(word, candidate);
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
    worstCaseRemaining = Math.max(worstCaseRemaining, count);
  }

  const isPossibleAnswer = ANSWER_SET.has(word) && candidates.includes(word);
  const expectedBits = Math.max(0, log2(candidateCount) - expectedLogRemaining);

  return {
    word,
    expectedRemaining,
    expectedBits,
    solveProbability: isPossibleAnswer ? 1 / candidateCount : 0,
    worstCaseRemaining,
    isPossibleAnswer,
    isHardModeLegal: ALLOWED_SET.has(word) && isHardModeLegal(word, history),
  };
}

export function getKeyboardLetterStates(history: GuessHistoryEntry[]) {
  const letterStates = new Map<string, TileState>();
  const strength: Record<TileState, number> = {
    gray: 1,
    yellow: 2,
    green: 3,
  };

  for (const entry of history) {
    entry.word.split("").forEach((letter, index) => {
      const state = entry.pattern[index];
      const current = letterStates.get(letter);
      if (!current || strength[state] > strength[current]) {
        letterStates.set(letter, state);
      }
    });
  }

  return letterStates;
}

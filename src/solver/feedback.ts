import type { TileState } from "./types";

const POWERS_OF_THREE = [1, 3, 9, 27, 81] as const;
const STATE_TO_DIGIT: Record<TileState, number> = {
  gray: 0,
  yellow: 1,
  green: 2,
};
const DIGIT_TO_STATE: TileState[] = ["gray", "yellow", "green"];

export const EMPTY_PATTERN: TileState[] = [
  "gray",
  "gray",
  "gray",
  "gray",
  "gray",
];

export function cycleTileState(state: TileState): TileState {
  if (state === "gray") return "yellow";
  if (state === "yellow") return "green";
  return "gray";
}

export function patternToIndex(pattern: TileState[]): number {
  return pattern.reduce(
    (total, state, index) => total + STATE_TO_DIGIT[state] * POWERS_OF_THREE[index],
    0,
  );
}

export function indexToPattern(index: number): TileState[] {
  return POWERS_OF_THREE.map((power) => {
    const digit = Math.floor(index / power) % 3;
    return DIGIT_TO_STATE[digit];
  });
}

export function patternToKey(pattern: TileState[]): string {
  return pattern.map((state) => STATE_TO_DIGIT[state]).join("");
}

export function keyToPattern(key: string): TileState[] {
  return key
    .slice(0, 5)
    .split("")
    .map((digit) => DIGIT_TO_STATE[Number(digit)] ?? "gray");
}

export function isSolvedPattern(pattern: TileState[]): boolean {
  return pattern.every((state) => state === "green");
}

export function evaluateFeedback(guess: string, answer: string): TileState[] {
  return indexToPattern(evaluatePatternIndex(guess, answer));
}

export function evaluatePatternIndex(guess: string, answer: string): number {
  const normalizedGuess = guess.toLowerCase();
  const normalizedAnswer = answer.toLowerCase();
  const states = [0, 0, 0, 0, 0];
  const counts: Record<string, number> = {};

  for (let index = 0; index < 5; index += 1) {
    const guessLetter = normalizedGuess[index];
    const answerLetter = normalizedAnswer[index];
    if (guessLetter === answerLetter) {
      states[index] = 2;
    } else {
      counts[answerLetter] = (counts[answerLetter] ?? 0) + 1;
    }
  }

  for (let index = 0; index < 5; index += 1) {
    if (states[index] === 2) continue;
    const guessLetter = normalizedGuess[index];
    if ((counts[guessLetter] ?? 0) > 0) {
      states[index] = 1;
      counts[guessLetter] -= 1;
    }
  }

  return states.reduce(
    (total, state, index) => total + state * POWERS_OF_THREE[index],
    0,
  );
}

export function formatPattern(pattern: TileState[]): string {
  return pattern
    .map((state) => {
      if (state === "green") return "G";
      if (state === "yellow") return "Y";
      return "X";
    })
    .join("");
}

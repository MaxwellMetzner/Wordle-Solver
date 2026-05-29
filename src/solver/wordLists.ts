import answersRaw from "../../wordle-answers-alphabetical.txt?raw";
import allowedRaw from "../../wordle-allowed-guesses.txt?raw";

function parseWords(raw: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const word = line.trim().toLowerCase();
    if (!/^[a-z]{5}$/.test(word) || seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }

  return words;
}

export const SOLUTION_WORDS = parseWords(answersRaw);

const allowed = parseWords(allowedRaw);
const allowedSet = new Set(allowed);
for (const answer of SOLUTION_WORDS) {
  if (!allowedSet.has(answer)) {
    allowedSet.add(answer);
    allowed.push(answer);
  }
}

export const ALLOWED_GUESSES = allowed;
export const ANSWER_SET = new Set(SOLUTION_WORDS);
export const ALLOWED_SET = new Set(ALLOWED_GUESSES);
export const ANSWER_INDEX_BY_WORD = new Map(
  SOLUTION_WORDS.map((word, index) => [word, index] as const),
);

export const WORD_LIST_COUNTS = {
  solutions: SOLUTION_WORDS.length,
  allowed: ALLOWED_GUESSES.length,
};

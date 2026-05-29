import { Search, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { scoreSingleGuess } from "../solver/scoring";
import type { GuessResult } from "../solver/types";
import { ALLOWED_GUESSES, ALLOWED_SET } from "../solver/wordLists";

type CandidateBrowserProps = {
  candidates: string[];
  history: GuessResult[];
  spoilerSafe: boolean;
  onPickWord: (word: string) => void;
};

function formatStat(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}

export function CandidateBrowser({
  candidates,
  history,
  spoilerSafe,
  onPickWord,
}: CandidateBrowserProps) {
  const [query, setQuery] = useState("");
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const visibleWords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return ALLOWED_GUESSES.filter((word) =>
      word.includes(normalizedQuery),
    ).slice(0, 24);
  }, [query]);
  const selectedScore = useMemo(() => {
    if (!selectedWord || !ALLOWED_SET.has(selectedWord)) return null;
    return scoreSingleGuess(selectedWord, candidates, history);
  }, [candidates, history, selectedWord]);

  function updateQuery(value: string) {
    setQuery(value.replace(/[^a-z]/gi, "").slice(0, 5).toLowerCase());
    setSelectedWord(null);
  }

  function chooseWord(word: string) {
    setSelectedWord(word);
    setQuery(word);
    onPickWord(word);
  }

  const exactWord = query.length === 5 && ALLOWED_SET.has(query) ? query : null;

  return (
    <section className="candidate-browser" aria-label="Word analyzer">
      <div className="section-title-row">
        <h2>Word Analyzer</h2>
        <span>{candidates.length.toLocaleString()} candidates</span>
      </div>

      <label className="search-box">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">Search allowed words</span>
        <input
          value={query.toUpperCase()}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Search any valid guess"
          spellCheck={false}
        />
      </label>

      {exactWord && selectedWord !== exactWord ? (
        <button
          className="analyze-button"
          type="button"
          onClick={() => chooseWord(exactWord)}
        >
          <Target size={16} aria-hidden="true" />
          Analyze {exactWord.toUpperCase()}
        </button>
      ) : null}

      {selectedScore ? (
        <article className="analysis-card">
          <div className="word-row">
            <strong>{selectedScore.word.toUpperCase()}</strong>
            <span>
              {spoilerSafe
                ? "valid"
                : selectedScore.isPossibleAnswer
                  ? "answer"
                  : "probe"}
            </span>
          </div>
          <div className="rec-stats">
            <span>
              <b>{selectedScore.expectedBits.toFixed(2)}</b> bits
            </span>
            <span>
              <b>{formatStat(selectedScore.expectedRemaining)}</b> exp.
            </span>
            <span>
              <b>{formatStat(selectedScore.worstCaseRemaining, 0)}</b> worst
            </span>
            {selectedScore.solveProbability > 0 && !spoilerSafe ? (
              <span>
                <b>{(selectedScore.solveProbability * 100).toFixed(1)}%</b> solve
              </span>
            ) : null}
          </div>
          <div className="badge-row">
            {selectedScore.isHardModeLegal ? (
              <span className="badge legal">Hard legal</span>
            ) : (
              <span className="badge muted">Not hard mode</span>
            )}
          </div>
        </article>
      ) : null}

      <div className="candidate-list">
        {visibleWords.map((word) => (
          <button
            type="button"
            key={word}
            onClick={() => chooseWord(word)}
          >
            {word.toUpperCase()}
          </button>
        ))}
      </div>

      {!query ? (
        <p className="empty-recommendation">
          Search a valid guess to see its expected bits, average remaining
          candidates, and worst-case bucket.
        </p>
      ) : visibleWords.length === 0 ? (
        <p className="empty-recommendation">No valid guesses match that search.</p>
      ) : null}
    </section>
  );
}

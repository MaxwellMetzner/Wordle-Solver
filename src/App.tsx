import {
  BarChart3,
  Eye,
  EyeOff,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { CandidateBrowser } from "./components/CandidateBrowser";
import { Keyboard } from "./components/Keyboard";
import { RecommendationSidebar } from "./components/RecommendationSidebar";
import { StatusPanel } from "./components/StatusPanel";
import { WordleBoard } from "./components/WordleBoard";
import { EMPTY_PATTERN, cycleTileState, isSolvedPattern } from "./solver/feedback";
import {
  filterCandidatesByPattern,
  getKeyboardLetterStates,
  isHardModeLegal,
  log2,
  replayCandidates,
  scoreSingleGuess,
} from "./solver/scoring";
import type { GuessResult, PersistedGame, StrategyMode, TileState } from "./solver/types";
import {
  ALLOWED_SET,
  ANSWER_SET,
  SOLUTION_WORDS,
  WORD_LIST_COUNTS,
} from "./solver/wordLists";
import { useSolverWorker } from "./useSolverWorker";

const STORAGE_KEY = "wordle-solver-state-v1";
const RecapDashboard = lazy(() =>
  import("./components/RecapDashboard").then((module) => ({
    default: module.RecapDashboard,
  })),
);

const DEFAULT_SETTINGS = {
  strategy: "balanced" as StrategyMode,
  spoilerSafe: false,
  highContrast: false,
};

function normalizeWord(value: string) {
  return value.replace(/[^a-z]/gi, "").slice(0, 5).toLowerCase();
}

function restoreGame(): PersistedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedGame;
    if (!Array.isArray(parsed.guesses)) return null;
    return {
      guesses: parsed.guesses,
      settings: {
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
      },
    };
  } catch {
    return null;
  }
}

function formatValidation(
  currentWord: string,
  history: GuessResult[],
  currentPattern: TileState[],
) {
  if (currentWord.length === 0) return "Type a five-letter guess.";
  if (currentWord.length < 5) return "Keep typing to complete the guess.";
  if (!ALLOWED_SET.has(currentWord)) return "That word is not in the allowed list.";
  if (!isHardModeLegal(currentWord, history)) {
    return "Valid word, but it breaks current hard-mode constraints.";
  }
  if (isSolvedPattern(currentPattern)) return "All green. Submit to finish the game.";
  if (ANSWER_SET.has(currentWord)) return "Valid guess and possible answer.";
  return "Valid information-gathering guess.";
}

function App() {
  const restored = useMemo(() => restoreGame(), []);
  const [history, setHistory] = useState<GuessResult[]>(restored?.guesses ?? []);
  const [currentWord, setCurrentWord] = useState("");
  const [currentPattern, setCurrentPattern] = useState<TileState[]>(EMPTY_PATTERN);
  const [strategy, setStrategy] = useState<StrategyMode>(
    restored?.settings.strategy ?? DEFAULT_SETTINGS.strategy,
  );
  const [spoilerSafe, setSpoilerSafe] = useState(
    restored?.settings.spoilerSafe ?? DEFAULT_SETTINGS.spoilerSafe,
  );
  const [highContrast, setHighContrast] = useState(
    restored?.settings.highContrast ?? DEFAULT_SETTINGS.highContrast,
  );

  const candidates = useMemo(
    () => replayCandidates(SOLUTION_WORDS, history),
    [history],
  );
  const workerState = useSolverWorker(candidates, history);
  const lastGuess = history[history.length - 1];
  const isComplete = Boolean(lastGuess && isSolvedPattern(lastGuess.pattern));
  const hardModeLegal =
    currentWord.length < 5 || isHardModeLegal(currentWord, history);
  const isValidGuess = currentWord.length === 5 && ALLOWED_SET.has(currentWord);
  const canSubmit = isValidGuess && !isComplete;
  const validationText = formatValidation(currentWord, history, currentPattern);
  const letterStates = useMemo(() => getKeyboardLetterStates(history), [history]);

  useEffect(() => {
    const persisted: PersistedGame = {
      guesses: history,
      settings: {
        strategy,
        spoilerSafe,
        highContrast,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [history, strategy, spoilerSafe, highContrast]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select") {
        return;
      }
      if (isComplete) return;

      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        setCurrentWord((word) => normalizeWord(`${word}${event.key}`));
      } else if (event.key === "Backspace") {
        event.preventDefault();
        setCurrentWord((word) => word.slice(0, -1));
      } else if (event.key === "Enter") {
        event.preventDefault();
        submitGuess();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function setWord(word: string) {
    setCurrentWord(normalizeWord(word));
  }

  function appendLetter(letter: string) {
    if (isComplete) return;
    setCurrentWord((word) => normalizeWord(`${word}${letter}`));
  }

  function backspace() {
    setCurrentWord((word) => word.slice(0, -1));
  }

  function cycleTile(index: number) {
    setCurrentPattern((pattern) =>
      pattern.map((state, stateIndex) =>
        stateIndex === index ? cycleTileState(state) : state,
      ),
    );
  }

  function resetGame() {
    setHistory([]);
    setCurrentWord("");
    setCurrentPattern(EMPTY_PATTERN);
  }

  function undoGuess() {
    setHistory((guesses) => guesses.slice(0, -1));
    setCurrentWord("");
    setCurrentPattern(EMPTY_PATTERN);
  }

  function submitGuess() {
    if (!canSubmit) return;

    const candidatesBefore = candidates.length;
    const candidatesAfterList = filterCandidatesByPattern(
      candidates,
      currentWord,
      currentPattern,
    );
    const candidatesAfter = candidatesAfterList.length;
    const bitsGained = log2(Math.max(1, candidatesBefore)) - log2(Math.max(1, candidatesAfter));
    const guessScore = scoreSingleGuess(currentWord, candidates, history);
    const optimalBitsAvailable =
      workerState.result?.summary.bestExpectedBits || guessScore.expectedBits;
    const bestAvailableWord =
      workerState.result?.summary.bestInformationWord || currentWord;
    const efficiency =
      optimalBitsAvailable > 0 ? (bitsGained / optimalBitsAvailable) * 100 : 100;

    const result: GuessResult = {
      word: currentWord,
      pattern: currentPattern,
      candidatesBefore,
      candidatesAfter,
      bitsGained,
      expectedBitsForGuess: guessScore.expectedBits,
      expectedRemainingForGuess: guessScore.expectedRemaining,
      optimalBitsAvailable,
      bestAvailableWord,
      efficiency,
    };

    setHistory((guesses) => [...guesses, result]);
    setCurrentWord("");
    setCurrentPattern(EMPTY_PATTERN);
  }

  const statusLastBits = lastGuess?.bitsGained ?? 0;

  return (
    <div className="app" data-high-contrast={highContrast}>
      <header className="topbar">
        <div className="brand-block">
          <Sparkles size={22} aria-hidden="true" />
          <div>
            <span>Client-side</span>
            <h1>Wordle Solver</h1>
          </div>
        </div>

        <div className="toolbar" aria-label="Game controls">
          <label className="select-label">
            <span>Strategy</span>
            <select
              value={strategy}
              onChange={(event) => setStrategy(event.target.value as StrategyMode)}
            >
              <option value="balanced">Balanced</option>
              <option value="solve">Aggressive Solve</option>
              <option value="information">Information First</option>
              <option value="hardMode">Hard Mode</option>
              <option value="minimax">Minimax</option>
            </select>
          </label>

          <button
            className="icon-button text-button"
            type="button"
            onClick={() => setSpoilerSafe((value) => !value)}
            aria-label={spoilerSafe ? "Hide spoilers" : "Show spoilers"}
            title={spoilerSafe ? "Hide spoilers" : "Show spoilers"}
          >
            {spoilerSafe ? (
              <EyeOff size={17} aria-hidden="true" />
            ) : (
              <Eye size={17} aria-hidden="true" />
            )}
            Spoilers
          </button>

          <button
            className="icon-button text-button"
            type="button"
            onClick={() => setHighContrast((value) => !value)}
            aria-label={highContrast ? "Disable high contrast" : "Enable high contrast"}
            title={highContrast ? "Disable high contrast" : "Enable high contrast"}
          >
            <ShieldCheck size={17} aria-hidden="true" />
            Contrast
          </button>

          <button
            className="icon-button"
            type="button"
            onClick={undoGuess}
            disabled={history.length === 0}
            aria-label="Undo last guess"
            title="Undo last guess"
          >
            <Undo2 size={18} aria-hidden="true" />
          </button>

          <button
            className="icon-button text-button"
            type="button"
            onClick={resetGame}
          >
            <RefreshCcw size={17} aria-hidden="true" />
            New Game
          </button>
        </div>
      </header>

      <main className="main-layout">
        <div className="play-column">
          <StatusPanel
            candidatesRemaining={candidates.length}
            originalCandidates={WORD_LIST_COUNTS.solutions}
            lastBitsGained={statusLastBits}
            guessNumber={history.length + 1}
            hardModeLegal={hardModeLegal}
            workerState={workerState}
          />

          <div className="play-surface">
            <WordleBoard
              history={history}
              currentWord={currentWord}
              currentPattern={currentPattern}
              onTileCycle={cycleTile}
              onWordChange={setWord}
              disabled={isComplete}
            />

            <div className="entry-panel">
              <div className="validation-row">
                <BarChart3 size={17} aria-hidden="true" />
                <span>{validationText}</span>
              </div>

              <div className="entry-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={submitGuess}
                  disabled={!canSubmit}
                >
                  Submit Feedback
                </button>
                <span>
                  Click tiles to cycle gray, yellow, green before submitting.
                </span>
              </div>

              <Keyboard
                letterStates={letterStates}
                onLetter={appendLetter}
                onBackspace={backspace}
                onSubmit={submitGuess}
                disabled={isComplete}
              />
            </div>
          </div>

          {isComplete ? (
            <Suspense fallback={<div className="recap loading">Loading recap...</div>}>
              <RecapDashboard history={history} />
            </Suspense>
          ) : null}
        </div>

        <div className="side-column">
          <RecommendationSidebar
            workerState={workerState}
            strategy={strategy}
            spoilerSafe={spoilerSafe}
            onPickWord={setWord}
          />

          <CandidateBrowser
            candidates={candidates}
            spoilerSafe={spoilerSafe}
            onPickWord={setWord}
          />
        </div>
      </main>
    </div>
  );
}

export default App;

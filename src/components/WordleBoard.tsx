import type { GuessResult, TileState } from "../solver/types";

type WordleBoardProps = {
  history: GuessResult[];
  currentWord: string;
  currentPattern: TileState[];
  onTileCycle: (index: number) => void;
  onWordChange: (word: string) => void;
  disabled: boolean;
  showAnalysisLink: boolean;
};

const STATE_LABELS: Record<TileState, string> = {
  gray: "Absent",
  yellow: "Present",
  green: "Correct",
};

function normalizeInput(value: string) {
  return value.replace(/[^a-z]/gi, "").slice(0, 5).toLowerCase();
}

export function WordleBoard({
  history,
  currentWord,
  currentPattern,
  onTileCycle,
  onWordChange,
  disabled,
  showAnalysisLink,
}: WordleBoardProps) {
  const rows = Array.from({ length: 6 }, (_, rowIndex) => {
    if (rowIndex < history.length) {
      return {
        type: "locked" as const,
        word: history[rowIndex].word,
        pattern: history[rowIndex].pattern,
      };
    }

    if (rowIndex === history.length && !disabled) {
      return {
        type: "current" as const,
        word: currentWord,
        pattern: currentPattern,
      };
    }

    return {
      type: "empty" as const,
      word: "",
      pattern: Array<TileState>(5).fill("gray"),
    };
  });

  return (
    <section className="board-panel" aria-label="Wordle board">
      <div className="wordle-grid" role="grid">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="wordle-grid-row" role="row">
            {Array.from({ length: 5 }, (_, columnIndex) => {
              const letter = row.word[columnIndex] ?? "";
              const state = row.pattern[columnIndex];
              const isCurrent = row.type === "current";
              const ariaLabel = `Row ${rowIndex + 1}, tile ${columnIndex + 1}, ${
                letter ? letter.toUpperCase() : "blank"
              }, ${STATE_LABELS[state]}`;

              return (
                <button
                  key={`${rowIndex}-${columnIndex}`}
                  className={`tile tile-${state} tile-${row.type}`}
                  type="button"
                  role="gridcell"
                  aria-label={ariaLabel}
                  disabled={!isCurrent}
                  onClick={() => onTileCycle(columnIndex)}
                >
                  <span className="tile-letter">{letter.toUpperCase()}</span>
                  {letter && row.type !== "empty" ? (
                    <span className="tile-state-label">{STATE_LABELS[state][0]}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <label className="guess-input-label" htmlFor="guess-input">
        Current guess
      </label>
      <div className="guess-input-row">
        <input
          id="guess-input"
          className="guess-input"
          value={currentWord.toUpperCase()}
          onChange={(event) => onWordChange(normalizeInput(event.target.value))}
          maxLength={5}
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          disabled={disabled}
        />
        {showAnalysisLink ? (
          <a className="analysis-link" href="#game-recap">
            See analysis
          </a>
        ) : null}
      </div>
    </section>
  );
}

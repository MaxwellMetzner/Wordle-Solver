import { CornerDownLeft, Delete } from "lucide-react";
import type { TileState } from "../solver/types";

type KeyboardProps = {
  letterStates: Map<string, TileState>;
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled: boolean;
};

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

export function Keyboard({
  letterStates,
  onLetter,
  onBackspace,
  onSubmit,
  disabled,
}: KeyboardProps) {
  return (
    <section className="keyboard" aria-label="On-screen keyboard">
      {ROWS.map((row, rowIndex) => (
        <div className="keyboard-row" key={row}>
          {rowIndex === 2 ? (
            <button
              className="key key-wide"
              type="button"
              onClick={onSubmit}
              disabled={disabled}
              aria-label="Submit guess"
            >
              <CornerDownLeft size={17} aria-hidden="true" />
              Enter
            </button>
          ) : null}

          {row.split("").map((letter) => {
            const state = letterStates.get(letter);
            return (
              <button
                className={`key ${state ? `key-${state}` : ""}`}
                type="button"
                key={letter}
                onClick={() => onLetter(letter)}
                disabled={disabled}
                aria-label={`Letter ${letter.toUpperCase()}${
                  state ? `, ${state}` : ""
                }`}
              >
                {letter.toUpperCase()}
              </button>
            );
          })}

          {rowIndex === 2 ? (
            <button
              className="key key-wide"
              type="button"
              onClick={onBackspace}
              disabled={disabled}
              aria-label="Delete letter"
            >
              <Delete size={17} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ))}
    </section>
  );
}

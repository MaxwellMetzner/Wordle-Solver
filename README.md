# Wordle Solver & Game

A terminal-based Wordle solver and playable game written in Python. The solver ranks possible answers by positional letter frequency and narrows the list each round using your feedback.

## Features

- **Solver mode** – helps you solve an external Wordle puzzle by suggesting the highest-scoring words each round
- **Play mode** – play a full Wordle game in the terminal against a random hidden word
- **Positional letter-frequency scoring** – words are ranked by how common each letter is *at its specific position*, not just overall
- **Bigram graph** – the internal graph also tracks letter-pair (bigram) frequencies for future scoring enhancements
- **Duplicate-letter handling** – correctly handles cases where a letter appears more than once (e.g., "speed") using minimum/maximum count constraints
- **6-round limit** – both modes cap play at 6 guesses, matching official Wordle rules

## Requirements

- Python 3.6+
- No external dependencies

## Usage

```bash
python "Wordle Graph.py"
```

You'll see a menu with three options:

| Choice | Mode | Description |
|--------|------|-------------|
| 1 | **Solver** | Get word suggestions to solve an external Wordle game |
| 2 | **Play** | Play a Wordle game directly in the terminal |
| 3 | **Quit** | Exit the program |

### Solver Mode

1. The solver displays the top 10 starting words ranked by score.
2. Enter the 5-letter word you guessed in Wordle.
3. Enter the feedback Wordle gave you as a 5-character string:
   - `G` = **Green** – correct letter in the correct position
   - `Y` = **Yellow** – correct letter in the wrong position
   - `B` = **Black/Gray** – letter not in the word
4. The solver filters the remaining words and shows updated suggestions.
5. Repeat for up to 6 rounds or until the answer is found.

**Example:**
```
Enter your guessed word: crane
Enter feedback (G=green, Y=yellow, B=black/gray): BYBGB
```

### Play Mode

Guess the hidden 5-letter word within 6 attempts. Each guess is shown with colored terminal output indicating green, yellow, or gray letters.

## How It Works

1. **Graph construction** – A positional frequency graph is built from the word list. Each of the 5 positions contains 26 letter nodes with occurrence counts, plus bigram children linking to the next position.
2. **Scoring** – Each word's score is the sum of its letters' positional frequencies. Higher scores mean the word's letters are more common at those positions across all remaining candidates.
3. **Filtering** – After each guess, `applyFeedback()` filters the word list using:
   - Green constraints (exact position matches)
   - Yellow constraints (letter present but not at that position)
   - Minimum letter counts (total green + yellow occurrences)
   - Maximum letter counts (gray letters cap how many times a letter can appear)
4. **Graph rebuild** – The frequency graph is rebuilt from the filtered list each round for accurate scoring.

## Word List

The included `wordle-La.txt` contains 2,315 words — the original Wordle answer list.
import os
import random

WORD_LIST_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wordle-La.txt")
MAX_ROUNDS = 6


class Letter:
    """Node in a positional letter-frequency graph."""
    def __init__(self, name, count):
        self.name = name
        self.count = count
        self.children = []


def getWords():
    """Load the word list from disk."""
    with open(WORD_LIST_PATH, "r") as f:
        return [w.strip().lower() for w in f if w.strip()]


def createGraph(words):
    """Build a positional letter-frequency graph with bigram children."""
    graph = []
    for _ in range(5):
        graph.append([Letter(c, 0) for c in "abcdefghijklmnopqrstuvwxyz"])

    for word in words:
        for idx, ch in enumerate(word):
            for node in graph[idx]:
                if node.name == ch:
                    node.count += 1
                    break

        for idx in range(len(word) - 1):
            ch = word[idx]
            next_ch = word[idx + 1]
            for node in graph[idx]:
                if node.name == ch:
                    for child in node.children:
                        if child.name == next_ch:
                            child.count += 1
                            break
                    else:
                        node.children.append(Letter(next_ch, 1))
                    break

    return graph


def calculateScore(graph, words):
    """Score each word by positional letter frequency."""
    scored = []
    for word in words:
        score = 0
        for i, ch in enumerate(word):
            for node in graph[i]:
                if node.name == ch:
                    score += node.count
                    break
        scored.append((word, score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


# ---------------------------------------------------------------------------
#  Feedback helpers
# ---------------------------------------------------------------------------

def getFeedback(guess, answer):
    """Return a feedback string: G=green, Y=yellow, B=black/gray."""
    feedback = ['B'] * 5
    remaining = list(answer)

    # First pass – greens
    for i in range(5):
        if guess[i] == answer[i]:
            feedback[i] = 'G'
            remaining[i] = None

    # Second pass – yellows
    for i in range(5):
        if feedback[i] == 'G':
            continue
        if guess[i] in remaining:
            feedback[i] = 'Y'
            remaining[remaining.index(guess[i])] = None

    return ''.join(feedback)


def displayFeedback(guess, feedback):
    """Print the guess with ANSI-colored feedback."""
    colors = {'G': '\033[92m', 'Y': '\033[93m', 'B': '\033[90m'}
    reset = '\033[0m'
    print(' '.join(f"{colors[fb]}{ch.upper()}{reset}" for ch, fb in zip(guess, feedback)))


# ---------------------------------------------------------------------------
#  Word filtering (handles duplicate letters correctly)
# ---------------------------------------------------------------------------

def applyFeedback(words, guess, pattern):
    """Filter *words* using a guess and its G/Y/B feedback pattern.

    Correctly handles duplicate letters:
    - Green + Yellow count as minimum occurrences of that letter.
    - A gray instance of a letter that also has green/yellow instances means
      the word contains *exactly* the green+yellow count (no more).
    """
    green = {}          # position -> letter
    yellow = {}         # letter -> [positions]
    min_counts = {}     # letter -> minimum count
    max_counts = {}     # letter -> maximum count (only set when gray constrains it)

    for i, (ch, fb) in enumerate(zip(guess, pattern)):
        if fb == 'G':
            green[i] = ch
            min_counts[ch] = min_counts.get(ch, 0) + 1
        elif fb == 'Y':
            yellow.setdefault(ch, []).append(i)
            min_counts[ch] = min_counts.get(ch, 0) + 1

    for i, (ch, fb) in enumerate(zip(guess, pattern)):
        if fb == 'B':
            if ch in min_counts:
                max_counts[ch] = min_counts[ch]     # exactly this many
            else:
                max_counts[ch] = 0                   # none at all

    filtered = []
    for word in words:
        # Green check
        if any(word[p] != ch for p, ch in green.items()):
            continue

        # Yellow check – letter in word but NOT at the yellow position
        fail = False
        for ch, positions in yellow.items():
            for p in positions:
                if word[p] == ch:
                    fail = True
                    break
            if fail:
                break
        if fail:
            continue

        # Minimum count check
        if any(word.count(ch) < cnt for ch, cnt in min_counts.items()):
            continue

        # Maximum count check (duplicate-letter constraint)
        if any(word.count(ch) > cnt for ch, cnt in max_counts.items()):
            continue

        filtered.append(word)

    return filtered


def redactWords(words):
    """Prompt the user for a guess + feedback and filter the word list."""
    guess = input("Enter your guessed word: ").lower().strip()
    if len(guess) != 5 or not guess.isalpha():
        print("Invalid guess – please enter a 5-letter word.")
        return words

    pattern = input("Enter feedback (G=green, Y=yellow, B=black/gray): ").upper().strip()
    if len(pattern) != 5 or not all(c in 'GYB' for c in pattern):
        print("Invalid feedback – use exactly 5 characters of G, Y, or B.")
        return words

    return applyFeedback(words, guess, pattern)


# ---------------------------------------------------------------------------
#  Display helpers
# ---------------------------------------------------------------------------

def printScores(scores, count=10):
    """Pretty-print the top *count* scored words."""
    print(f"\n{'Word':<10}{'Score'}")
    print("-" * 18)
    for i in range(min(count, len(scores))):
        print(f"{scores[i][0]:<10}{scores[i][1]}")
    if not scores:
        print("No matching words found!")
    else:
        print(f"\n{len(scores)} possible word(s) remaining.")


# ---------------------------------------------------------------------------
#  Solver mode
# ---------------------------------------------------------------------------

def solverMode(words):
    """Interactive solver that narrows possibilities each round."""
    print("\n--- WORDLE SOLVER ---")
    print("Instructions:")
    print("  1. Enter the word you guessed in Wordle.")
    print("  2. Enter the feedback Wordle gave you:")
    print("       G = Green  (right letter, right spot)")
    print("       Y = Yellow (right letter, wrong spot)")
    print("       B = Black  (letter not in word)")
    print("  Example: guessed 'crane', got green-gray-yellow-gray-green → GBYBY\n")

    graph = createGraph(words)
    scores = calculateScore(graph, words)
    print("Suggested starting words:")
    printScores(scores)

    remaining = words[:]
    for round_num in range(1, MAX_ROUNDS + 1):
        print(f"\n=== Round {round_num}/{MAX_ROUNDS} ===")
        remaining = redactWords(remaining)

        # Rebuild graph for more accurate scoring on the reduced list
        graph = createGraph(remaining)
        scores = calculateScore(graph, remaining)
        printScores(scores)

        if len(remaining) <= 1:
            if remaining:
                print(f"\nThe answer must be: {remaining[0]}")
            else:
                print("\nNo words match – double-check your inputs.")
            break

        if round_num < MAX_ROUNDS:
            cont = input("\nContinue to next round? (y/n): ").lower().strip()
            if cont != 'y':
                break


# ---------------------------------------------------------------------------
#  Play mode (Wordle game in the terminal)
# ---------------------------------------------------------------------------

def playWordle(words):
    """Play a full Wordle game against a random hidden word."""
    answer = random.choice(words)
    print(f"\n--- WORDLE GAME ---")
    print(f"Guess the 5-letter word! You have {MAX_ROUNDS} attempts.\n")

    guesses_used = 0
    while guesses_used < MAX_ROUNDS:
        guess = input(f"Round {guesses_used + 1}/{MAX_ROUNDS} – your guess: ").lower().strip()

        if len(guess) != 5 or not guess.isalpha():
            print("Please enter a valid 5-letter word.")
            continue
        if guess not in words:
            print("Not in word list – try again.")
            continue

        guesses_used += 1
        feedback = getFeedback(guess, answer)
        displayFeedback(guess, feedback)

        if guess == answer:
            print(f"\nCongratulations! You got it in {guesses_used} guess(es)!")
            return

    print(f"\nGame over! The word was '{answer}'.")


# ---------------------------------------------------------------------------
#  Main menu
# ---------------------------------------------------------------------------

def main():
    words = getWords()

    print("=" * 40)
    print("       WORDLE SOLVER & GAME")
    print("=" * 40)

    while True:
        print("\nChoose a mode:")
        print("  1. Solver – help solve an external Wordle puzzle")
        print("  2. Play   – play a Wordle game right here")
        print("  3. Quit")

        choice = input("\nEnter choice (1/2/3): ").strip()
        if choice == '1':
            solverMode(words)
        elif choice == '2':
            playWordle(words)
        elif choice == '3':
            print("Goodbye!")
            break
        else:
            print("Invalid choice.")


if __name__ == "__main__":
    main()
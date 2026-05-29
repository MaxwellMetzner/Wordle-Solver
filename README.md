# Wordle Solver

A client-side Wordle solving app for exploring guesses, filtering possible answers, and reviewing how efficiently each guess narrowed the search space.

## Features

- Wordle-style six-row board with keyboard and click-to-cycle feedback entry.
- Correct duplicate-letter feedback handling.
- Candidate filtering by exact feedback pattern.
- Recommendation scoring for solve chance, information gain, hard mode, balanced play, and minimax risk.
- Web Worker scoring so expensive recommendation work stays off the UI thread.
- Status metrics for candidates remaining, uncertainty, bits gained, and hard-mode legality.
- End-game recap with candidate narrowing, actual vs optimal bits, and per-guess stats.
- Local storage persistence and an undo flow for correcting mistakes.
- Static build suitable for GitHub Pages.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run test
npm run build
```

## GitHub Pages Deployment

This repo includes `.github/workflows/pages.yml`. Enable GitHub Pages with "GitHub Actions" as the publishing source, then push to `main` or `master`. The workflow builds the Vite app and deploys `dist`.

## Word Lists

The allowed guesses and possible answers lists are credited to cfreshman:

- https://gist.github.com/cfreshman

The app runs fully in the browser and does not send guesses or results to a server.

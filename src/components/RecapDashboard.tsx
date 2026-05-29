import { Clipboard, LineChart as LineChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GuessResult } from "../solver/types";

type RecapDashboardProps = {
  history: GuessResult[];
};

function formatBits(value: number) {
  return `${value.toFixed(2)} bits`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function RecapDashboard({ history }: RecapDashboardProps) {
  if (history.length === 0) return null;

  const startCount = history[0].candidatesBefore;
  const finalCount = history[history.length - 1].candidatesAfter;
  const totalBits = history.reduce((sum, guess) => sum + guess.bitsGained, 0);
  const averageEfficiency =
    history.reduce((sum, guess) => sum + guess.efficiency, 0) / history.length;
  const bestGuess = [...history].sort((a, b) => b.bitsGained - a.bitsGained)[0];
  const weakestGuess = [...history].sort((a, b) => a.efficiency - b.efficiency)[0];

  const candidateData = [
    {
      label: "Start",
      candidates: startCount,
      display: startCount.toLocaleString(),
    },
    ...history.map((guess, index) => ({
      label: `${index + 1}. ${guess.word.toUpperCase()}`,
      candidates: Math.max(1, guess.candidatesAfter),
      display: guess.candidatesAfter.toLocaleString(),
    })),
  ];

  const bitsData = history.map((guess, index) => ({
    label: `${index + 1}. ${guess.word.toUpperCase()}`,
    actual: Number(guess.bitsGained.toFixed(2)),
    optimal: Number(guess.optimalBitsAvailable.toFixed(2)),
    efficiency: Number(guess.efficiency.toFixed(1)),
  }));

  const shareText = [
    "Wordle Solver Recap",
    `Solved in ${history.length} guesses`,
    history
      .map((guess, index) =>
        index === 0
          ? `${guess.candidatesBefore} -> ${guess.candidatesAfter}`
          : `${guess.candidatesAfter}`,
      )
      .join(" -> "),
    `Total information gained: ${totalBits.toFixed(2)} bits`,
    `Average efficiency: ${averageEfficiency.toFixed(1)}%`,
  ].join("\n");

  async function copyShareText() {
    await navigator.clipboard?.writeText(shareText);
  }

  return (
    <section className="recap" aria-label="End of game recap">
      <div className="recap-title">
        <LineChartIcon size={22} aria-hidden="true" />
        <div>
          <span>Game Recap</span>
          <h2>Solved in {history.length} guesses</h2>
        </div>
        <button type="button" className="icon-button text-button" onClick={copyShareText}>
          <Clipboard size={17} aria-hidden="true" />
          Copy recap
        </button>
      </div>

      <div className="summary-cards">
        <article>
          <span>Candidate path</span>
          <strong>
            {startCount.toLocaleString()} {"->"} {finalCount.toLocaleString()}
          </strong>
        </article>
        <article>
          <span>Total bits gained</span>
          <strong>{formatBits(totalBits)}</strong>
        </article>
        <article>
          <span>Average efficiency</span>
          <strong>{formatPercent(averageEfficiency)}</strong>
        </article>
        <article>
          <span>Best guess</span>
          <strong>{bestGuess.word.toUpperCase()}</strong>
        </article>
        <article>
          <span>Weakest guess</span>
          <strong>{weakestGuess.word.toUpperCase()}</strong>
        </article>
      </div>

      <div className="recap-grid">
        <article className="chart-panel">
          <h3>Candidate Narrowing</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={candidateData} margin={{ top: 12, right: 18, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
              <YAxis
                scale="log"
                domain={[1, "dataMax"]}
                allowDataOverflow
                tickFormatter={(value) => Number(value).toLocaleString()}
              />
              <Tooltip
                formatter={(value) => [Number(value).toLocaleString(), "Candidates"]}
              />
              <Line
                type="monotone"
                dataKey="candidates"
                stroke="#2f6fed"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="chart-panel">
          <h3>Actual vs Optimal Bits</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bitsData} margin={{ top: 12, right: 18, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="actual" name="Actual bits" fill="#5aa469" radius={[4, 4, 0, 0]} />
              <Bar dataKey="optimal" name="Best expected bits" fill="#d8a83f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </div>

      <div className="timeline-table" role="table" aria-label="Guess timeline">
        <div className="timeline-row timeline-head" role="row">
          <span>Guess</span>
          <span>Candidates</span>
          <span>Bits</span>
          <span>Best word then</span>
          <span>Efficiency</span>
        </div>
        {history.map((guess, index) => (
          <div className="timeline-row" role="row" key={`${guess.word}-${index}`}>
            <span>
              {index + 1}. {guess.word.toUpperCase()}
            </span>
            <span>
              {guess.candidatesBefore.toLocaleString()} {"->"}{" "}
              {guess.candidatesAfter.toLocaleString()}
            </span>
            <span>{guess.bitsGained.toFixed(2)}</span>
            <span>{guess.bestAvailableWord.toUpperCase()}</span>
            <span>{guess.efficiency.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

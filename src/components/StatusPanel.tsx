import { Activity, BarChart3, Brain, Gauge, ShieldCheck } from "lucide-react";
import type { SolverWorkerState } from "../useSolverWorker";

type StatusPanelProps = {
  candidatesRemaining: number;
  originalCandidates: number;
  lastBitsGained: number;
  guessNumber: number;
  hardModeLegal: boolean;
  workerState: SolverWorkerState;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 10 ? 2 : 0,
  }).format(value);
}

export function StatusPanel({
  candidatesRemaining,
  originalCandidates,
  lastBitsGained,
  guessNumber,
  hardModeLegal,
  workerState,
}: StatusPanelProps) {
  const uncertainty = Math.log2(Math.max(1, candidatesRemaining));
  const percentRemaining = (candidatesRemaining / originalCandidates) * 100;
  const scoringLabel =
    workerState.status === "ready"
      ? "Recommendations ready"
      : workerState.status === "error"
        ? "Scoring unavailable"
        : workerState.status === "preparing"
          ? "Preparing solver"
          : "Updating scores";

  return (
    <section className="status-grid" aria-label="Solver status">
      <article className="metric">
        <Activity size={18} aria-hidden="true" />
        <div>
          <span>Candidates</span>
          <strong>{formatNumber(candidatesRemaining)}</strong>
          <small>{percentRemaining.toFixed(2)}% remaining</small>
        </div>
      </article>

      <article className="metric">
        <Brain size={18} aria-hidden="true" />
        <div>
          <span>Uncertainty</span>
          <strong>{uncertainty.toFixed(2)} bits</strong>
          <small>{lastBitsGained.toFixed(2)} bits last guess</small>
        </div>
      </article>

      <article className="metric">
        <Gauge size={18} aria-hidden="true" />
        <div>
          <span>Guess</span>
          <strong>{Math.min(guessNumber, 6)} / 6</strong>
          <small>{scoringLabel}</small>
        </div>
      </article>

      <article className="metric">
        {hardModeLegal ? (
          <ShieldCheck size={18} aria-hidden="true" />
        ) : (
          <BarChart3 size={18} aria-hidden="true" />
        )}
        <div>
          <span>Hard mode</span>
          <strong>{hardModeLegal ? "Legal" : "Check word"}</strong>
          <small>
            {workerState.status === "ready"
              ? `${formatNumber(workerState.result?.summary.hardLegalCount ?? 0)} legal guesses`
              : `${Math.round(workerState.progress * 100)}% scored`}
          </small>
        </div>
      </article>
    </section>
  );
}

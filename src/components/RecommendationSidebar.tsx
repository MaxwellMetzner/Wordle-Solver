import { EyeOff, Info, Shield, Target, TrendingUp, Trophy } from "lucide-react";
import type {
  GuessScore,
  Recommendation,
  RecommendationCategory,
} from "../solver/types";
import type { SolverWorkerState } from "../useSolverWorker";

type RecommendationSidebarProps = {
  workerState: SolverWorkerState;
  candidateCount: number;
  spoilerSafe: boolean;
  onPickWord: (word: string) => void;
};

const CATEGORY_META: Record<
  RecommendationCategory,
  {
    label: string;
    icon: typeof Target;
  }
> = {
  solve: { label: "Best to Solve", icon: Trophy },
  information: { label: "Best for Information", icon: Info },
  hardMode: { label: "Best Hard Mode Guess", icon: Shield },
  balanced: { label: "Balanced Recommendation", icon: TrendingUp },
  minimax: { label: "Minimax Safety", icon: Target },
};

const CATEGORY_ORDER: RecommendationCategory[] = [
  "balanced",
  "solve",
  "information",
  "hardMode",
  "minimax",
];

function formatStat(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}

function categoryRecommendations(
  recommendations: Recommendation[],
  category: RecommendationCategory,
) {
  return recommendations.filter((recommendation) => recommendation.category === category);
}

function ScoreCard({
  score,
  explanation,
  onPickWord,
}: {
  score: GuessScore;
  explanation?: string;
  onPickWord: (word: string) => void;
}) {
  return (
    <button
      className="recommendation-card"
      type="button"
      onClick={() => onPickWord(score.word)}
      aria-label={`Use ${score.word.toUpperCase()}`}
    >
      <span className="word-row">
        <strong>{score.word.toUpperCase()}</strong>
        <span>{score.isPossibleAnswer ? "answer" : "probe"}</span>
      </span>
      {explanation ? <span className="rec-explanation">{explanation}</span> : null}
      <span className="rec-stats">
        <span>
          <b>{score.expectedBits.toFixed(2)}</b> bits
        </span>
        <span>
          <b>{formatStat(score.expectedRemaining)}</b> exp.
        </span>
        <span>
          <b>{formatStat(score.worstCaseRemaining, 0)}</b> worst
        </span>
        {score.solveProbability > 0 ? (
          <span>
            <b>{(score.solveProbability * 100).toFixed(1)}%</b> solve
          </span>
        ) : null}
      </span>
      <span className="badge-row">
        {score.isHardModeLegal ? (
          <span className="badge legal">Hard legal</span>
        ) : (
          <span className="badge muted">Not hard mode</span>
        )}
      </span>
    </button>
  );
}

export function RecommendationSidebar({
  workerState,
  candidateCount,
  spoilerSafe,
  onPickWord,
}: RecommendationSidebarProps) {
  const isLoading =
    workerState.status === "preparing" || workerState.status === "scoring";
  const resultMatchesCandidates =
    workerState.status === "ready" &&
    workerState.result?.summary.candidateCount === candidateCount;

  return (
    <aside className="recommendations" aria-label="Recommendations">
      <div className="sidebar-heading">
        <div>
          <span>Recommendations</span>
          <strong>
            {workerState.status === "ready"
              ? `${formatStat(workerState.result?.summary.allowedGuessCount ?? 0, 0)} scored`
              : "Scoring"}
          </strong>
        </div>
        {isLoading ? (
          <div
            className="progress-ring"
            aria-label={`${Math.round(workerState.progress * 100)} percent complete`}
          >
            {Math.round(workerState.progress * 100)}%
          </div>
        ) : null}
      </div>

      {workerState.error ? (
        <p className="notice error">{workerState.error}</p>
      ) : null}

      {spoilerSafe ? (
        <p className="notice">
          <EyeOff size={16} aria-hidden="true" />
          Spoiler-safe mode hides candidate-answer plays.
        </p>
      ) : null}

      {candidateCount <= 5 ? (
        <section className="recommendation-section">
          <h2>
            <Target size={17} aria-hidden="true" />
            Remaining Options
          </h2>

          {!resultMatchesCandidates ? (
            <p className="empty-recommendation">
              {isLoading ? "Calculating..." : "No scored options yet."}
            </p>
          ) : (
            <div className="recommendation-list">
              {(workerState.result?.candidateOptions ?? []).map((score) => (
                <ScoreCard
                  key={score.word}
                  score={score}
                  explanation="Still possible given every submitted pattern."
                  onPickWord={onPickWord}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {CATEGORY_ORDER.map((category) => {
        const meta = CATEGORY_META[category];
        const Icon = meta.icon;
        const recommendations = categoryRecommendations(
          workerState.result?.recommendations ?? [],
          category,
        );
        const visibleRecommendations = spoilerSafe
          ? recommendations.filter((recommendation) => !recommendation.isPossibleAnswer)
          : recommendations;

            return (
              <section className="recommendation-section" key={category}>
            <h2>
              <Icon size={17} aria-hidden="true" />
              {meta.label}
            </h2>

            {visibleRecommendations.length === 0 ? (
              <p className="empty-recommendation">
                {isLoading ? "Calculating..." : "No visible words in this mode."}
              </p>
            ) : (
              <div className="recommendation-list">
                {visibleRecommendations.map((recommendation) => (
                  <ScoreCard
                    key={`${category}-${recommendation.word}`}
                    score={recommendation}
                    explanation={recommendation.explanation}
                    onPickWord={onPickWord}
                  />
                ))}
              </div>
            )}
              </section>
            );
          })}
        </>
      )}
    </aside>
  );
}

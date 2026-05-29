import { EyeOff, Info, Shield, Target, TrendingUp, Trophy } from "lucide-react";
import type { Recommendation, RecommendationCategory, StrategyMode } from "../solver/types";
import type { SolverWorkerState } from "../useSolverWorker";

type RecommendationSidebarProps = {
  workerState: SolverWorkerState;
  strategy: StrategyMode;
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

export function RecommendationSidebar({
  workerState,
  strategy,
  spoilerSafe,
  onPickWord,
}: RecommendationSidebarProps) {
  const isLoading =
    workerState.status === "preparing" || workerState.status === "scoring";

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
        const isPrimary = strategy === category;

        return (
          <section
            className={`recommendation-section ${isPrimary ? "primary-section" : ""}`}
            key={category}
          >
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
                  <button
                    className="recommendation-card"
                    type="button"
                    key={`${category}-${recommendation.word}`}
                    onClick={() => onPickWord(recommendation.word)}
                    aria-label={`Use ${recommendation.word.toUpperCase()}`}
                  >
                    <span className="word-row">
                      <strong>{recommendation.word.toUpperCase()}</strong>
                      <span>
                        {recommendation.isPossibleAnswer ? "answer" : "probe"}
                      </span>
                    </span>
                    <span className="rec-explanation">
                      {recommendation.explanation}
                    </span>
                    <span className="rec-stats">
                      <span>
                        <b>{recommendation.expectedBits.toFixed(2)}</b> bits
                      </span>
                      <span>
                        <b>{formatStat(recommendation.expectedRemaining)}</b> exp.
                      </span>
                      <span>
                        <b>{formatStat(recommendation.worstCaseRemaining, 0)}</b> worst
                      </span>
                      {recommendation.solveProbability > 0 ? (
                        <span>
                          <b>
                            {(recommendation.solveProbability * 100).toFixed(1)}%
                          </b>{" "}
                          solve
                        </span>
                      ) : null}
                    </span>
                    <span className="badge-row">
                      {recommendation.isHardModeLegal ? (
                        <span className="badge legal">Hard legal</span>
                      ) : (
                        <span className="badge muted">Not hard mode</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </aside>
  );
}

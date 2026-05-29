import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type CandidateBrowserProps = {
  candidates: string[];
  spoilerSafe: boolean;
  onPickWord: (word: string) => void;
};

export function CandidateBrowser({
  candidates,
  spoilerSafe,
  onPickWord,
}: CandidateBrowserProps) {
  const [query, setQuery] = useState("");
  const visibleCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return candidates
      .filter((candidate) =>
        normalizedQuery ? candidate.includes(normalizedQuery) : true,
      )
      .slice(0, 80);
  }, [candidates, query]);

  return (
    <section className="candidate-browser" aria-label="Candidate browser">
      <div className="section-title-row">
        <h2>Candidate Browser</h2>
        <span>{candidates.length.toLocaleString()} left</span>
      </div>

      {spoilerSafe ? (
        <p className="notice">
          Candidate words are hidden while spoiler-safe mode is enabled.
        </p>
      ) : (
        <>
          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search candidates</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search candidates"
            />
          </label>

          <div className="candidate-list">
            {visibleCandidates.map((candidate) => (
              <button
                type="button"
                key={candidate}
                onClick={() => onPickWord(candidate)}
              >
                {candidate.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

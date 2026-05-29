import { useEffect, useMemo, useRef, useState } from "react";
import { patternToIndex } from "./solver/feedback";
import { ANSWER_INDEX_BY_WORD } from "./solver/wordLists";
import type {
  GuessHistoryEntry,
  ScoreResult,
  SolverWorkerRequest,
  SolverWorkerResponse,
} from "./solver/types";

type WorkerStatus = "idle" | "preparing" | "scoring" | "ready" | "error";

export type SolverWorkerState = {
  status: WorkerStatus;
  progress: number;
  result: ScoreResult | null;
  error: string | null;
};

function makeSignature(candidates: string[], history: GuessHistoryEntry[]) {
  const historyKey = history
    .map((guess) => `${guess.word}:${patternToIndex(guess.pattern)}`)
    .join("|");
  return `${candidates.length}:${historyKey}`;
}

export function useSolverWorker(
  candidates: string[],
  history: GuessHistoryEntry[],
): SolverWorkerState {
  const [state, setState] = useState<SolverWorkerState>({
    status: "idle",
    progress: 0,
    result: null,
    error: null,
  });
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  const signature = useMemo(
    () => makeSignature(candidates, history),
    [candidates, history],
  );

  useEffect(() => {
    const worker = new Worker(new URL("./solver/scoringWorker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<SolverWorkerResponse>) => {
      const response = event.data;
      const latestRequestId = requestIdRef.current;

      if (
        "requestId" in response &&
        response.requestId !== latestRequestId &&
        response.type !== "progress"
      ) {
        return;
      }

      if (response.type === "progress") {
        if (response.requestId !== latestRequestId) return;
        setState((current) => ({
          ...current,
          status: response.phase,
          progress: response.progress,
          error: null,
        }));
        return;
      }

      if (response.type === "scoreResult") {
        if (response.result.requestId !== latestRequestId) return;
        setState({
          status: "ready",
          progress: 1,
          result: response.result,
          error: null,
        });
        return;
      }

      if (response.type === "error") {
        if (response.requestId !== latestRequestId) return;
        setState((current) => ({
          ...current,
          status: "error",
          error: response.message,
        }));
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const candidateIndexes = candidates
      .map((word) => ANSWER_INDEX_BY_WORD.get(word))
      .filter((index): index is number => index !== undefined);

    const request: SolverWorkerRequest = {
      type: "score",
      requestId,
      signature,
      candidateIndexes,
      history,
      topN: 2,
    };

    setState((current) => ({
      status: current.result ? "scoring" : "preparing",
      progress: 0,
      result: current.result,
      error: null,
    }));
    worker.postMessage(request);
  }, [candidates, history, signature]);

  return state;
}

import { describe, expect, it } from "vitest";
import { evaluateFeedback, formatPattern, patternToIndex } from "./feedback";
import { filterCandidatesByPattern } from "./scoring";

describe("feedback evaluation", () => {
  it("handles exact matches", () => {
    expect(formatPattern(evaluateFeedback("crane", "crane"))).toBe("GGGGG");
  });

  it("does not over-credit duplicate letters", () => {
    expect(formatPattern(evaluateFeedback("sheep", "empty"))).toBe("XXYXY");
  });

  it("uses exact feedback pattern filtering for candidates", () => {
    const candidates = ["cigar", "rebut", "sissy"];
    const pattern = evaluateFeedback("cigar", "cigar");
    expect(filterCandidatesByPattern(candidates, "cigar", pattern)).toEqual([
      "cigar",
    ]);
  });

  it("keeps stable base-three pattern indexes", () => {
    expect(patternToIndex(["gray", "yellow", "green", "gray", "yellow"])).toBe(
      102,
    );
  });
});

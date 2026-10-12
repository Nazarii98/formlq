import { normalizeOpenAnswer, type TestQuestion, type QuestionResult } from "@/lib/tests";

/** Parse a matching answer (JSON `{ leftId: rightId }`); `{}` when empty or malformed. */
export function parseMatchingAnswer(
  answer: string | undefined,
): Record<string, string> {
  if (!answer) return {};
  try {
    return JSON.parse(answer) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Matching counts as answered only when every left item has a pair. */
export function isAnswered(q: TestQuestion, answer: string | undefined): boolean {
  if (!answer) return false;
  if (q.type === "matching") {
    try {
      const p = JSON.parse(answer) as Record<string, string>;
      return q.leftItems.every((item) => !!p[item.id]);
    } catch {
      return false;
    }
  }
  return answer.trim().length > 0;
}

export function countUnanswered(
  questions: TestQuestion[],
  answers: Record<string, string>,
): number {
  return questions.filter((q) => !isAnswered(q, answers[q.id])).length;
}

/** Open answers: ignore surrounding whitespace, treat "." and "," as the same decimal separator. */
// Re-exported so scoring (calcRawScore) and result display share one rule.
export { normalizeOpenAnswer };

/** Points for a matching answer: proportional to correctly matched pairs, rounded. */
export function matchingPartialScore(
  correctPairs: Record<string, string>,
  userPairs: Record<string, string>,
  points: number,
): { score: number; correctCount: number; totalPairs: number } {
  const totalPairs = Object.keys(correctPairs).length;
  const correctCount = Object.entries(correctPairs).filter(
    ([k, v]) => userPairs[k] === v,
  ).length;
  const score =
    totalPairs > 0 ? Math.round(correctCount * (points / totalPairs)) : 0;
  return { score, correctCount, totalPairs };
}

/** Snapshot of each question + the student's answer, stored with the result. */
export function buildQuestionResults(
  qs: TestQuestion[],
  ans: Record<string, string>,
): QuestionResult[] {
  return qs.map((q) => {
    const userAnswer = ans[q.id] ?? "";
    let correct = false;
    if (q.type === "mcq") correct = userAnswer === q.correctOptionId;
    if (q.type === "open")
      correct =
        normalizeOpenAnswer(userAnswer) ===
        normalizeOpenAnswer(q.correctAnswer);
    let partialScore: number | undefined;
    if (q.type === "matching") {
      try {
        const p = JSON.parse(userAnswer) as Record<string, string>;
        const m = matchingPartialScore(q.correctPairs, p, q.points);
        correct = m.correctCount === m.totalPairs;
        partialScore = m.score;
      } catch {
        correct = false;
        partialScore = 0;
      }
    }
    const base = {
      id: q.id,
      type: q.type,
      text: q.text,
      imageUrl: q.imageUrl ?? null,
      points: q.points,
      userAnswer,
      isCorrect: correct,
      explanation: q.explanation ?? "",
      explanationImageUrl: q.explanationImageUrl ?? null,
    };
    if (q.type === "mcq")
      return {
        ...base,
        options: q.options,
        correctOptionId: q.correctOptionId,
      };
    if (q.type === "open") return { ...base, correctAnswer: q.correctAnswer };
    return {
      ...base,
      leftItems: q.leftItems,
      rightOptions: q.rightOptions,
      correctPairs: q.correctPairs,
      partialScore,
    };
  });
}

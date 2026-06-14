import type { SessionScore, SubjectArea } from "@upcat/shared";
import { SUBJECT_AREAS } from "@upcat/shared";

export type AnswerLabel = "A" | "B" | "C" | "D";

export interface SessionScoreEntry {
  questionId: string;
  userAnswer: string | null;
  timeSpent: number | null;
  correctAnswer?: string | null;
}

export interface SessionQuestionMeta {
  subjectArea: SubjectArea;
  correctAnswer: AnswerLabel;
}

export interface ScoredSessionEntry extends SessionScoreEntry {
  isCorrect: boolean;
}

export interface SessionScoringResult {
  updatedEntries: ScoredSessionEntry[];
  score: SessionScore;
}

function isAnswerLabel(value: unknown): value is AnswerLabel {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function getAnswerKey(entry: SessionScoreEntry, fallback: AnswerLabel): AnswerLabel {
  return isAnswerLabel(entry.correctAnswer) ? entry.correctAnswer : fallback;
}

export interface ScoringConfig {
  correct: number;
  incorrect: number;
  unanswered: number;
}

export function scoreSessionEntries(
  entries: SessionScoreEntry[],
  metaByQuestionId: Map<string, SessionQuestionMeta>,
  scoring: ScoringConfig = { correct: 1, incorrect: -0.25, unanswered: 0 },
): SessionScoringResult {
  const bySubject: Record<
    SubjectArea,
    { correct: number; total: number; percentage: number }
  > = {
    "Language Proficiency": { correct: 0, total: 0, percentage: 0 },
    Mathematics: { correct: 0, total: 0, percentage: 0 },
    Science: { correct: 0, total: 0, percentage: 0 },
    "Reading Comprehension": { correct: 0, total: 0, percentage: 0 },
  };

  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  let rawScore = 0;

  const updatedEntries: ScoredSessionEntry[] = entries.map((entry) => {
    const meta = metaByQuestionId.get(entry.questionId);

    if (!meta) {
      unanswered++;
      rawScore += scoring.unanswered;
      return { ...entry, isCorrect: false };
    }

    bySubject[meta.subjectArea].total++;

    if (!isAnswerLabel(entry.userAnswer)) {
      rawScore += scoring.unanswered;
      unanswered++;
      return { ...entry, isCorrect: false };
    }

    const answerKey = getAnswerKey(entry, meta.correctAnswer);
    const isCorrect = entry.userAnswer === answerKey;

    if (isCorrect) {
      correct++;
      bySubject[meta.subjectArea].correct++;
      rawScore += scoring.correct;
    } else {
      incorrect++;
      rawScore += scoring.incorrect;
    }

    return { ...entry, isCorrect };
  });

  for (const subject of SUBJECT_AREAS) {
    const stat = bySubject[subject];
    stat.percentage = stat.total === 0 ? 0 : Math.round((stat.correct / stat.total) * 100);
  }

  const total = entries.length;
  const maxPossibleScore = total * scoring.correct;
  const percentage =
    maxPossibleScore === 0 ? 0 : Math.round((rawScore / maxPossibleScore) * 100);

  const score: SessionScore = {
    total,
    correct,
    incorrect,
    unanswered,
    percentage: Math.max(0, percentage),
    bySubject,
    rawScore,
  };

  return {
    updatedEntries,
    score,
  };
}

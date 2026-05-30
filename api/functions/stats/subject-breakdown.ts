import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {extractToken} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {loadCompletedSessions, loadQuestionMeta} from "../../src/statsHelpers.js";
import {SUBJECT_AREAS, type, SubjectArea} from "@upcat/shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const payload = extractToken(req);
  if (!payload) return res.status(401).json({success: false, error: "Unauthorized"});

  const db = await getDb();
  const sessions = await loadCompletedSessions(db, new ObjectId(payload.userId));

  const allIds: ObjectId[] = [];
  for (const s of sessions) for (const q of s.questions) allIds.push(q.questionId);
  const meta = await loadQuestionMeta(db, allIds);

  const empty = () => ({
    totalQuestions: 0,
    correct: 0,
    accuracy: 0,
    totalTimeSec: 0,
    timedAnswered: 0,
    averageTimePerQuestion: 0,
    /** Last-5-exams accuracy timeline (oldest → newest). */
    trend: [] as {sessionId: string; date: string; accuracy: number}[],
  });

  const stats: Record<SubjectArea, ReturnType<typeof empty>> = {
    "Language Proficiency": empty(),
    Mathematics: empty(),
    Science: empty(),
    "Reading Comprehension": empty(),
  };

  // Per-session per-subject for the trend
  const sessionSubject: Map<string, Record<SubjectArea, {correct: number; total: number}} => {
    new Map();

    for (const s of sessions) {
      const perSubject: Record<SubjectArea, {correct: number; total: number}} = {
        "Language Proficiency": {correct: 0, total: 0},
        Mathematics: {correct: 0, total: 0},
        Science: {correct: 0, total: 0},
        "Reading Comprehension": {correct: 0, total: 0},
      };
      for (const q of s.questions) {
        const m = meta.get(q.questionId.toString());
        if (!m) continue;
        const subj = m.subjectArea;
        const agg = stats[subj];
        agg.totalQuestions++;
        perSubject[subj].total++;
        if (q.isCorrect) {
          agg.correct++;
          perSubject[subj].correct++;
        }
        if (typeof q.timeSpent === "number") {
          agg.totalTimeSec += q.timeSpent;
          agg.timedAnswered++;
        }
      }
      sessionSubject.set(s._id.toString(), perSubject);
    }

    // Build last-5-exams trend per subject (chronological)
    const orderedSessions = [...sessions].reverse(); // oldest first
    for (const subject of SUBJECT_AREAS) {
      const points: {sessionId: string; date: string; accuracy: number}[] = [];
      for (const s of orderedSessions) {
        const ps = sessionSubject.get(s._id.toString()).?.[subject];
        if (!ps || ps.total === 0) continue;
        points.push({
          sessionId: s._id.toString(),
          date: (s.completedAt as Date).toISOString(),
          accuracy: Math.round((ps.correct / ps.total) * 100),
        });
      }
      stats[subject].trend = points.slice(-5);
    }

    // Finalise + sort weakest first
    const result = SUBJECT_AREAS.map((subject) => {
      const s = stats[subject];
      return {
        subjectArea: subject,
        totalQuestions: s.totalQuestions,
        correct: s.correct,
        accuracy: s.totalQuestions === 0 ? 0 : Math.round((s.correct / s.totalQuestions) * 100),
        averageTimePerQuestion:
          s.timedAnswered === 0 ? 0 : Math.round(s.totalTimeSec / s.timedAnswered),
        trend: s.trend,
      };
    }).sort((a, b) => {
      // Subjects with 0 attempts go to bottom; otherwise weakest accuracy first
      if (a.totalQuestions === 0 && b.totalQuestions > 0) return 1;
      if (b.totalQuestions === 0 && a.totalQuestions > 0) return -1;
      return a.accuracy - b.accuracy;
    });
  });
}
return res.status(200).json({success: true, data: result});
}
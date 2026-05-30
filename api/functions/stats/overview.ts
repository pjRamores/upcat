import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {extractToken} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {loadCompletedSessions} from "../../src/statsHelpers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const payload = extractToken(req);
  if (!payload) return res.status(401).json({success: false, error: "Unauthorized"});

  const db = await getDb();
  const sessions = await loadCompletedSessions(db, new ObjectId(payload.userId));

  const totalExamsTaken = sessions.length;

  let totalQuestionsAnswered = 0;
  let totalCorrect = 0;
  let totalTimeSpentSec = 0;
  let scoreSum = 0;
  let highest = 0;
  let lowest = totalExamsTaken > 0 ? 100 : 0;

  for (const s of sessions) {
    scoreSum += s.score?.percentage ?? 0;
    highest = Math.max(highest, s.score?.percentage ?? 0);
    lowest = Math.min(lowest, s.score?.percentage ?? 0);
    for (const q of s.questions ?? []) {
      if (q.userAnswer !== null && q.userAnswer !== "") {
        totalQuestionsAnswered++;
        if (q.isCorrect) totalCorrect++;
      }
      if (typeof q.timeSpent === "number") totalTimeSpentSec += q.timeSpent;
    }
  }

  const averageScore = totalExamsTaken === 0 ? 0 : Math.round(scoreSum / totalExamsTaken);
  const overallAccuracy =
    totalQuestionsAnswered === 0
    ? 0
    : Math.round((totalCorrect / totalQuestionsAnswered) * 100);

  // --- Streaks (consecutive UTC days with at least 1 completed exam) ---
  const days = new Set<string>();
  for (const s of sessions) {
    if (s.completedAt) {
      const d = new Date(s.completedAt);
      days.add(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
      );
    }
  }

  const sorted = [...days].sort();
  let longestStreak = 0;
  let currentRun = 0;
  let prevTs: number | null = null;
  for (const dStr of sorted) {
    const ts = new Date(`${dStr}T00:00:00Z`).getTime();
    if (prevTs === null || ts - prevTs === 86_400_000) {
      currentRun++;
    } else {
      currentRun = 1;
    }
    longestStreak = Math.max(longestStreak, currentRun);
    prevTs = ts;
  }

  // currentStreak: must end on today or yesterday
  let currentStreak = 0;
  if (sorted.length > 0) {
    const todayUTC = new Date();
    const today = `${todayUTC.getUTCFullYear()}-${String(todayUTC.getUTCMonth() + 1).padStart(2, "0")}`;
    const yesterdayDate = new Date(Date.now() - 86_400_000);
    const yesterday = `${yesterdayDate.getUTCFullYear()}-${String(yesterdayDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const last = sorted[sorted.length - 1];
    if (last === today || last === yesterday) {
      // walk back from last
      let cur = new Date(`${last}T00:00:00Z`).getTime();
      for (let i = sorted.length - 1; i >= 0; i--) {
        const ts = new Date(`${sorted[i]}T00:00:00Z`).getTime();
        if (ts === cur) {
          currentStreak++;
          cur -= 86_400_000;
        } else if (ts < cur) {
          break;
        }
      }
    }
  }

  const totalHours = Math.floor(totalTimeSpentSec / 3600);
  const totalMinutes = Math.floor((totalTimeSpentSec % 3600) / 60);

  return res.status(200).json({
    success: true,
    data: {
      totalExamsTaken,
      averageScore,
      highestScore: totalExamsTaken === 0 ? 0 : highest,
      lowestScore: totalExamsTaken === 0 ? 0 : lowest,
    }
  });
}
totalQuestionsAnswered,
overallAccuracy,
totalTimeSpent: {
  seconds: totalTimeSpentSec,
  hours: totalHours,
  minutes: totalMinutes,
  formatted: `${totalHours}h ${totalMinutes}m`,
},
currentStreak,
longestStreak,
},
});
}
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { extractToken } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { loadCompletedSessions, loadQuestionMeta } from "../../src/statsHelpers.js";

type Period = "week" | "month" | "all";

function bucketKey(d: Date, period: Period): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    if (period === "week") {
        return `${y}-${m}-${String(d.getUTCDate()).padStart(2, "0")}`;
    }
    if (period === "month") {
        // ISO-ish week label: yyyy-Www
        const start = new Date(Date.UTC(y, 0, 1));
        const days = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
        const week = String(Math.floor(days / 7) + 1).padStart(2, "0");
        return `${y}-${week}`;
    }
    return `${y}-${m}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }
    const payload = extractToken(req);
    if (!payload) return res.status(401).json({ success: false, error: "Unauthorized" });

    const periodRaw = (req.query.period as string) || "week";
    const period: Period = periodRaw === "month" || periodRaw === "all" ? periodRaw : "week";

    const now = Date.now();
    const cutoff = period === "week" ? now - 7 * 86_400_000 : period === "month" ? now - 30 * 86_400_000 : 0;
    const db = await getDb();
    const sessions = (await loadCompletedSessions(db, new ObjectId(payload.userId))).filter(
        (s) => (s.completedAt ? s.completedAt.getTime() >= cutoff : false),
    );

    const allIds: ObjectId[] = [];
    for (const s of sessions) for (const q of s.questions) allIds.push(q.questionId);
    const meta = await loadQuestionMeta(db, allIds);

    type Bucket = {
        examsTaken: number;
        scoreSum: number;
        correct: number;
        answered: number;
    };
    const buckets = new Map<string, Bucket>();

    for (const s of sessions) {
        if (!s.completedAt) continue;
        const key = bucketKey(s.completedAt, period);
        const b: Bucket = buckets.get(key) ?? {
            examsTaken: 0,
            scoreSum: 0,
            correct: 0,
            answered: 0,
        };
        b.examsTaken++;
        b.scoreSum += s.score?.percentage ?? 0;
        for (const q of s.questions) {
            if (!meta.get(q.questionId.toString())) continue;
            if (q.userAnswer !== null && q.userAnswer !== "") {
                b.answered++;
                if (q.isCorrect) b.correct++;
            }
        }
        buckets.set(key, b);
    }

    const data = [...buckets.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([date, b]) => ({
            date,
            examsTaken: b.examsTaken,
            averageScore: Math.round(b.scoreSum / b.examsTaken),
            accuracy: b.answered === 0 ? 0 : Math.round((b.correct / b.answered) * 100),
        }));

    return res.status(200).json({ success: true, data: { period, points: data } });
}
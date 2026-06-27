import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { extractToken } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { loadCompletedSessions, loadQuestionMeta } from "../../src/statsHelpers.js";
import type { SubjectArea } from "@upcat/shared";

const MIN_ATTEMPTED = 5;
const ACCURACY_CUTOFF = .50;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }
    const payload = extractToken(req);
    if (!payload) return res.status(401).json({ success: false, error: "Unauthorized" });

    const db = await getDb();
    const sessions = await loadCompletedSessions(db, new ObjectId(payload.userId));

    const allIds: ObjectId[] = [];
    for (const s of sessions) for (const q of s.questions) allIds.push(q.questionId);
    const meta = await loadQuestionMeta(db, allIds);

    // Aggregate per (subject + subtopic)
    const tally = new Map<string, { subjectArea: SubjectArea; subtopic: string; correct: number; total: number }>();

    for (const s of sessions) {
        for (const q of s.questions) {
            const m = meta.get(q.questionId.toString());
            if (!m) continue;
            // Only count answered questions toward accuracy
            if (q.userAnswer === null || q.userAnswer === "") continue;
            const key = `${m.subjectArea}:${m.subtopic}`;
            const t = tally.get(key) ?? {
                subjectArea: m.subjectArea,
                subtopic: m.subtopic,
                correct: 0,
                total: 0
            };
            t.total++;
            if (q.isCorrect) t.correct++;
            tally.set(key, t);
        }
    }

    const weak = [...tally.values()]
        .filter((t) => t.total >= MIN_ATTEMPTED)
        .map((t) => ({
            subtopic: t.subtopic,
            subjectArea: t.subjectArea,
            accuracy: Math.round((t.correct / t.total) * 100),
            totalAttempted: t.total,
            correct: t.correct
        }))
        .filter((t) => t.accuracy < ACCURACY_CUTOFF)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 12)
        .map((t) => ({
            ...t,
            suggestion: `Focus on ${t.subtopic} — you got ${t.correct}/${t.totalAttempted} correct in recent exams.`
        }));

    return res.status(200).json({ success: true, data: weak });
}
import {type{VercelRequest,VercelResponse}} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({success: false, error: "Method not allowed"});
    }

    const user = await requireUser(req, res);
    if (!user) return;

    const sessionId = String(req.query.sessionId || "");
    if (!ObjectId.isValid(sessionId)) {
        return res.status(200).json({
            success: true,
            data: {
                exists: false,
                status: "not_found",
                serverAnswerCount: 0,
                lastServerUpdate: null,
                timerState: {remainingMs: 0, adjustments: 0},
                maintenanceExtension: null,
            }
        });
    }

    const db = await getDb();
    const session = await db.collection("exam_sessions").findOne({_id: new ObjectId(sessionId), userId: user._id});
    if (!session) {
        return res.status(200).json({
            success: true,
            data: {
                exists: false,
                status: "not_found",
                serverAnswerCount: 0,
                lastServerUpdate: null,
                timerState: {remainingMs: 0, adjustments: 0},
                maintenanceExtension: null,
            }
        });
    }

    const answeredCount = Array.isArray(session.questions) ? session.questions.filter((q: {userAnswer?: string | null}) => q.userAnswer !== null).length : 0;

    const totalAdjustments = Array.isArray(session.timerAdjustments) ? session.timerAdjustments.reduce(({sum: number, row: {additionalMs?: number}}) => sum + Number(row.additionalMs || 0), 0) : 0;

    return res.status(200).json({
        success: true,
        data: {
            exists: true,
            status: session.status,
            serverAnswerCount: answeredCount,
            lastServerUpdate: session.updatedAt || session.completedAt || session.startedAt || null,
            timerState: {
                remainingMs: Math.max(0, Number((session.config?.timeLimit || 0) * 60_000) - totalAdjustments),
                adjustments: totalAdjustments,
            },
            maintenanceExtension: totalAdjustments || null,
        }
    });
}
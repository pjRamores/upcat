import { type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireCronAuth } from "../../src/cronAuth.js";
import { getDb } from "../../src/db.js";
import { applyAdaptation, type DbStudyPlan, toApiStudyPlan } from "../../src/studyPlan.js";

/**
 * Cron: study-plan-adaptation-check
 * Evaluates active plans and applies light schedule/content adaptations.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!requireCronAuth(req, res)) return;

    const db = await getDb();
    const activePlans = await db.collection<DbStudyPlan>("study_plans").find({ status: "active" }).toArray();

    const updates: Array<{ planId: string; changes: string[] }> = [];
    for (const planDoc of activePlans) {
        const plan = toApiStudyPlan(planDoc);
        const shouldAdapt =
            plan.progress.averageAssessmentScore >= 90 ||
            (plan.progress.averageAssessmentScore > 0 && plan.progress.averageAssessmentScore < 60) ||
            plan.schedule.daysAhead < -2;

        if (!shouldAdapt) continue;
        const adapted = applyAdaptation(plan, "Scheduled.adaptation.check");
        if (!adapted.changes.length) continue;

        await db.collection("study_plans").updateOne(
            {_id: new ObjectId(plan._id)},
            {
                $set: {
                    curriculum: adapted.plan.curriculum,
                    progress: adapted.plan.progress,
                    schedule: adapted.plan.schedule,
                    adaptations: adapted.plan.adaptations,
                    updatedat: new Date(),
                },
            },
        );
        updates.push({ planId: plan._id, changes: adapted.changes });
    }

    return res.status(200).json({
        success: true,
        data: {
            activePlans: activePlans.length,
            adaptedPlans: updates.length,
            updates,
        },
    });
}
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import type { StudyPlanTemplate } from "@upcat/shared";
import { requireUser } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { awardXp, updateDailyStreak } from "../../src/gamification.js";
import { isPremiumActive, normalizeSubscription } from "../../src/subscription.js";

import {
  applyAdaptation,
  computeSchedule,
  type DbStudyPlan,
  findSession,
  generatePersonalizedStudyPlan,
  getActivePlan,
  getStudyPlanConfig,
  getTemplateSummary,
  normalizeStudyPlanParameters,
  pickTodaySession,
  recalculatePlanProgress,
  summaryFromPlan,
  toApiStudyPlan,
  validateStudyPlanParameters,
} from "../../src/studyPlan.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const db = await getDb();
  const action = typeof req.query.action === "string" ? req.query.action : "";
  const planId = typeof req.query.planId === "string" ? req.query.planId : null;
  const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : null;
  const activityId = typeof req.query.activityId === "string" ? req.query.activityId : null;

  try {
    if (req.method === "GET" && action === "templates") {
      const templates = await db
        .collection<StudyPlanTemplate>("study_plan_templates")
        .find({ status: "active" })
        .sort({ targetDuration: 1 })
        .toArray();

      return res.status(200).json({
        success: true,
        data: templates.map(getTemplateSummary),
      });
    }

    if (req.method === "POST" && action === "generate") {
      const cfg = getStudyPlanConfig();

      const active = await db.collection("study_plans").countDocuments({
        userId: user._id,
        status: { $in: ["active", "paused"] },
      });

      if (active >= cfg.maxActive) {
        return res.status(409).json({
          success: false,
          error: "You already have an active study plan.",
        });
      }

      const body = (req.body ?? {}) as {
        templateId?: string | null;
        parameters?: Record<string, unknown>;
        diagnosticId?: string | null;
        diagnosticMethod?: "test" | "historical" | "self_assessment" | "none";
      };

      const parameters = normalizeStudyPlanParameters(body.parameters ?? {});
      const errors = validateStudyPlanParameters(parameters);
      if (errors.length) {
        return res.status(400).json({
          success: false,
          error: errors.join("; "),
        });
      }

      let template: StudyPlanTemplate | null = null;

      if (body.templateId && ObjectId.isValid(body.templateId)) {
        template = await db.collection<StudyPlanTemplate>("study_plan_templates").findOne({
          _id: new ObjectId(body.templateId) as never,
          status: "active",
        });
      }

      if (!template) {
        template = await db
          .collection<StudyPlanTemplate>("study_plan_templates")
          .find({ status: "active" })
          .sort({ targetDuration: 1 })
          .limit(1)
          .next();
      }

      if (!template) {
        return res.status(500).json({
          success: false,
          error: "No active study plan template found",
        });
      }

      const subscription = normalizeSubscription(user as unknown as Record<string, unknown>);
      const premium = isPremiumActive(subscription);

      if (!premium && template.targetDuration > 4) {
        return res.status(403).json({
          success: false,
          error:
            "Free users can only create study plans up to 4 weeks. Upgrade to Premium for longer plans.",
          upgradeUrl: "/pricing",
        });
      }

      if (!premium && parameters.targetExamDate) {
        const diffDays = Math.ceil(
          (new Date(parameters.targetExamDate).getTime() -
            new Date(parameters.startDate).getTime()) /
            86_400_000,
        );

        if (diffDays > 26) {
          return res.status(403).json({
            success: false,
            error: "Free users can only generate study plans covering up to 4 weeks.",
            upgradeUrl: "/pricing",
          });
        }
      }

      let diagnosticResults = null;
      if (body.diagnosticId && ObjectId.isValid(body.diagnosticId)) {
        const diagnostic = await db.collection("diagnostic_tests").findOne({
          _id: new ObjectId(body.diagnosticId),
          userId: user._id,
        });

        if (!diagnostic || diagnostic.status !== "completed") {
          return res.status(400).json({
            success: false,
            error: "Diagnostic must be completed",
          });
        }

        diagnosticResults = diagnostic.result ?? null;
      }

      const created = await generatePersonalizedStudyPlan(
        db,
        user._id,
        parameters,
        diagnosticResults,
        template,
      );

      await awardXp(db, user._id, {
        reason: "admin_grant",
        baseAmount: 10,
        description: "Started first study plan",
        metadata: { category: "study_plan", event: "start" },
      });

      const plan = toApiStudyPlan(created);

      return res.status(201).json({
        success: true,
        data: {
          planId: plan._id,
          summary: summaryFromPlan(plan),
        },
      });
    }

    if (req.method === "GET" && action === "active") {
      const plan = await getActivePlan(db, user._id);
      if (!plan) {
        return res.status(200).json({ success: true, data: null });
      }

      const apiPlan = toApiStudyPlan(plan);
      const summary = String(req.query.summary ?? "false") === "true";

      if (summary) {
        return res.status(200).json({
          success: true,
          data: {
            _id: apiPlan._id,
            status: apiPlan.status,
            progress: apiPlan.progress,
            schedule: apiPlan.schedule,
            today: pickTodaySession(apiPlan),
          },
        });
      }

      return res.status(200).json({ success: true, data: apiPlan });
    }

    if (req.method === "GET" && action === "calendar") {
      const active = await getActivePlan(db, user._id);
      if (!active) {
        return res.status(200).json({ success: true, data: { days: [] } });
      }

      const plan = toApiStudyPlan(active);
      const days = plan.curriculum.phases.flatMap((phase) =>
        phase.modules.flatMap((module) =>
          module.sessions.map((session) => ({
            date: session.scheduledDate.slice(0, 10),
            title: session.title,
            dayNumber: session.dayNumber,
            status: session.status,
            module: module.name,
            assessmentDay: session.activities.some((a) => a.type === "assessment"),
          })),
        ),
      );

      return res.status(200).json({
        success: true,
        data: { planId: plan._id, days },
      });
    }

    if (req.method === "GET" && planId && action === "detail") {
      const plan = await loadPlan(db, user._id as ObjectId, planId, res);
      if (!plan) return;
      return res.status(200).json({ success: true, data: plan });
    }

    if (req.method === "GET" && planId && action === "today") {
      const plan = await loadPlan(db, user._id as ObjectId, planId, res);
      if (!plan) return;

      const today = pickTodaySession(plan);
      if (!today.session) {
        return res.status(200).json({
          success: true,
          data: { planComplete: true },
        });
      }

      const found = findSession(plan, today.session.id);
      if (!found) {
        return res.status(404).json({ success: false, error: "Session not found" });
      }

      if (today.isRestDay) {
        return res.status(200).json({
          success: true,
          data: {
            isRestDay: true,
            nextSessionDate: today.session.scheduledDate,
            message: "Enjoy your rest day. Come back tomorrow refreshed.",
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          session: today.session,
          module: {
            id: found.module.id,
            name: found.module.name,
            progress: found.module.sessions.filter((s) => s.status === "completed").length,
          },
          phase: {
            id: found.phase.id,
            name: found.phase.name,
          },
          isRestDay: false,
          streak: plan.progress.studyStreak,
          motivationalMessage:
            plan.schedule.daysAhead >= 0
              ? `You're ${plan.schedule.daysAhead} day(s) ahead of schedule.`
              : `You're ${Math.abs(plan.schedule.daysAhead)} day(s) behind. Keep going!`,
        },
      });
    }

    if (req.method === "GET" && planId && sessionId && action === "session") {
      const plan = await loadPlan(db, user._id as ObjectId, planId, res);
      if (!plan) return;

      const found = findSession(plan, sessionId);
      if (!found) {
        return res.status(404).json({ success: false, error: "Session not found" });
      }

      const lessons = await db
        .collection("study_lessons")
        .find({
          _id: {
            $in: found.session.activities
              .map((a) => a.content.lessonId)
              .filter(
                (id): id is string =>
                  typeof id === "string" && id.length > 0 && ObjectId.isValid(id),
              )
              .map((id) => new ObjectId(id)),
          },
        })
        .toArray();

      const lessonMap = new Map(lessons.map((l) => [String(l._id), l]));

      return res.status(200).json({
        success: true,
        data: {
          ...found.session,
          activities: found.session.activities.map((activity) => ({
            ...activity,
            lessonContent: activity.content.lessonId
              ? lessonMap.get(activity.content.lessonId) ?? null
              : null,
          })),
        },
      });
    }

    if (req.method === "POST" && planId && sessionId && activityId && action === "activity-start") {
      const plan = await loadPlan(db, user._id as ObjectId, planId, res);
      if (!plan) return;

      const found = findSession(plan, sessionId);
      if (!found) {
        return res.status(404).json({ success: false, error: "Session not found" });
      }

      const activity = found.session.activities.find((a) => a.id === activityId);
      if (!activity) {
        return res.status(404).json({ success: false, error: "Activity not found" });
      }

      if (activity.status === "locked") {
        return res.status(400).json({ success: false, error: "Activity is locked" });
      }

      if (activity.status === "available") {
        activity.status = "in_progress";
      }

      await persistPlan(db, planId, plan);

      if (
        activity.type === "lesson" &&
        activity.content.lessonId &&
        ObjectId.isValid(activity.content.lessonId)
      ) {
        const lesson = await db
          .collection("study_lessons")
          .findOne({ _id: new ObjectId(activity.content.lessonId) });

        return res.status(200).json({
          success: true,
          data: { activityStarted: true, lessonContent: lesson },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          activityStarted: true,
          sessionId:
            activity.result?.practiceSessionId ??
            activity.result?.assessmentSessionId ??
            null,
          cards: activity.type === "flashcards" ? [] : undefined,
        },
      });
    }

    if (
      req.method === "POST" &&
      planId &&
      sessionId &&
      activityId &&
      action === "activity-complete"
    ) {
      const plan = await loadPlan(db, user._id as ObjectId, planId, res);
      if (!plan) return;

      const found = findSession(plan, sessionId);
      if (!found) {
        return res.status(404).json({ success: false, error: "Session not found" });
      }

      const activity = found.session.activities.find((a) => a.id === activityId);
      if (!activity) {
        return res.status(404).json({ success: false, error: "Activity not found" });
      }

      const body = (req.body ?? {}) as {
        timeSpent?: number;
        result?: {
          score?: number;
          passed?: boolean;
          practiceSessionId?: string;
          assessmentSessionId?: string;
        };
      };

      activity.status = "completed";
      activity.completedAt = new Date().toISOString();

      if (activity.result) {
        const score = typeof body.result?.score === "number" ? body.result.score : null;
        const passed = typeof body.result?.passed === "boolean" ? body.result.passed : null;

        activity.result = {
          ...activity.result,
          passed,
          attempts: activity.result.attempts + 1,
          bestScore: Math.max(activity.result.bestScore ?? 0, score ?? 0),
          timeSpent: Number(body.timeSpent ?? 0),
          practiceSessionId:
            body.result?.practiceSessionId ?? activity.result.practiceSessionId,
          assessmentSessionId:
            body.result?.assessmentSessionId ?? activity.result.assessmentSessionId,
        };
      }

      const allDone = found.session.activities.every(
        (a) => a.status === "completed" || a.status === "skipped",
      );

      if (allDone) {
        found.session.status = "completed";
        found.session.completedAt = new Date().toISOString();
      }

      if (activity.type === "assessment") {
        const passed = Boolean(activity.result?.passed);

        if (passed) {
          found.module.assessment.status = "passed";
          found.module.status = "completed";
          found.module.assessment.passedAt = new Date().toISOString();

          const allModules = plan.curriculum.phases.flatMap((phase) => phase.modules);
          const idx = allModules.findIndex((m) => m.id === found.module.id);

          if (idx >= 0 && idx < allModules.length - 1) {
            const next = allModules[idx + 1];
            if (next.status === "locked") {
              next.status = "active";
              if (next.sessions) next.sessions.status = "available";
              next.assessment.status = "available";
            }
          }
        } else {
          found.module.assessment.status = "failed";
        }
      }

      if (allDone) {
        const modules = plan.curriculum.phases.flatMap((phase) => phase.modules);
        const idx = modules.findIndex((m) => m.id === found.module.id);

        if (idx >= 0 && idx < modules.length - 1) {
          const current = modules[idx];
          const nextSession = current.sessions.find((s) => s.status === "locked");
          if (nextSession) nextSession.status = "available";
        }
      }

      const activityXp =
        activity.type === "lesson"
          ? 15
          : activity.type === "practice"
            ? 20
            : activity.type === "assessment" && activity.result?.passed
              ? activity.result.attempts <= 1
                ? 75
                : 50
              : 5;

      await awardXp(db, user._id, {
        reason: "admin_grant",
        baseAmount: activityXp,
        description: `Study plan ${activity.type} completed`,
        metadata: { category: "study_plan", activityType: activity.type },
      });

      const streak = await updateDailyStreak(db, user._id);
      plan.progress.studyStreak.current = streak.info.current;
      plan.progress.studyStreak.longest = streak.info.longest;
      plan.progress.studyStreak.lastStudyDate = streak.info.lastActiveDate ?? "";

      plan.progress = recalculatePlanProgress(plan);
      plan.schedule = computeSchedule(plan);

      await persistPlan(db, planId, plan);

      return res.status(200).json({
        success: true,
        data: {
          completed: true,
          sessionComplete: allDone,
          moduleComplete: found.module.status === "completed",
          nextAction: found.module.status === "completed" ? "next_module" : "continue",
        },
      });
    }

    if (req.method === "POST" && planId && sessionId && action === "session-skip") {
      const plan = await loadPlan(db, user._id as ObjectId, planId, res);
      if (!plan) return;

      const found = findSession(plan, sessionId);
      if (!found) {
        return res.status(404).json({ success: false, error: "Session not found" });
      }

      found.session.status = "skipped";
      found.session.activities = found.session.activities.map((activity) => ({
        ...activity,
        status: activity.type === "assessment" ? activity.status : "skipped",
      }));

      plan.progress = recalculatePlanProgress(plan);
      plan.schedule = computeSchedule(plan);
      await persistPlan(db, planId, plan);

      return res.status(200).json({
        success: true,
        data: {
          skipped: true,
          warning: "You'll need to cover this material before the assessment.",
        },
      });
    }

    if (req.method === "POST" && planId && action === "adapt") {
      const plan = await loadPlan(db, user._id as ObjectId, planId, res);
      if (!plan) return;

      const adapted = applyAdaptation(plan, "Manual or automatic adaptation trigger");
      await persistPlan(db, planId, adapted.plan);

      return res.status(200).json({
        success: true,
        data: { adapted: true, changes: adapted.changes },
      });
    }

    if (req.method === "PUT" && planId && action === "reschedule") {
      const plan = await loadPlan(db, user._id as ObjectId, planId, res);
      if (!plan) return;

      const body = (req.body ?? {}) as {
        newTargetDate?: string;
        newHoursPerDay?: number;
        newStudyDays?: number[];
        pauseUntil?: string;
      };

      if (body.newTargetDate) {
        plan.parameters.targetExamDate = new Date(body.newTargetDate).toISOString();
      }
      if (typeof body.newHoursPerDay === "number") {
        plan.parameters.availableHoursPerDay = body.newHoursPerDay;
      }
      if (Array.isArray(body.newStudyDays)) {
        plan.parameters.studyDaysPerWeek = body.newStudyDays;
      }

      const now = new Date();
      if (body.pauseUntil) {
        const pauseDate = new Date(body.pauseUntil);
        const shiftDays = Math.max(
          0,
          Math.ceil((pauseDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        );

        for (const phase of plan.curriculum.phases) {
          for (const module of phase.modules) {
            for (const session of module.sessions) {
              if (session.status === "completed" || session.status === "skipped") continue;
              const dt = new Date(session.scheduledDate);
              dt.setDate(dt.getDate() + shiftDays);
              session.scheduledDate = dt.toISOString();
            }
          }
        }
      }

      plan.schedule = computeSchedule(plan);
      await persistPlan(db, planId, plan);

      return res.status(200).json({
        success: true,
        data: {
          rescheduled: true,
          newEstimatedCompletion: plan.schedule.estimatedCompletionDate,
        },
      });
    }

    if (req.method === "POST" && planId && action === "pause") {
      const plan = await loadPlan(db, user._id as ObjectId, planId, res);
      if (!plan) return;

      plan.status = "paused";
      await persistPlan(db, planId, plan);

      return res.status(200).json({
        success: true,
        data: { paused: true },
      });
    }

    if (req.method === "POST" && planId && action === "resume") {
      const plan = await loadPlan(db, user._id as ObjectId, planId, res);
      if (!plan) return;

      plan.status = "active";
      plan.schedule = computeSchedule(plan);
      await persistPlan(db, planId, plan);

      return res.status(200).json({
        success: true,
        data: {
          resumed: true,
          nextSession: {
            date: plan.schedule.nextSessionDate,
            sessionId: plan.schedule.nextSessionId,
          },
        },
      });
    }

    if (req.method === "POST" && planId && action === "abandon") {
      const plan = await loadPlan(db, user._id as ObjectId, planId, res);
      if (!plan) return;

      plan.status = "abandoned";
      plan.abandonedAt = new Date().toISOString();
      await persistPlan(db, planId, plan);

      return res.status(200).json({
        success: true,
        data: { abandoned: true },
      });
    }

    if (req.method === "GET" && planId && action === "analytics") {
      const plan = await loadPlan(db, user._id as ObjectId, planId, res);
      if (!plan) return;

      const modules = plan.curriculum.phases.flatMap((phase) => phase.modules);

      const performanceScores = modules.flatMap((m) =>
        m.assessment.attempts.map((a) => a.score),
      );

      const avgAssessmentScore =
        performanceScores.length > 0
          ? Math.round(
              (performanceScores.reduce((acc, cur) => acc + cur, 0) /
                performanceScores.length) *
                100,
            ) / 100
          : 0;

      const assessmentHistory = modules.flatMap((m) =>
        m.assessment.attempts.map((a) => ({
          module: m.name,
          attemptNumber: a.attemptNumber,
          score: a.score,
          passed: a.passed,
          date: a.completedAt,
        })),
      );

      return res.status(200).json({
        success: true,
        data: {
          overview: {
            completedDays: plan.progress.completedDays,
            totalDays: plan.progress.totalDays,
            progressPercent: plan.progress.overallProgress,
            daysAhead: plan.schedule.daysAhead,
            estimatedCompletion: plan.schedule.estimatedCompletionDate,
            streak: plan.progress.studyStreak,
          },
          performance: {
            averageAssessmentScore: avgAssessmentScore,
            assessmentPassRate:
              plan.progress.completedAssessments > 0
                ? Math.round(
                    (plan.progress.passedAssessments /
                      plan.progress.completedAssessments) *
                      100,
                  )
                : 0,
            averagePracticeScore: 0,
            totalQuestionsAnswered: assessmentHistory.reduce(
              (acc, item) => acc + Math.max(0, item.score),
              0,
            ),
          },
          timeAnalysis: {
            totalTimeSpent: plan.progress.totalTimeSpent,
            averagePerDay: plan.progress.averageTimePerDay,
            mostProductiveTime: plan.parameters.preferredStudyTime,
            timeBySubject: plan.progress.subjectProgress.map((s) => ({
              subject: s.subjectArea,
              minutes: Math.round(
                (s.modulesCompleted / Math.max(1, s.modulesTotal)) *
                  plan.progress.totalTimeSpent,
              ),
            })),
          },
          subjectProgress: plan.progress.subjectProgress.map((s) => ({
            subject: s.subjectArea,
            modulesCompleted: s.modulesCompleted,
            modulesTotal: s.modulesTotal,
            avgScore: s.averageScore,
            trend: s.averageScore >= 70 ? "up" : "flat",
          })),
          assessmentHistory,
          adaptations: plan.adaptations,
          milestones: [
            {
              description: "Started personalized study plan",
              date: plan.createdAt,
              type: "plan_start",
            },
          ],
          readinessEstimate: {
            overall: Math.min(
              100,
              Math.round(plan.progress.overallProgress * 0.6 + avgAssessmentScore * 0.4),
            ),
            bySubject: plan.progress.subjectProgress,
            recommendation:
              avgAssessmentScore >= 75 && plan.progress.overallProgress >= 70
                ? "Take a mock exam"
                : "Keep studying",
          },
        },
      });
    }

    res.setHeader("Allow", "GET, POST, PUT");
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  } catch (error) {
    console.error("[study-plan/plans] failed", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

async function loadPlan(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: ObjectId,
  planId: string,
  res: VercelResponse,
) {
  if (!ObjectId.isValid(planId)) {
    res.status(400).json({ success: false, error: "Invalid plan id" });
    return null;
  }

  const doc = await db.collection<DbStudyPlan>("study_plans").findOne({
    _id: new ObjectId(planId) as never,
    userId,
  });

  if (!doc) {
    res.status(404).json({ success: false, error: "Study plan not found" });
    return null;
  }

  return toApiStudyPlan(doc);
}

async function persistPlan(
  db: Awaited<ReturnType<typeof getDb>>,
  planId: string,
  plan: ReturnType<typeof toApiStudyPlan>,
) {
  await db.collection("study_plans").updateOne(
    { _id: new ObjectId(planId) as never },
    {
      $set: {
        status: plan.status,
        parameters: plan.parameters,
        diagnostic: plan.diagnostic,
        curriculum: plan.curriculum,
        progress: plan.progress,
        adaptations: plan.adaptations,
        schedule: plan.schedule,
        updatedAt: new Date(),
        completedAt: plan.completedAt ? new Date(plan.completedAt) : null,
        abandonedAt: plan.abandonedAt ? new Date(plan.abandonedAt) : null,
      },
    },
  );
}

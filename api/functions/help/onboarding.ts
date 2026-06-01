import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {applyRewards} from "../../src/gamification.js";
import {checkOnboardingTriggers, normalizeContextualPage, normalizeUserHelp} from "../../src/help.js";

type OnboardingFlowDoc = {
  _id: string;
  triggerCondition?: string;
  canBeReplayed?: boolean;
  isActive?: boolean;
  [key: string]: unknown;
};

function completedEntry(completed: boolean, stepsCompleted: number) {
  return {
    completedAt: completed ? new Date() : undefined,
    skippedAt: completed ? null : new Date(),
    stepsCompleted: Math.max(0, stepsCompleted),
  };
}

function triggerMatchesPage(triggerCondition: string, page: string): boolean {
  if (triggerCondition === "first_login") return page === "/dashboard" || page === "/";
  if (triggerCondition === "first_practice") return page === "/practice-test/configure" || page === "/practice";
  if (triggerCondition === "first_mock") return page.startsWith("/mock-exam") || page === "/dashboard";
  if (triggerCondition === "first_study_plan") return page.startsWith("/study-plan");
  if (triggerCondition === "first_xp_earned") return page === "/profile" || page === "/results";
  return triggerCondition === "manual";
}

async function shouldServeFlow(
  db: Awaited<ReturnType<typeof getDb>>,
  user: {_id: unknown; help?: unknown; gamification?: {xp?: number}},
  flowId: string,
  currentPage: string,
  manual = false,
) {
  const flow = await db
    .collection<OnboardingFlowDoc>("onboarding_flows")
    .findOne({_id: flowId, isActive: true});
  if (!flow) return {flow: null, reason: "flow_not_found"};

  const userHelp = normalizeUserHelp(user.help);
  const completion = userHelp.onboardingCompleted[flowId];

  if (!manual && userHelp.helpPreferences.showOnboarding === false) {
    return {flow: null, reason: "preferences_disabled"};
  }

  if (!manual && completion?.completedAt && !flow.canBeReplayed) {
    return {flow: null, reason: "already_completed"};
  }

  if (!manual && completion?.skippedAt && !flow.canBeReplayed) {
    return {flow: null, reason: "already_skipped"};
  }

  if (!manual && !triggerMatchesPage(String(flow.triggerCondition ?? "manual"), currentPage)) {
    return {flow: null, reason: "trigger_not_met"};
  }

  return {flow, reason: "eligible"};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const db = await getDb();

  if (req.method === "GET") {
    const flowId = String(req.query.flowId ?? "").trim();
    if (!flowId) {
      return res.status(400).json({success: false, error: "Missing flowId"});
    }
    const page = normalizeContextualPage(String(req.query.page ?? "/"));
    const manualParam = String(req.query.manual ?? "").trim().toLowerCase();
    const manual = manualParam === "" ? true : !(manualParam === "0" || manualParam === "false");
    const result = await shouldServeFlow(db, user, flowId, page, manual);
    if (!result.flow) {
      return res.status(404).json({success: false, error: "Flow not available", reason: result.reason});
    }
    return res.status(200).json({success: true, data: {flow: result.flow}});
  }

  if (req.method === "POST") {
    const flowId = String(req.query.flowId ?? "").trim();
    const action = String(req.query.action ?? "complete").trim();
    if (!flowId) {
      return res.status(400).json({success: false, error: "Missing flowId"});
    }

    const completed = action !== "skip";
    const stepsCompleted = Number((req.body as {stepsCompleted?: number}) | undefined)?.stepsCompleted ?? 0;

    await db.collection("users").updateOne(
      {_id: user._id},
      {
        $set: {
          [`help.onboardingCompleted.${flowId}`]: completedEntry(completed, stepsCompleted),
        },
      },
    );
  }
}
// Light reward for completing onboarding.
if (completed) {
  try {
    await applyRewards(db, user._id, [
      {reason: "admin_grant", baseAmount: 15, description: `Onboarding completed: ${flowId}`},
    ]);
    catch {
      // Reward failures should not block onboarding progression.
    }
  }
  return res.status(200).json({success: true, data: completed? {recorded: true} : {skipped: true}});
}

res.setHeader("Allow", "GET, POST");
return res.status(405).json({success: false, error: "Method not allowed"});
}

export async function checkOnboarding(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const db = await getDb();
  const page = normalizeContextualPage(String(req.query.page ?? "/"));
  const userHelp = normalizeUserHelp((user as {help?: unknown}).help);

  if (userHelp.helpPreferences.showOnboarding === false) {
    return res.status(200).json({success: true, data: {items: []}});
  }

  const activeFlows = await db
    .collection<OnboardingFlowDoc>("onboarding_flows")
    .find({isActive: true})
    .project({_id: 1, triggerCondition: 1, canBeReplayed: 1})
    .toArray();

  const suggested: Array<{flowId: string; triggerCondition: string; reason: string}} = [];

  // First, use explicit trigger policy aligned with product behavior.
  const conventional = checkOnboardingTriggers(user as unknown as {
    help?: unknown;
    gamification?: {xp?: number};
    createdAt?: Date | string | null
  }, page);
  if (conventional) {
    suggested.push({flowId: conventional, triggerCondition: "policy", reason: "rule_match"});
  }

  // Then include any additional active flow that matches page and completion state.
  for (const flow of activeFlows) {
    const flowId = String(flow._id);
    if (suggested.some((item) => item.flowId === flowId)) continue;
    const completion = userHelp.onboardingCompleted[flowId];
    if (completion?.completedAt || completion?.skippedAt) continue;
    const triggerCondition = String(flow.triggerCondition ?? "manual");
    if (!triggerMatchesPage(triggerCondition, page)) continue;
    suggested.push({flowId, triggerCondition, reason: "trigger_condition"});
  }

  return res.status(200).json({success: true, data: {items: suggested}});
}
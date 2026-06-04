import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../../../../src/auth.js";
import { getDB } from "../../../../src/db.js";

type StringIdDoc = { _id: string; [key: string]: unknown };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = await getDB();
  const onboardingFlows = db.collection<StringIdDoc>("onboarding_flows");

  if (req.method === "GET") {
    const items = await onboardingFlows
      .find({})
      .sort({_id: 1})
      .toArray();
    return res.status(200).json({ success: true, data: {items} });
  }

  if (req.method === "PUT") {
    const flowId = String(req.query.flowId ?? "").trim();
    if (!flowId) {
      return res.status(400).json({ success: false, error: "Missing flow id" });
    }

    const patch: Record<string, unknown> = {
      ...req.body as Record<string, unknown>,
      updatedAt: new Date(),
      updatedBy: admin._id,
    };
    delete patch._id;

    const result = await onboardingFlows.updateOne(
      { id: flowId },
      {$set: patch},
      {upsert: true},
    );

    return res.status(200).json({
      success: true,
      data: {updated: true, upserted: !!result.upsertedCount},
    });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ success: false, error: "Method not allowed" });
}
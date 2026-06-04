import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkOnboarding } from "./onboarding.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  return checkOnboarding(req, res);
}
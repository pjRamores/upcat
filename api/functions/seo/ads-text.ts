/**
 * Public ads.txt // app-ads.txt. Served at /ads.txt and /app-ads.txt
 * (Vercel rewrites) — the same handler powers both since the bodies are identical per AdSense guidance.
 * GET /ads.txt
 * GET /app-ads.txt
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getAdsensePublisherId, renderAdsTxt} from "../../src/seo.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=600",
  );
  return res.status(200).send(renderAdsTxt(getAdsensePublisherId()));
}
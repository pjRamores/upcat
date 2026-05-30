/**
 * Public robots.txt. Served at both/api/seo/robots and/robots.txt.
 * GET /robots.txt
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getSiteUrl, renderRobotsTxt} from "../../src/seo.js";

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
  return res.status(200).send(renderRobotsTxt(getSiteUrl()));
}
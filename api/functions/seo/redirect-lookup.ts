/**
 * Public redirect-lookup endpoint. The 404 page calls this with the
 * unmatched path; if the admin has configured a redirect, the client
 * forwards the user automatically. Lightweight + cacheable.
 * GET /api/seo/redirect?from=/legacy-path
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getDb} from "../../src/db.js";
import {findActiveRedirect, normalizeRedirectSource} from "../../src/seo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const raw = typeof req.query.from === "string" ? req.query.from : "";
  if (!raw) {
    return res
    .status(400)
    .json({success: false, error: "Missing 'from' query parameter."});
  }
  const source = normalizeRedirectSource(raw);

  let redirect = null;
  try {
    const db = await getDb();
    redirect = await findActiveRedirect(db, source);
  } catch {
    redirect = null;
  }

  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
  );
  return res
  .status(200)
  .json({success: true, data: {source, redirect}});
}
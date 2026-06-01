/**
 * Public list of currently-active announcements.
 * GET/api/announcements
 *
 * Anyone can call this (logged-in or not). Returns only announcements
 * marked active and within their start/expire window.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {getDb} from "../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const db = await getDb();
  const now = new Date();
  const items = await db
    .collection("announcements")
    .find({
      isActive: true,
      $and: [
        {$or: [{startsAt: null}, {startsAt: {$lte: now}}]},
        {$or: [{expiresAt: null}, {expiresAt: {$gte: now}}]},
      ]
    })
    .sort({createdAt: -1})
    .toArray();
  return res.status(200).json({
    success: true,
    data: items.map((a) => ({
      _id: a._id.toString(),
      title: a.title,
      message: a.message,
      type: a.type,
      startsAt: a.startsAt ?? null,
      expiresAt: a.expiresAt ?? null,
      createdAt: a.createdAt,
    })),
  });
}
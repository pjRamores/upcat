import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";

/**
 * POST /api/admin/announcements/publish
 *
 * Exports announcements as a static JSON snapshot for
 * client/public/data/announcements.json.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  try {
    const db = await getDb();
    const docs = await db
      .collection("announcements")
      .find({})
      .sort({createdAt: -1})
      .toArray();

    const announcements = docs.map((a) => ({
      _id: a._id.toString(),
      title: a.title,
      message: a.message,
      type: a.type,
      isActive: Boolean(a.isActive),
      startsAt: a.startsAt ?? null,
      expiresAt: a.expiresAt ?? null,
      createdAt: a.createdAt,
    }));
    const now = Date.now();
    const activeCount = announcements.filter((a) => {
      if (!a.isActive) return false;
      const startsOk = !a.startsAt || new Date(a.startsAt).getTime() <= now;
      const expiresOk = !a.expiresAt || new Date(a.expiresAt).getTime() >= now;
      return startsOk && expiresOk;
    }).length;

    const payload = {
      version: 1,
      publishedAt: new Date().toISOString(),
      publishedBy: admin.email,
      meta: {
        totalAnnouncements: announcements.length,
        activeAnnouncements: activeCount,
      },
      announcements,
    };

    return res.status(200).json({
      success: true,
      data: {
        exported: true,
        contentSize: JSON.stringify(payload).length,
        payload,
      },
    });
  } catch (error) {
    console.error("Announcements publish error:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
        ? error.message
        : "Failed to publish announcements",
    });
  }
}
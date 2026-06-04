import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { extractToken } from "../../src/auth.js";
import { getDb } from "../../src/db.js";

type Period = "week" | "month" | "all";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Auth required (per spec: "Public or auth required (configurable)"). We require auth so we can highlight the current user.
  const payload = extractToken(req);
  if (!payload) return res.status(401).json({ success: false, error: "Unauthorized" });

  const periodRaw = (req.query.period as string) || "all";
  const period: Period = periodRaw === "week" || periodRaw === "month" ? periodRaw : "all";

  const now = Date.now();
  const cutoff =
    period === "week"
      ? new Date(now - 7 * 86_400_000)
      : period === "month"
      ? new Date(now - 30 * 86_400_000)
      : null;

  const db = await getDb();

  const match: Record<string, unknown> = { status: "completed" };
  if (cutoff) match.completedAt = {$gte: cutoff};

  const rows = await db
    .collection("exam_sessions")
    .aggregate([
      {$match: match},
      {
        $group: {
          _id: "$userId",
          averageScore: {$avg: "$score.percentage"},
          examsCompleted: {$sum: 1},
        },
      },
      {$sort: {averageScore: -1, examsCompleted: -1}},
      {$limit: 100}, // safety cap before user lookup
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {$unwind: "$user"},
      {$limit: 20},
      {
        $project: {
          _id: 1,
          averageScore: 1,
          examsCompleted: 1,
          firstName: "$user.firstName",
          lastName: "$user.lastName",
        },
      }
    ])
    .toArray();

  const meId = payload.userId;

  const data = rows.map((r, idx) => {
    const lastInitial =
      typeof r.lastName === "string" && r.lastName.length > 0
        ? `${r.lastName[0].toUpperCase()}.`
        : "";
    return {
      rank: idx + 1,
      firstName: r.firstName ?? "Student",
      lastInitial,
      averageScore: Math.round((r.averageScore as number) ?? 0),
      examsCompleted: r.examsCompleted as number,
      isMe: (r._id as ObjectId).toString() === meId,
    };
  });

  // If current user isn't in the top 20, append their position separately.
  let me: typeof data[number] | null = null;
  if (!data.some((r) => r.isMe)) {
    const myRow = await db
      .collection("exam_sessions")
      .aggregate([
        {$match: {...match, userId: new ObjectId(meId)}},
        {
          $group: {
            _id: "$userId",
            averageScore: {$avg: "$score.percentage"},
            examsCompleted: {$sum: 1},
          },
        }
      ])
      .toArray();
  }
}
if (myRow.length > 0) {
    const myAvg = Math.round((myRow[0].averageScore as number) ?? 0);
    // Compute approximate rank by counting users with strictly higher average
    const higher = await db
        .collection("exam_sessions")
        .aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$userId",
                    avg: { $avg: "$score.percentage" },
                },
            },
            { $match: { avg: { $gt: myAvg } } },
            { $count: "n" },
        ])
        .toArray();

    const meUser = await db
        .collection("users")
        .findOne(
            { _id: new ObjectId(meId) },
            { projection: { firstName: 1, lastName: 1 } },
        );

    me = {
        rank: (higher[0]?.n as number) ?? 0 + 1,
        firstName: meUser?.firstName ?? "You",
        lastInitial: typeof meUser?.lastName === "string" && meUser.lastName.length > 0
            ? meUser.lastName[0].toUpperCase()
            : "",
        averageScore: myAvg,
        examsCompleted: myRow[0].examsCompleted as number,
        isMe: true,
    };
}

return res.status(200).json({
    success: true,
    data: { period, leaderboard: data, me },
});
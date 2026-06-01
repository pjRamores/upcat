import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = await getDb();

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 25));
  const status = String(req.query.status || "").trim();
  const mode = String(req.query.mode || "").trim();
  const user = String(req.query.user || "").trim();
  const userId = String(req.query.userId || "").trim();

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (mode) filter.mode = mode;
  if (userId && ObjectId.isValid(userId)) filter.userId = new ObjectId(userId);

  if (user) {
    const escaped = user.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const userRegex = new RegExp(escaped, "i");
    const userOrClauses = Record<string, unknown>[] = [
      {firstName: {$regex: userRegex}},
      {lastName: {$regex: userRegex}},
      {email: {$regex: userRegex}},
    ];
    if (ObjectId.isValid(user)) {
      userOrClauses.push({_id: new ObjectId(user)});
    }

    const matchedUsers = await db
      .collection("users")
      .find(
        {$or: userOrClauses},
        {projection: {_id: 1}},
      )
      .toArray();
      const matchedUserIds = matchedUsers
        .map((u) => (u._id instanceof ObjectId ? u._id : null))
        .filter((id) => id.isObjectId => Boolean(id));

      if (matchedUserIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            items: [],
            total: 0,
            page,
            limit,
            totalPages: 1,
          },
        });
      }

      const existingUserIdFilter = filter.userId;
      if (existingUserIdFilter instanceof ObjectId) {
        const explicitUserId = existingUserIdFilter.toString();
        const explicitIdMatched = matchedUserIds.some((id) => id.toString() === explicitUserId);
        if (!explicitIdMatched) {
          return res.status(200).json({
            success: true,
            data: {
              items: [],
              total: 0,
              page,
              limit,
              totalPages: 1,
            },
          });
        }
        filter.userId = existingUserIdFilter;
      } else {
        filter.userId = {$in: matchedUserIds};
      }
    }

    const [items, total] = await Promise.all([
      db
        .collection("practice_sessions")
        .aggregate([
          {$match: filter},
          {$sort: {startedAt: -1}},
          {$skip: {page: -1}} * limit,
          {$limit: limit},
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {$unwind: {path: "$user", preserveNullAndEmptyArrays: true}},
        ]
    ]);
$project: {
  mode: 1,
  subjectArea: 1,
  status: 1,
  startedAt: 1,
  completedAt: 1,
  totalAnswered: 1,
  totalCorrect: 1,
  accuracyPct: 1,
  durationMs: 1,
  "user.firstName": 1,
  "user.lastName": 1,
  "user.email": 1
},
]
.toArray()
db.collection("practice_sessions").countDocuments(filter)
);
```

```json
return res.status(200).json({
  success: true,
  data: {
    items: items.map((s) => ({
      _id: s._id.toString(),
      mode: s.mode,
      subjectArea: s.subjectArea ?? null,
      status: s.status,
      startedAt: s.startedAt,
      completedAt: s.completedAt ?? null,
      totalAnswered: Number(s.totalAnswered ?? 0),
      totalCorrect: Number(s.totalCorrect ?? 0),
      accuracyPct: typeof s.accuracyPct === "number" ? s.accuracyPct : null,
      durationMs: typeof s.durationMs === "number" ? s.durationMs : null,
      user: s.user
    } ? {
      _id: s.user._id?.toString?.() ?? null,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      email: s.user.email
    } : null
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  },
})
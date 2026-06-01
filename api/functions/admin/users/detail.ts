/**
 * Admin user detail update.
 * GET/api/admin/users/:id
 * PUT/api/admin/users/:id
 *
 * The PUT endpoint can change firstName, lastName, role, isActive,
 * notes — but NOT email or password (those have separate flows).
 * Admins cannot demote themselves or deactivate themselves.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {type Db, ObjectId} from "mongodb";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";

function getSessionSetId(session: {setId?: unknown; config?: {setId?: unknown} | null}): string {
  return String(session.setId ?? session.config?.setId ?? "").trim();
}

async function loadQuestionSetNameMap(db: Db, setIds: string[]): Promise<Map<string, string>> {
  const normalizedSetIds = Array.from(new Set(setIds.map((setId) => setId.trim()).filter(Boolean)));
  if (normalizedSetIds.length === 0) return new Map();

  const objectIds = normalizedSetIds
    .filter((setId) => ObjectId.isValid(setId))
    .map((setId) => new ObjectId(setId));

  const setDocs = await db
    .collection("question_sets")
    .find(
      {
        $or: [
          {setId: {$in: normalizedSetIds}},
          ...(objectIds.length > 0 ? [{_id: {$in: objectIds}}] : []),
          ...],
        {
          projection: {_id: 1, setId: 1, name: 1}},
        }
      )
    .toArray();

    const nameMap = new Map<string, string>();
    for (const setDoc of setDocs as Array<{_id?: ObjectId; setId?: unknown; name?: unknown}}) {
      if (typeof setDoc.name !== "string" || !setDoc.name.trim()) continue;
      const setName = setDoc.name.trim();
      if (setDoc._id) nameMap.set(setDoc._id.toString(), setName);
      if (typeof setDoc.setId === "string" && setDoc.setId.trim()) {
        nameMap.set(setDoc.setId.trim(), setName);
      }
    }

    return nameMap;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const id = String(req.query.id ?? "");
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({success: false, error: "Invalid user id"});
  }
  const oid = new ObjectId(id);
  const db = await getDb();
  const users = db.collection("users");

  if (req.method === "GET") {
    const doc = await users.findOne(
      {_id: oid},
      {
        projection: {
          passwordHash: 0,
          verificationToken: 0,
          verificationTokenExpiry: 0,
          resetToken: 0,
          resetTokenExpiry: 0,
        },
      },
    );
    if (!doc) return res.status(404).json({success: false, error: "User not found"});

    const [examHistory, statsAgg, contactMessages, recentLogins] = await Promise.all([
      db
        .collection("exam_sessions")
        .find({userId: oid})
        .sort({startedAt: -1})
        .limit(10)
        .project({
          status: 1,
          setId: 1,
          startedAt: 1,
          completedAt: 1,
          score: 1,
          "config.setId": 1,
          "config.totalQuestions": 1
        })
        .toArray(),
        db
        .collection("exam_sessions")
        .aggregate([
          {$match: {userId: oid, status: "completed"}},
        ]
      )
    );
    $group: {
      _id: null,
      total: {$sum: 1},
      avg: {$avg: "$score.percentage"},
    }
  }
}
best: {$max: "$score.percentage"},
totalQuestions: {$sum: "$config.totalQuestions"},
},
],
])
.toArray(),
db
.collection("contact_messages")
.find({$or: [{userId: oid}, {email: doc.email}]})
.sort({createdAt: -1})
.limit(20)
.toArray(),
db
.collection("activity_log")
.find({actorId: oid, action: "user.login"})
.sort({createdAt: -1})
.limit(5)
.toArray(),
]);

const stats = statsAgg[0].as({total?: number; avg?: number; best?: number}) | undefined;
const questionSetNameMap = await loadQuestionSetNameMap(
db,
examHistory.map((session) => getSessionSetId(session as {
setId?: unknown;
config?: {setId?: unknown}} | null
}));
);

return res.status(200).json({
success: true,
data: {
...doc,
_id: doc._id.toString(),
deactivatedBy: doc.deactivatedBy?.toString?.() ?? doc.deactivatedBy ?? null,
examHistory: examHistory.map((e) => {
const rawSetId = getSessionSetId(e as {setId?: unknown; config?: {setId?: unknown}} | null});
return {
_id: e._id.toString(),
status: e.status,
startedAt: e.startedAt,
completedAt: e.completedAt,
totalQuestions: e.config?.totalQuestions ?? 0,
setName: rawSetId?.questionSetNameMap.get(rawSetId) ?? null::null,
percentage: e.score?.percentage ?? null,
});
},
stats: {
totalExams: stats?.total ?? 0,
averageScore: stats?.avg ?? Math.round(stats.avg * 10) / 10 :: 0,
bestScore: stats?.best ?? 0,
},
contactMessages: contactMessages.map((m) => ({
_id: m._id.toString(),
subject: m.subject,
message: String(m.message ?? "").slice(0, 200),
status: m.status,
createdAt: m.createdAt,
})),
recentLogins: recentLogins.map((l) => ({
createdAt: l.createdAt,
metadata: l.metadata ?? {},
})),
},
});
}

if (req.method === "PUT") {
const body = req.body ?? {};
const set = Record<string, unknown> = {updatedAt: new Date()};

for (const k of ["firstName", "lastName", "notes"] as const) {
if (typeof body[k] === "string") set[k] = String(body[k]).trim();
}
if (body.role === "admin" || body.role === "reviewee") {
// Admins cannot demote themselves.
if (oid.equals(admin._id) && body.role !== "admin") {
return res.status(400).json({success: false, error: "You cannot change your own role."});
}
set.role = body.role;
}
if (typeof body.isActive === "boolean") {
if (oid.equals(admin._id) && body.isActive === false) {
return res.status(400).json({success: false, error: "You cannot deactivate yourself."});
}
set.isActive = body.isActive;
}

const result = await users.updateOne({_id: oid}, {$set: set});
if (result.matchedCount === 0) {
return res.status(404).json({success: false, error: "User not found"});
}
await logActivity(db, {
actorId: admin._id,
actorRole: "admin",
action: "user.updated",
targetType: "user",
targetId: oid,
metadata: {fields: Object.keys(set).filter((k) => k !== "updatedAt")},
});
return res.status(200).json({success: true, data: {updated: true}});
}
```

res.setHeader("Allow", "GET,PUT");
return res.status(405).json({success: false, error: "Method not allowed"});
}
script
/* eslint-disable no-console */
import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";
import {MongoClient, ObjectId} from "mongodb";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function normalizeRawSetId(raw) {
  const value = String(raw??"").trim();
  return value || "set-default";
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

async function run() {
  loadEnvFile();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set (expected in api/.env)");
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(process.env.MONGODB_DB??process.env.MONGODB_DB_NAME??undefined);
    console.log(`Connected to database: ${db.databaseName}`);

    const questionSets = await db
      .collection("question_sets")
      .find({}, {projection: {_id: 1, setId: 1}})
      .toArray();

    const canonicalSetIds = new Map();
    for (const doc of questionSets) {
      const canonicalSetId = normalizeRawSetId(doc.setId??doc._id);
      canonicalSetIds.set(normalizeRawSetId(doc._id), canonicalSetId);
      canonicalSetIds.set(normalizeRawSetId(doc.setId), canonicalSetId);
    }

    const normalizeSetId = (raw) => canonicalSetIds.get(normalizeRawSetId(raw))??normalizeRawSetId(raw);

    const sessions = await db
      .collection("exam_sessions")
      .find(
        {},
        {
          projection: {
            _id: 1,
            userId: 1,
            setId: 1,
            "config.setId": 1,
            startedAt: 1,
            createdAt: 1,
          },
        },
      )
      .toArray();

    const desiredByKey = new Map();
    for (const session of sessions) {
      if (!(session.userId instanceof ObjectId)) continue;
      const normalizedSetId = normalizeSetId(session.setId??session.config?.setId);
      const key = `${session.userId.toString()}:${normalizedSetId}`;
      const existing = desiredByKey.get(key)??{
        userId: session.userId,
        setId: normalizedSetId,
        assignedCount: 0,
        lastSessionId: null,
        lastAssignedAt: null,
        createdAt: null,
      };

      existing.assignedCount += 1;

      const sessionTime = Math.max(toTime(session.startedAt), toTime(session.createdAt));
      const latestKnownTime = toTime(existing.lastAssignedAt);
script
if (!existing.lastAssignedAt || sessionTime >= latestKnownTime) {
  existing.lastAssignedAt = session.startedAt ?? session.createdAt ?? new Date();
  existing.lastSessionId = session._id;
}

const earliestKnownTime = toTime(existing.createdAt);
if (!existing.createdAt || (sessionTime > 0 && sessionTime < earliestKnownTime)) {
  existing.createdAt = session.startedAt ?? session.createdAt ?? new Date();
}

desiredByKey.set(key, existing);
}

const existingAssignments = await db.collection("exam_set_assignments").find({}).toArray();
const existingByKey = new Map();
for (const doc of existingAssignments) {
  if (!(doc.userId instanceof ObjectId)) continue;
  const normalizedSetId = normalizeSetId(doc.setId);
  const key = `${doc.userId.toString()}:${normalizedSetId}`;
  const bucket = existingByKey.get(key) ?? [];
  bucket.push(doc);
  existingByKey.set(key, bucket);
}

const ops = [];
let updatedCount = 0;
let insertedCount = 0;
let deletedCount = 0;

for (const [key, desired] of desiredByKey) {
  const matches = existingByKey.get(key) ?? [];
  const canonical = matches.find((doc) => typeof doc.setId === "string" && doc.setId.trim() === desired.setId) ?? matches[0] ?? null;

  const setPayload = {
    userId: desired.userId,
    setId: desired.setId,
    assignedCount: desired.assignCount,
    lastAssignedAt: desired.lastAssignedAt ?? new Date(),
    updatedAt: new Date(),
    createdAt: desired.createdAt ?? desired.lastAssignedAt ?? new Date(),
    ...(desired.lastSessionId ? {lastSessionId: desired.lastSessionId} : {}}),
  };

  if (canonical?._id) {
    ops.push({
      updateOne: {
        filter: {_id: canonical._id},
        update: {
          $set: setPayload,
          ...(desired.lastSessionId ? {} : {$unset: {lastSessionId: ""}}),
        },
      },
    });
    updatedCount += 1;
  } else {
    ops.push({
      insertOne: {
        document: setPayload,
        },
      });
    insertedCount += 1;
  }

  for (const duplicate of matches) {
    if (!canonical?._id || !duplicate._id || duplicate._id.equals(canonical._id)) continue;
    ops.push({
      deleteOne: {
        filter: {_id: duplicate._id},
        },
      });
    deletedCount += 1;
  }

  existingByKey.delete(key);
}

for (const leftovers of existingByKey.values()) {
  for (const doc of leftovers) {
    if (!doc._id) continue;
    ops.push({
      deleteOne: {
        filter: {_id: doc._id},
        },
      });
    deletedCount += 1;
  }
}

if (ops.length > 0) {
  console.log(`→ Applying ${ops.length} write operation(s)...`);
  await db.collection("exam_set_assignments").bulkWrite(ops, {ordered: true});
} else {
  console.log("→ No changes needed; exam_set_assignments is already normalized.");
}

console.log(`√ Normalized exam_set_assignments: updated=${updatedCount}, inserted=${insertedCount}, deleted=${deletedCount}`);
console.log(`√ Session-derived assignment rows: ${desiredByKey.size}`);
} finally {
  await client.close();
}
```

run().catch((error) => {
  console.error("× Normalization failed:", error);
script
process.exit(1);
});
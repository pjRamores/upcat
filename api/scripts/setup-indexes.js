script
import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";
import {MongoClient} from "mongodb";

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

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function setupIndexes() {
  loadEnvFile();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set (expected in api/.env)");
  }

  const client = new MongoClient(uri);
  console.log("→Connecting to MongoDB...");
  await client.connect();

  try {
    const db = client.db(process.env.MONGODB_DB ?? process.env.MONGODB_DB_NAME ?? undefined);
    console.log(`√ Connected to database: ${db.databaseName}\n`);

    // — users —
    console.log("→Creating indexes on 'users'...");
    const users = db.collection("users");
    await users.createIndex({email: 1}, {unique: true, name: "email_unique"});
    await users.createIndex(
      {verificationTokenExpiry: 1},
    );
    await users.createIndex({resetToken: 1}, {sparse: true, name: "reset_token_sparse"});
    await users.createIndex(
      {verificationToken: 1},
      {sparse: true, name: "verification_token_sparse"},
    );
    console.log("√ users indexes created");

    // — questions —
    console.log("→Creating indexes on 'questions'...");
    const questions = db.collection("questions");
    await questions.createIndex(
      {subjectArea: 1, difficulty: 1},
      {name: "subject_difficulty"},
    );
    await questions.createIndex(
      {setId: 1, isDeleted: 1, publicationStatus: 1, subjectArea: 1, difficulty: 1},
      {name: "set_selection"},
    );
    await questions.createIndex({subtopic: 1}, {name: "subtopic"});
    await questions.createIndex({passageId: 1}, {sparse: true, name: "passage_ref"});
    await questions.createIndex({tags: 1}, {name: "tags"});
    console.log("√ questions indexes created");

    // — passages —
    console.log("→Creating indexes on 'passages'...");
    const passages = db.collection("passages");
    await passages.createIndex({subjectArea: 1}, {name: "subjectArea"});
    console.log("√ passages indexes created");

    // — exam_sessions —
    console.log("→Creating indexes on 'exam_sessions'...");
    const sessions = db.collection("exam_sessions");
    await sessions.createIndex({userId: 1, status: 1}, {name: "user_status"});
    await sessions.createIndex({userId: 1, createdAt: -1}, {name: "user_recent"});
    await sessions.createIndex({userId: 1, setId: 1, createdAt: -1}, {name: "user_set_recent"});
    await sessions.createIndex({status: 1, updatedAt: -1}, {name: "status_updated"});
    await sessions.createIndex({"offlineData.syncedAt": 1}, {sparse: true, name: "offline_synced_at"});
    console.log("√ exam_sessions indexes created");

    // — question_sets / exam_set_assignments —
    console.log("→Creating indexes on 'question_sets', 'exam_set_assignments', and 'exam_set_assignment_events'...");
    const questionSets = db.collection("question_sets");
    await questionSets.createIndex({setId: 1}, {unique: true, name: "set_id_unique"});
    await questionSets.createIndex(
script
{isActive:1, assignmentCount:1, updatedAt:1},
{name:"active_assignment_distribution"},
);

const examSetAssignments = db.collection("exam_set_assignments");
await examSetAssignments.createIndex(
  {userId:1, setId:1},
  {unique:true, name:"user_set_unique"},
);

await examSetAssignments.createIndex(
  {userId:1, lastAssignedAt:-1},
  {name:"user_set_recent"},
);

const assignmentEvents = db.collection("exam_set_assignment_events");
await assignmentEvents.createIndex(
  {sessionId:1},
  {unique:true, name:"session_assignment_unique"},
);

await assignmentEvents.createIndex(
  {userId:1, assignedAt:-1},
  {name:"user_assignment_recent"},
);

await assignmentEvents.createIndex(
  {userId:1, setId:1, assignedAt:-1},
  {name:"user_set_assignment_history"},
);

console.log("√ question set indexes created");

// — sync_queue —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
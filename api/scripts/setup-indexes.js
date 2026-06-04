script
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";

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
            (value.startsWith('"' && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
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
    console.log(`Connecting to MongoDB...`);
    await client.connect();

    try {
        const db = client.db(process.env.MONGODB_DB ?? process.env.MONGODB_DB_NAME ?? undefined);
        console.log(`Connected to database: ${db.databaseName}\n`);

        // users
        console.log("Creating indexes on 'users'...");
        const users = db.collection("users");
        await users.createIndex({ email: 1 }, { unique: true, name: "email_unique" });
        await users.createIndex(
            {
                verificationTokenExpire: 1,
                expireAfterSeconds: 0,
                partialFilterExpression: { isVerified: false },
                name: "verification_ttl",
            }
        );
        await users.createIndex({ resetToken: 1 }, { sparse: true, name: "reset_token_sparse" });
        await users.createIndex(
            {
                verificationToken: 1,
                sparse: true,
                name: "verification_token_sparse",
            }
        );
        console.log("users indexes created");

        // questions
        console.log("Creating indexes on 'questions'...");
        const questions = db.collection("questions");
        await questions.createIndex(
            { subjectArea: 1, difficulty: 1 },
            { name: "subject_difficulty" }
        );
        await questions.createIndex(
            { setId: 1, isDeleted: 1, publicationStatus: 1, subjectArea: 1, difficulty: 1 },
            { name: "set_selection" }
        );
        await questions.createIndex({ subtopic: 1 }, { name: "subtopic" });
        await questions.createIndex({ passageId: 1 }, { sparse: true, name: "passage_ref" });
        await questions.createIndex({ tags: 1 }, { name: "tags" });
        console.log("questions indexes created");

        // passages
        console.log("Creating indexes on 'passages'...");
        const passages = db.collection("passages");
        await passages.createIndex({ subjectArea: 1 }, { name: "subjectArea" });
        console.log("passages indexes created");

        // exam_sessions
        console.log("Creating indexes on 'exam_sessions'...");
        const sessions = db.collection("exam_sessions");
        await sessions.createIndex({ userId: 1, status: 1 }, { name: "user_status" });
        await sessions.createIndex({ userId: 1, createdAt: -1 }, { name: "user_recent" });
        await sessions.createIndex({ userId: 1, setId: 1, createdAt: -1 }, { name: "user_set_recent" });
        await sessions.createIndex({ status: 1, updatedAt: -1 }, { name: "status_updated" });
        await sessions.createIndex({ "offlineData.syncedAt": 1 }, { sparse: true, name: "offline_synced_at" });
        console.log("exam_sessions indexes created");

        // question_sets / exam_set_assignments
        console.log("Creating indexes on 'question_sets', 'exam_set_assignments', and 'exam_set_assignment_events'...");
        const questionSets = db.collection("question_sets");
        await questionSets.createIndex({ setId: 1 }, { unique: true, name: "set_id_unique" });
script
}, {name: "active_assignment_distribution"},
    );
    const examSetAssignments = db.collection("exam_set_assignments");
    await examSetAssignments.createIndex(
        {userId: -1, setId: -1},
        {unique: true, name: "user_set_unique"},
    );
    await examSetAssignments.createIndex(
        {userId: -1, lastAssignedAt: -1},
        {name: "user_set_recent"},
    );

    const assignmentEvents = db.collection("exam_set_assignment_events");
    await assignmentEvents.createIndex(
        {sessionId: 1},
        {unique: true, name: "session_assignment_unique"},
    );
    await assignmentEvents.createIndex(
        {userId: -1, assignedAt: -1},
        {name: "user_assignment_recent"},
    );
    await assignmentEvents.createIndex(
        {userId: -1, setId: 1, assignedAt: -1},
        {name: "user_set_assignment_history"},
    );
    console.log("√ question set indexes created");

    // sync_queue
    console.log("→ Creating indexes on 'sync_queue'...");
    const syncQueue = db.collection("sync_queue");
    await syncQueue.createIndex({userId: 1, status: 1, receivedAt: -1}, {name: "user_status_received"});
    await syncQueue.createIndex({sessionId: 1, sequenceNumber: 1}, {sparse: true, name: "session_sequence"});
    await syncQueue.createIndex({expiresAt: 1}, {expireAfterSeconds: 0, name: "sync_queue_ttl"});
    console.log("√ sync_queue indexes created");

    // session_recovery
    console.log("→ Creating indexes on 'session_recovery'...");
    const recovery = db.collection("session_recovery");
    await recovery.createIndex({userId: -1, sessionId: 1}, {unique: true, name: "user_session_unique"});
    await recovery.createIndex({status: 1, updatedAt: -1}, {name: "status_updated"});
    await recovery.createIndex({expiresAt: 1}, {expireAfterSeconds: 0, name: "session_recovery_ttl"});
    console.log("√ session_recovery indexes created");

    // maintenance_windows
    console.log("→ Creating indexes on 'maintenance_windows'...");
    const windows = db.collection("maintenance_windows");
    await windows.createIndex({status: 1, scheduledStart: -1}, {name: "status_scheduled_start"});
    await windows.createIndex({status: 1, scheduledEnd: 1}, {name: "status_scheduled_end"});
    console.log("√ maintenance_windows indexes created");

    // connection_events
    console.log("→ Creating indexes on 'connection_events'...");
    const connectionEvents = db.collection("connection_events");
    await connectionEvents.createIndex({userId: -1, timestamp: -1}, {name: "user_timestamp"});
    await connectionEvents.createIndex({type: 1, timestamp: -1}, {name: "type_timestamp"});
    await connectionEvents.createIndex({expiresAt: 1}, {expireAfterSeconds: 0, name: "connection_events_ttl"});
    console.log("√ connection_events indexes created");

    console.log("\n☑ All indexes created successfully.");
} finally {
    await client.close();
}
}

setupIndexes().catch((err) => {
    console.error("Failed to create indexes:", err);
    process.exit(1);
});